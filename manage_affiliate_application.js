// Script to manage specific affiliate application
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local file manually
const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ORG_ID = '712f492a-6d2b-49ca-b05f-7929de6e6d45'; // The rejected YearWheel org

async function manageApplication(action) {
  console.log(`\n🔧 Managing application for organization: ${ORG_ID}\n`);

  // Get current details
  const { data: org, error: fetchError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', ORG_ID)
    .single();

  if (fetchError) {
    console.error('Error fetching organization:', fetchError);
    return;
  }

  console.log('Current Status:');
  console.log(`  Name: ${org.name}`);
  console.log(`  Status: ${org.affiliate_status}`);
  console.log(`  Active: ${org.affiliate_active}`);
  console.log(`  Rejection Reason: ${org.application_rejection_reason || 'N/A'}\n`);

  if (action === 'view') {
    console.log('Full details:');
    console.log(JSON.stringify(org, null, 2));
    return;
  }

  if (action === 'approve') {
    console.log('✅ Approving application...');
    const { error } = await supabase.rpc('approve_affiliate_application', {
      p_org_id: ORG_ID,
      p_admin_id: org.owner_id // Using owner as admin for this operation
    });

    if (error) {
      console.error('Error approving:', error);
      return;
    }
    console.log('✅ Application approved successfully!');
    
    // Verify the change
    const { data: updated } = await supabase
      .from('organizations')
      .select('affiliate_status, affiliate_active')
      .eq('id', ORG_ID)
      .single();
    
    console.log(`\nNew status: ${updated.affiliate_status}, Active: ${updated.affiliate_active}`);
  }

  if (action === 'reset') {
    console.log('🔄 Resetting to pending...');
    const { error } = await supabase
      .from('organizations')
      .update({
        affiliate_status: 'pending',
        application_reviewed_at: null,
        application_reviewed_by: null,
        application_rejection_reason: null
      })
      .eq('id', ORG_ID);

    if (error) {
      console.error('Error resetting:', error);
      return;
    }
    console.log('✅ Application reset to pending!');
  }

  if (action === 'delete') {
    console.log('🗑️  Deleting organization...');
    
    // First delete related data (if any)
    const tables = [
      'affiliate_commissions',
      'affiliate_conversions', 
      'affiliate_links',
      'organization_members'
    ];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .delete()
        .eq('organization_id', ORG_ID);
      
      if (error && error.code !== 'PGRST116') { // Ignore "no rows deleted" error
        console.warn(`Warning deleting from ${table}:`, error.message);
      } else {
        console.log(`  ✓ Cleaned ${table}`);
      }
    }
    
    // Delete the organization
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', ORG_ID);

    if (error) {
      console.error('Error deleting organization:', error);
      return;
    }
    console.log('✅ Organization deleted successfully!');
  }
}

// Get action from command line
const action = process.argv[2] || 'view';
const validActions = ['view', 'approve', 'reset', 'delete'];

if (!validActions.includes(action)) {
  console.log('Usage: node manage_affiliate_application.js [action]');
  console.log('Actions:');
  console.log('  view     - View full organization details (default)');
  console.log('  approve  - Approve the application');
  console.log('  reset    - Reset status to pending');
  console.log('  delete   - Delete the organization completely');
  process.exit(1);
}

manageApplication(action).catch(console.error);
