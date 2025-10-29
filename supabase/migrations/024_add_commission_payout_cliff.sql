-- Migration 024: Add commission payout cliff (€25 minimum)
-- Commissions below €25 roll over to next period

-- Add payout tracking fields to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS minimum_payout_amount DECIMAL(10, 2) DEFAULT 25.00,
ADD COLUMN IF NOT EXISTS pending_balance DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS last_payout_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_paid_out DECIMAL(10, 2) DEFAULT 0.00;

COMMENT ON COLUMN organizations.minimum_payout_amount IS 'Minimum amount (cliff) required before payout is processed. Default €25. Amounts below this roll over to next period.';
COMMENT ON COLUMN organizations.pending_balance IS 'Current unpaid commission balance that has not reached minimum payout threshold';
COMMENT ON COLUMN organizations.last_payout_at IS 'Timestamp of most recent payout';
COMMENT ON COLUMN organizations.total_paid_out IS 'Total amount paid out to this affiliate over all time';

-- Add payout batch tracking
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Payout details
  payout_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Payment info
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payment_method TEXT, -- 'bank_transfer', 'paypal', etc.
  payment_reference TEXT, -- Transaction ID or reference
  payment_details JSONB, -- Bank account info used, etc.
  
  -- Processing metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_reason TEXT,
  admin_notes TEXT,
  
  -- Track which commissions are included
  commission_ids UUID[] -- Array of commission IDs included in this payout
);

CREATE INDEX idx_affiliate_payouts_org ON affiliate_payouts(organization_id);
CREATE INDEX idx_affiliate_payouts_status ON affiliate_payouts(status);
CREATE INDEX idx_affiliate_payouts_period ON affiliate_payouts(period_start, period_end);

-- Add payout_id reference to commissions
ALTER TABLE affiliate_commissions
ADD COLUMN IF NOT EXISTS payout_id UUID REFERENCES affiliate_payouts(id) ON DELETE SET NULL;

CREATE INDEX idx_affiliate_commissions_payout ON affiliate_commissions(payout_id);

-- RLS for payouts
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their payouts" ON affiliate_payouts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    ) OR is_admin(auth.uid())
  );

CREATE POLICY "Only admins can manage payouts" ON affiliate_payouts
  FOR ALL USING (is_admin(auth.uid()));

