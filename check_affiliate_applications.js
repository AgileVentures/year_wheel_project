// Script to check affiliate applications in the database
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
  console.error('Missing environment variables. Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAffiliateApplications() {
  console.log('🔍 Checking affiliate applications...\n');

  // Get all affiliate organizations
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('is_affiliate', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching organizations:', error);
    return;
  }

  console.log(`Found ${orgs.length} affiliate organizations:\n`);

  // Group by status
  const byStatus = {
    pending: [],
    approved: [],
    rejected: []
  };

  orgs.forEach(org => {
    const status = org.affiliate_status || 'pending';
    byStatus[status].push(org);
  });

  // Display summary
  console.log('📊 Summary:');
  console.log(`  ✓ Approved: ${byStatus.approved.length}`);
  console.log(`  ⏳ Pending: ${byStatus.pending.length}`);
  console.log(`  ✗ Rejected: ${byStatus.rejected.length}\n`);

  // Show rejected applications
  if (byStatus.rejected.length > 0) {
    console.log('❌ REJECTED APPLICATIONS:');
    console.log('═'.repeat(80));
    byStatus.rejected.forEach((org, idx) => {
      console.log(`\n${idx + 1}. ${org.name}`);
      console.log(`   ID: ${org.id}`);
      console.log(`   Contact Email: ${org.contact_email || 'N/A'}`);
      console.log(`   Website: ${org.application_website || org.website || 'N/A'}`);
      console.log(`   Created: ${new Date(org.created_at).toLocaleString()}`);
      console.log(`   Submitted: ${org.application_submitted_at ? new Date(org.application_submitted_at).toLocaleString() : 'N/A'}`);
      console.log(`   Reviewed: ${org.application_reviewed_at ? new Date(org.application_reviewed_at).toLocaleString() : 'N/A'}`);
      console.log(`   Rejection Reason: ${org.application_rejection_reason || 'No reason recorded'}`);
      console.log(`   Promotion Plan: ${org.application_promotion_plan?.substring(0, 100) || 'N/A'}${org.application_promotion_plan?.length > 100 ? '...' : ''}`);
    });
    console.log('\n' + '═'.repeat(80));
  }

  // Show pending applications
  if (byStatus.pending.length > 0) {
    console.log('\n⏳ PENDING APPLICATIONS:');
    console.log('═'.repeat(80));
    byStatus.pending.forEach((org, idx) => {
      console.log(`\n${idx + 1}. ${org.name}`);
      console.log(`   ID: ${org.id}`);
      console.log(`   Contact Email: ${org.contact_email || 'N/A'}`);
      console.log(`   Website: ${org.application_website || org.website || 'N/A'}`);
      console.log(`   Created: ${new Date(org.created_at).toLocaleString()}`);
      console.log(`   Submitted: ${org.application_submitted_at ? new Date(org.application_submitted_at).toLocaleString() : 'N/A'}`);
      console.log(`   Promotion Plan: ${org.application_promotion_plan?.substring(0, 100) || 'N/A'}${org.application_promotion_plan?.length > 100 ? '...' : ''}`);
    });
    console.log('\n' + '═'.repeat(80));
  }

  // Show approved applications
  if (byStatus.approved.length > 0) {
    console.log('\n✓ APPROVED APPLICATIONS:');
    console.log('═'.repeat(80));
    byStatus.approved.forEach((org, idx) => {
      console.log(`\n${idx + 1}. ${org.name}`);
      console.log(`   ID: ${org.id}`);
      console.log(`   Contact Email: ${org.contact_email || 'N/A'}`);
      console.log(`   Active: ${org.affiliate_active ? '✓' : '✗'}`);
      console.log(`   Created: ${new Date(org.created_at).toLocaleString()}`);
      console.log(`   Reviewed: ${org.application_reviewed_at ? new Date(org.application_reviewed_at).toLocaleString() : 'N/A'}`);
    });
    console.log('\n' + '═'.repeat(80));
  }

  // Check for any organizations without proper affiliate_status
  const noStatus = orgs.filter(o => !o.affiliate_status);
  if (noStatus.length > 0) {
    console.log('\n⚠️  WARNING: Organizations without affiliate_status:');
    noStatus.forEach(org => {
      console.log(`   - ${org.name} (${org.id})`);
    });
  }
}

checkAffiliateApplications().catch(console.error);
