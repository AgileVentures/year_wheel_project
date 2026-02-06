-- Migration 022: Add payment details fields to organizations table

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS bank_account_holder TEXT,
ADD COLUMN IF NOT EXISTS iban TEXT,
ADD COLUMN IF NOT EXISTS bic TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer', 'paypal', 'stripe', 'other')),
ADD COLUMN IF NOT EXISTS payment_details_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tax_id TEXT, -- VAT number or tax ID
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_line2 TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Add comment explaining payment flow
COMMENT ON COLUMN organizations.payment_email IS 'Email for payment notifications and invoices';
COMMENT ON COLUMN organizations.bank_account_holder IS 'Full name or company name on bank account';
COMMENT ON COLUMN organizations.iban IS 'International Bank Account Number for SEPA transfers';
COMMENT ON COLUMN organizations.bic IS 'Bank Identifier Code (SWIFT code)';
COMMENT ON COLUMN organizations.payment_details_verified IS 'Admin-verified payment details (prevents fraud)';
COMMENT ON COLUMN organizations.tax_id IS 'VAT number or Tax ID for invoicing';
