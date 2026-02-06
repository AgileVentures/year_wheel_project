-- Migration 020: Affiliate System
-- Create organizations table for grouping users and affiliate tracking

-- Organizations table (replaces/extends team concept for affiliates)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_affiliate BOOLEAN DEFAULT FALSE,
  affiliate_active BOOLEAN DEFAULT TRUE, -- Can be deactivated by admin
  commission_rate_free DECIMAL(10, 2) DEFAULT 2.00, -- €2 per free signup
  commission_rate_premium DECIMAL(5, 4) DEFAULT 0.50, -- 50% of first payment
  contact_email TEXT,
  payment_email TEXT, -- For sending commission payments
  notes TEXT, -- Admin notes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization members (link users to organizations)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Affiliate links (unique trackable links per organization)
CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE, -- URL-safe code like "partner-acme" or "ref123"
  name TEXT, -- Friendly name like "Summer Campaign 2025"
  target_url TEXT DEFAULT '/', -- Where link redirects to (landing page, pricing, etc)
  is_active BOOLEAN DEFAULT TRUE,
  clicks INTEGER DEFAULT 0, -- Track total clicks
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Affiliate conversions (track user journey from click → signup → upgrade)
CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  affiliate_link_id UUID REFERENCES affiliate_links(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Conversion stages
  clicked_at TIMESTAMPTZ, -- Initial click timestamp
  signed_up_at TIMESTAMPTZ, -- Free account creation
  upgraded_at TIMESTAMPTZ, -- Premium upgrade timestamp
  
  -- Conversion details
  conversion_type TEXT CHECK (conversion_type IN ('free_signup', 'premium_upgrade')),
  subscription_plan TEXT, -- 'monthly' or 'yearly' for premium upgrades
  subscription_amount DECIMAL(10, 2), -- Amount charged for upgrade
  
  -- Tracking metadata
  landing_page TEXT, -- Which page did they land on
  referrer TEXT, -- HTTP referrer if available
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Affiliate commissions (calculated payouts)
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  conversion_id UUID REFERENCES affiliate_conversions(id) ON DELETE CASCADE,
  
  -- Commission details
  commission_type TEXT CHECK (commission_type IN ('free_signup', 'premium_upgrade')),
  commission_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  
  -- Payment status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  payment_method TEXT, -- 'bank_transfer', 'paypal', etc.
  payment_reference TEXT, -- Transaction ID or reference
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_organizations_affiliate ON organizations(is_affiliate) WHERE is_affiliate = TRUE;
CREATE INDEX idx_affiliate_links_code ON affiliate_links(code);
CREATE INDEX idx_affiliate_links_org ON affiliate_links(organization_id);
CREATE INDEX idx_conversions_org ON affiliate_conversions(organization_id);
CREATE INDEX idx_conversions_user ON affiliate_conversions(user_id);
CREATE INDEX idx_conversions_link ON affiliate_conversions(affiliate_link_id);
CREATE INDEX idx_conversions_type ON affiliate_conversions(conversion_type);
CREATE INDEX idx_commissions_org ON affiliate_commissions(organization_id);
CREATE INDEX idx_commissions_status ON affiliate_commissions(status);

-- RLS Policies

-- Organizations: Public read for basic info, owners can update
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view organizations" ON organizations
  FOR SELECT USING (TRUE);

CREATE POLICY "Owners can update their organization" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Admins can do anything with organizations" ON organizations
  FOR ALL USING (is_admin(auth.uid()));

-- Organization members: Members can view, owners can manage
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their organizations" ON organization_members
  FOR SELECT USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Owners can manage members" ON organization_members
  FOR ALL USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    ) OR is_admin(auth.uid())
  );

-- Affiliate links: Org members can view, admins can manage
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their affiliate links" ON affiliate_links
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ) OR is_admin(auth.uid())
  );

CREATE POLICY "Org owners/admins can manage affiliate links" ON affiliate_links
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) OR is_admin(auth.uid())
  );

-- Affiliate conversions: Org members can view their conversions, admins see all
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their conversions" ON affiliate_conversions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ) OR is_admin(auth.uid())
  );

CREATE POLICY "System can insert conversions" ON affiliate_conversions
  FOR INSERT WITH CHECK (TRUE); -- Allow server-side functions to insert

