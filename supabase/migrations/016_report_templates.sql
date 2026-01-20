-- Migration 016: Report Templates System
-- Creates tables for user-defined report templates with Handlebars support

-- report_templates table
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  wheel_id UUID REFERENCES year_wheels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_content TEXT NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  category TEXT DEFAULT 'custom', -- 'custom', 'monthly', 'activity', 'summary'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_report_templates_user_id ON report_templates(user_id);
CREATE INDEX idx_report_templates_wheel_id ON report_templates(wheel_id);
CREATE INDEX idx_report_templates_is_system ON report_templates(is_system);

-- RLS Policies
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own templates and system templates
CREATE POLICY "Users can view own templates"
  ON report_templates FOR SELECT
  USING (
    auth.uid() = user_id OR is_system = TRUE
  );

-- Users can create their own templates
CREATE POLICY "Users can create templates"
  ON report_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON report_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON report_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage system templates
CREATE POLICY "Admins can manage system templates"
  ON report_templates FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON report_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default system templates
INSERT INTO report_templates (user_id, name, description, template_content, is_system, category) VALUES
(NULL, 'Monthly Summary', 'Overview of activities grouped by month', 
'<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h1>{{wheel.title}} - {{wheel.year}}</h1>
  <h2>Monthly Summary</h2>
  
  {{#each months}}
  <div style="margin: 20px 0; page-break-inside: avoid;">
    <h3 style="color: #334155; border-bottom: 2px solid #94A3B8; padding-bottom: 5px;">
      {{name}}
    </h3>
    {{#if items}}
      <ul style="list-style-type: none; padding-left: 0;">
      {{#each items}}
        <li style="margin: 10px 0; padding: 10px; background: #f8fafc; border-left: 4px solid {{activityColor}};">
          <strong>{{name}}</strong><br>
          <span style="color: #64748b; font-size: 0.9em;">
            {{formatDate startDate}} - {{formatDate endDate}}
          </span><br>
          <span style="color: #475569;">Ring: {{ringName}} | Group: {{activityName}}</span>
        </li>
      {{/each}}
      </ul>
    {{else}}
      <p style="color: #94A3B8; font-style: italic;">No activities this month</p>
    {{/if}}
  </div>
  {{/each}}
  
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 0.9em;">
    Generated on {{currentDate}}
  </div>
</div>', TRUE, 'monthly'),

(NULL, 'Activity List', 'All activities grouped by activity group', 
'<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h1>{{wheel.title}} - {{wheel.year}}</h1>
  <h2>Activities by Group</h2>
  
  {{#each activityGroups}}
  <div style="margin: 20px 0; page-break-inside: avoid;">
    <h3 style="color: {{color}}; border-bottom: 2px solid {{color}}; padding-bottom: 5px;">
      {{name}}
    </h3>
    {{#if items}}
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="text-align: left; padding: 8px;">Activity</th>
            <th style="text-align: left; padding: 8px;">Ring</th>
            <th style="text-align: left; padding: 8px;">Start Date</th>
            <th style="text-align: left; padding: 8px;">End Date</th>
          </tr>
        </thead>
        <tbody>
        {{#each items}}
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px;">{{name}}</td>
            <td style="padding: 8px;">{{ringName}}</td>
            <td style="padding: 8px;">{{formatDate startDate}}</td>
            <td style="padding: 8px;">{{formatDate endDate}}</td>
          </tr>
        {{/each}}
        </tbody>
      </table>
    {{else}}
      <p style="color: #94A3B8; font-style: italic;">No activities in this group</p>
    {{/if}}
  </div>
  {{/each}}
  
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 0.9em;">
    Total Activities: {{stats.totalItems}} | Generated on {{currentDate}}
  </div>
</div>', TRUE, 'activity'),

(NULL, 'Year Overview', 'High-level statistics and summary', 
'<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h1 style="text-align: center; color: #0f172a;">{{wheel.title}}</h1>
  <h2 style="text-align: center; color: #475569;">{{wheel.year}} Year Overview</h2>
  
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 40px 0;">
    <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center;">
      <h3 style="margin: 0; color: #64748b;">Total Activities</h3>
      <p style="font-size: 3em; margin: 10px 0; color: #0f172a;">{{stats.totalItems}}</p>
    </div>
    <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center;">
      <h3 style="margin: 0; color: #64748b;">Activity Groups</h3>
      <p style="font-size: 3em; margin: 10px 0; color: #0f172a;">{{stats.totalActivityGroups}}</p>
    </div>
    <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center;">
      <h3 style="margin: 0; color: #64748b;">Rings</h3>
      <p style="font-size: 3em; margin: 10px 0; color: #0f172a;">{{stats.totalRings}}</p>
    </div>
  </div>
  
  <h3 style="margin-top: 40px; color: #334155;">Activities by Ring</h3>
  {{#each rings}}
  <div style="margin: 15px 0;">
    <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #3b82f6;">
      <strong>{{name}}</strong>
      <span style="float: right; color: #64748b;">{{itemCount}} activities</span>
    </div>
  </div>
  {{/each}}
  
  <h3 style="margin-top: 40px; color: #334155;">Activities by Group</h3>
  {{#each activityGroups}}
  <div style="margin: 15px 0;">
    <div style="background: #f8fafc; padding: 15px; border-left: 4px solid {{color}};">
      <strong>{{name}}</strong>
      <span style="float: right; color: #64748b;">{{itemCount}} activities</span>
    </div>
  </div>
  {{/each}}
  
  <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 0.9em; text-align: center;">
    Generated on {{currentDate}}
  </div>
</div>', TRUE, 'summary');

COMMENT ON TABLE report_templates IS 'User-defined and system report templates using Handlebars syntax';
COMMENT ON COLUMN report_templates.is_system IS 'System templates are read-only and visible to all users';
COMMENT ON COLUMN report_templates.template_content IS 'HTML template with Handlebars placeholders ({{variable}}, {{#each}}, etc.)';