-- Helper function: Calculate pending commission balance for organization
CREATE OR REPLACE FUNCTION calculate_pending_commission_balance(
  p_organization_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  v_balance DECIMAL;
BEGIN
  -- Sum all pending (unpaid) commissions
  SELECT COALESCE(SUM(commission_amount), 0) 
  INTO v_balance
  FROM affiliate_commissions
  WHERE organization_id = p_organization_id 
    AND status = 'pending'
    AND payout_id IS NULL;
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get eligible organizations for payout (>= €25)
CREATE OR REPLACE FUNCTION get_organizations_eligible_for_payout(
  p_minimum_amount DECIMAL DEFAULT 25.00
) RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  pending_balance DECIMAL,
  pending_commission_count INTEGER,
  payment_email TEXT,
  payment_method TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    COALESCE(SUM(ac.commission_amount), 0) as balance,
    COUNT(ac.id)::INTEGER as commission_count,
    o.payment_email,
    o.payment_method
  FROM organizations o
  LEFT JOIN affiliate_commissions ac ON ac.organization_id = o.id 
    AND ac.status = 'pending' 
    AND ac.payout_id IS NULL
  WHERE o.is_affiliate = TRUE 
    AND o.affiliate_active = TRUE
  GROUP BY o.id, o.name, o.payment_email, o.payment_method
  HAVING COALESCE(SUM(ac.commission_amount), 0) >= p_minimum_amount
  ORDER BY balance DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Create payout batch for organization
CREATE OR REPLACE FUNCTION create_affiliate_payout(
  p_organization_id UUID,
  p_period_start TIMESTAMPTZ DEFAULT NULL,
  p_period_end TIMESTAMPTZ DEFAULT NOW(),
  p_admin_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_organization organizations;
  v_payout_amount DECIMAL;
  v_commission_ids UUID[];
  v_payout_id UUID;
  v_minimum_amount DECIMAL;
BEGIN
  -- Get organization and check if eligible
  SELECT * INTO v_organization FROM organizations 
  WHERE id = p_organization_id AND is_affiliate = TRUE;
  
  IF v_organization IS NULL THEN
    RETURN json_build_object('success', FALSE, 'error', 'Organization not found or not an affiliate');
  END IF;
  
  v_minimum_amount := COALESCE(v_organization.minimum_payout_amount, 25.00);
  
  -- Calculate total pending commissions
  SELECT 
    COALESCE(SUM(commission_amount), 0),
    ARRAY_AGG(id)
  INTO v_payout_amount, v_commission_ids
  FROM affiliate_commissions
  WHERE organization_id = p_organization_id 
    AND status = 'pending'
    AND payout_id IS NULL
    AND (p_period_start IS NULL OR created_at >= p_period_start)
    AND created_at <= p_period_end;
  
  -- Check if amount meets minimum threshold
  IF v_payout_amount < v_minimum_amount THEN
    RETURN json_build_object(
      'success', FALSE, 
      'error', 'Payout amount below minimum threshold',
      'amount', v_payout_amount,
      'minimum', v_minimum_amount,
      'message', format('Commission balance €%.2f is below minimum payout amount €%.2f. Balance will roll over to next period.', 
                       v_payout_amount, v_minimum_amount)
    );
  END IF;
  
  -- Create payout record
  INSERT INTO affiliate_payouts (
    organization_id,
    payout_amount,
    period_start,
    period_end,
    status,
    payment_method,
    admin_notes,
    commission_ids
  ) VALUES (
    p_organization_id,
    v_payout_amount,
    COALESCE(p_period_start, v_organization.last_payout_at, v_organization.created_at),
    p_period_end,
    'pending',
    v_organization.payment_method,
    p_admin_notes,
    v_commission_ids
  ) RETURNING id INTO v_payout_id;
  
  -- Link commissions to this payout
  UPDATE affiliate_commissions 
  SET payout_id = v_payout_id
  WHERE id = ANY(v_commission_ids);
  
  -- Update organization pending balance
  UPDATE organizations
  SET pending_balance = calculate_pending_commission_balance(p_organization_id)
  WHERE id = p_organization_id;
  
  RETURN json_build_object(
    'success', TRUE,
    'payout_id', v_payout_id,
    'amount', v_payout_amount,
    'commission_count', ARRAY_LENGTH(v_commission_ids, 1),
    'payment_email', v_organization.payment_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Mark payout as completed
CREATE OR REPLACE FUNCTION complete_affiliate_payout(
  p_payout_id UUID,
  p_payment_reference TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_payout affiliate_payouts;
BEGIN
  -- Get payout
  SELECT * INTO v_payout FROM affiliate_payouts WHERE id = p_payout_id;
  
  IF v_payout IS NULL THEN
    RAISE EXCEPTION 'Payout not found';
  END IF;
  
  -- Update payout status
  UPDATE affiliate_payouts
  SET 
    status = 'completed',
    payment_reference = COALESCE(p_payment_reference, payment_reference),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    completed_at = NOW()
  WHERE id = p_payout_id;
  
  -- Mark all commissions as paid
  UPDATE affiliate_commissions
  SET 
    status = 'paid',
    paid_at = NOW()
  WHERE payout_id = p_payout_id;
  
  -- Update organization totals
  UPDATE organizations
  SET 
    last_payout_at = NOW(),
    total_paid_out = total_paid_out + v_payout.payout_amount,
    pending_balance = calculate_pending_commission_balance(v_payout.organization_id)
  WHERE id = v_payout.organization_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to keep pending_balance updated when commissions change
CREATE OR REPLACE FUNCTION update_organization_pending_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the organization's pending balance
  UPDATE organizations
  SET pending_balance = calculate_pending_commission_balance(
    COALESCE(NEW.organization_id, OLD.organization_id)
  )
  WHERE id = COALESCE(NEW.organization_id, OLD.organization_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pending_balance_on_commission_change
  AFTER INSERT OR UPDATE OR DELETE ON affiliate_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_pending_balance();
