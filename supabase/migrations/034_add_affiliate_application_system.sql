-- Migration 023: Add affiliate application system

-- Add application status to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS affiliate_status TEXT DEFAULT 'pending' CHECK (affiliate_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS application_website TEXT,
ADD COLUMN IF NOT EXISTS application_promotion_plan TEXT,
ADD COLUMN IF NOT EXISTS application_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS application_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS application_reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS application_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Update existing affiliate organizations to 'approved' status
UPDATE organizations 
SET affiliate_status = 'approved',
    application_submitted_at = created_at,
    application_reviewed_at = created_at,
    terms_accepted = TRUE,
    terms_accepted_at = created_at
WHERE is_affiliate = TRUE;

-- Add index for filtering by status
CREATE INDEX IF NOT EXISTS idx_organizations_affiliate_status ON organizations(affiliate_status) WHERE is_affiliate = TRUE;

-- Comments
COMMENT ON COLUMN organizations.affiliate_status IS 'Application status: pending (under review), approved (active affiliate), rejected (denied)';
COMMENT ON COLUMN organizations.application_website IS 'Primary website URL provided in application';
COMMENT ON COLUMN organizations.application_promotion_plan IS 'How the affiliate plans to promote YearWheel';
COMMENT ON COLUMN organizations.application_rejection_reason IS 'Admin note explaining why application was rejected';
COMMENT ON COLUMN organizations.terms_accepted IS 'Whether user accepted affiliate terms and conditions';

-- Helper function to approve affiliate application
CREATE OR REPLACE FUNCTION approve_affiliate_application(
  p_org_id UUID,
  p_admin_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE organizations SET
    affiliate_status = 'approved',
    affiliate_active = TRUE,
    application_reviewed_at = NOW(),
    application_reviewed_by = p_admin_id
  WHERE id = p_org_id AND is_affiliate = TRUE;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to reject affiliate application
CREATE OR REPLACE FUNCTION reject_affiliate_application(
  p_org_id UUID,
  p_admin_id UUID,
  p_reason TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE organizations SET
    affiliate_status = 'rejected',
    affiliate_active = FALSE,
    application_reviewed_at = NOW(),
    application_reviewed_by = p_admin_id,
    application_rejection_reason = p_reason
  WHERE id = p_org_id AND is_affiliate = TRUE;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
