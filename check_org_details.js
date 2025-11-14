// Script to check organization members and owner details
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ORG_ID = '712f492a-6d2b-49ca-b05f-7929de6e6d45'; // The rejected YearWheel org

async function checkOrgDetails() {
  console.log('\n📋 Checking organization details and members...\n');

  // Get organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', ORG_ID)
    .single();

  if (orgError) {
    console.error('Error:', orgError);
    return;
  }

  console.log('Organization:');
  console.log(`  ID: ${org.id}`);
  console.log(`  Name: ${org.name}`);
  console.log(`  Status: ${org.affiliate_status}`);
  console.log(`  Active: ${org.affiliate_active}`);
  console.log(`  Owner ID: ${org.owner_id}`);
  console.log(`  Contact Email: ${org.contact_email}`);
  console.log(`  Website: ${org.application_website || org.website || 'N/A'}`);
  console.log(`  Rejection Reason: ${org.application_rejection_reason || 'N/A'}`);
  console.log(`  Promotion Plan: ${org.application_promotion_plan || 'N/A'}\n`);

  // Get owner profile
  if (org.owner_id) {
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', org.owner_id)
      .single();

    if (ownerProfile) {
      console.log('Owner Profile:');
      console.log(`  Email: ${ownerProfile.email}`);
      console.log(`  Full Name: ${ownerProfile.full_name || 'N/A'}`);
      console.log(`  Admin: ${ownerProfile.is_admin ? 'Yes' : 'No'}\n`);
    }
  }

  // Get members
  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select(`
      *,
      profiles:user_id (
        email,
        full_name,
        is_admin
      )
    `)
    .eq('organization_id', ORG_ID);

  if (!membersError && members?.length > 0) {
    console.log(`Members (${members.length}):`);
    members.forEach((m, idx) => {
      console.log(`  ${idx + 1}. ${m.profiles?.email || 'Unknown'}`);
      console.log(`     Role: ${m.role}`);
      console.log(`     Joined: ${new Date(m.joined_at).toLocaleString()}`);
    });
    console.log('');
  } else {
    console.log('No members found.\n');
  }

  // Check for any affiliate links
  const { data: links } = await supabase
    .from('affiliate_links')
    .select('*')
    .eq('organization_id', ORG_ID);

  if (links?.length > 0) {
    console.log(`Affiliate Links (${links.length}):`);
    links.forEach((link, idx) => {
      console.log(`  ${idx + 1}. ${link.name || link.code}`);
      console.log(`     Code: ${link.code}`);
      console.log(`     Active: ${link.is_active}`);
      console.log(`     Clicks: ${link.clicks}`);
    });
    console.log('');
  } else {
    console.log('No affiliate links.\n');
  }

  // Check for any conversions
  const { data: conversions } = await supabase
    .from('affiliate_conversions')
    .select('*')
    .eq('organization_id', ORG_ID);

  if (conversions?.length > 0) {
    console.log(`Conversions (${conversions.length}):`);
    const clicks = conversions.filter(c => c.clicked_at).length;
    const signups = conversions.filter(c => c.signed_up_at).length;
    const upgrades = conversions.filter(c => c.upgraded_at).length;
    console.log(`  Clicks: ${clicks}`);
    console.log(`  Signups: ${signups}`);
    console.log(`  Upgrades: ${upgrades}\n`);
  } else {
    console.log('No conversions.\n');
  }

  // Check for any commissions
  const { data: commissions } = await supabase
    .from('affiliate_commissions')
    .select('*')
    .eq('organization_id', ORG_ID);

  if (commissions?.length > 0) {
    console.log(`Commissions (${commissions.length}):`);
    const total = commissions.reduce((sum, c) => sum + parseFloat(c.commission_amount), 0);
    const byStatus = commissions.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});
    console.log(`  Total Amount: €${total.toFixed(2)}`);
    console.log(`  By Status:`, byStatus);
    console.log('');
  } else {
    console.log('No commissions.\n');
  }
}

checkOrgDetails().catch(console.error);