-- Affiliate commissions: Org members can view, only admins can modify
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their commissions" ON affiliate_commissions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ) OR is_admin(auth.uid())
  );

CREATE POLICY "Only admins can manage commissions" ON affiliate_commissions
  FOR ALL USING (is_admin(auth.uid()));

-- Helper function: Track affiliate click and create initial conversion
CREATE OR REPLACE FUNCTION track_affiliate_click(
  p_affiliate_code TEXT,
  p_landing_page TEXT DEFAULT '/',
  p_referrer TEXT DEFAULT NULL,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_link affiliate_links;
  v_conversion_id UUID;
BEGIN
  -- Find the affiliate link
  SELECT * INTO v_link FROM affiliate_links 
  WHERE code = p_affiliate_code AND is_active = TRUE;
  
  IF v_link IS NULL THEN
    RETURN json_build_object('success', FALSE, 'error', 'Invalid affiliate code');
  END IF;
  
  -- Increment click counter
  UPDATE affiliate_links SET clicks = clicks + 1 WHERE id = v_link.id;
  
  -- Create conversion record (initial click stage)
  INSERT INTO affiliate_conversions (
    organization_id,
    affiliate_link_id,
    clicked_at,
    landing_page,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    ip_address,
    user_agent
  ) VALUES (
    v_link.organization_id,
    v_link.id,
    NOW(),
    p_landing_page,
    p_referrer,
    p_utm_source,
    p_utm_medium,
    p_utm_campaign,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_conversion_id;
  
  RETURN json_build_object(
    'success', TRUE, 
    'conversion_id', v_conversion_id,
    'organization_id', v_link.organization_id,
    'link_id', v_link.id,
    'target_url', v_link.target_url
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Record free signup (extends conversion)
CREATE OR REPLACE FUNCTION record_affiliate_signup(
  p_user_id UUID,
  p_conversion_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_conversion affiliate_conversions;
BEGIN
  -- Find the conversion
  SELECT * INTO v_conversion FROM affiliate_conversions WHERE id = p_conversion_id;
  
  IF v_conversion IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update conversion with signup info
  UPDATE affiliate_conversions SET
    user_id = p_user_id,
    signed_up_at = NOW(),
    conversion_type = 'free_signup',
    updated_at = NOW()
  WHERE id = p_conversion_id;
  
  -- Create commission for free signup (€2)
  INSERT INTO affiliate_commissions (
    organization_id,
    conversion_id,
    commission_type,
    commission_amount,
    status
  ) VALUES (
    v_conversion.organization_id,
    p_conversion_id,
    'free_signup',
    2.00, -- €2 for free signup
    'pending'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Record premium upgrade (adds commission)
CREATE OR REPLACE FUNCTION record_affiliate_upgrade(
  p_user_id UUID,
  p_conversion_id UUID,
  p_subscription_plan TEXT,
  p_subscription_amount DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  v_conversion affiliate_conversions;
  v_organization organizations;
  v_commission_amount DECIMAL;
BEGIN
  -- Find the conversion
  SELECT * INTO v_conversion FROM affiliate_conversions WHERE id = p_conversion_id AND user_id = p_user_id;
  
  IF v_conversion IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get organization commission rate
  SELECT * INTO v_organization FROM organizations WHERE id = v_conversion.organization_id;
  
  -- Calculate commission (50% of first payment)
  v_commission_amount := p_subscription_amount * v_organization.commission_rate_premium;
  
  -- Update conversion with upgrade info
  UPDATE affiliate_conversions SET
    upgraded_at = NOW(),
    conversion_type = 'premium_upgrade',
    subscription_plan = p_subscription_plan,
    subscription_amount = p_subscription_amount,
    updated_at = NOW()
  WHERE id = p_conversion_id;
  
  -- Create commission for premium upgrade
  INSERT INTO affiliate_commissions (
    organization_id,
    conversion_id,
    commission_type,
    commission_amount,
    status
  ) VALUES (
    v_conversion.organization_id,
    p_conversion_id,
    'premium_upgrade',
    v_commission_amount,
    'pending'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_links_updated_at BEFORE UPDATE ON affiliate_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_conversions_updated_at BEFORE UPDATE ON affiliate_conversions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_commissions_updated_at BEFORE UPDATE ON affiliate_commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
