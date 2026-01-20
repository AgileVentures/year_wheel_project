-- Migration 017: Rollback Report Templates (if needed)
-- Drops all objects created in migration 016

-- Drop trigger
DROP TRIGGER IF EXISTS update_report_templates_updated_at ON report_templates;

-- Drop RLS policies
DROP POLICY IF EXISTS "Admins can manage system templates" ON report_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON report_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON report_templates;
DROP POLICY IF EXISTS "Users can create templates" ON report_templates;
DROP POLICY IF EXISTS "Users can view own templates" ON report_templates;

-- Drop indexes
DROP INDEX IF EXISTS idx_report_templates_is_system;
DROP INDEX IF EXISTS idx_report_templates_wheel_id;
DROP INDEX IF EXISTS idx_report_templates_user_id;

-- Drop table
DROP TABLE IF EXISTS report_templates;
