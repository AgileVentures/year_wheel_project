#!/usr/bin/env node

/**
 * Fetch real data from Supabase to generate accurate test fixtures
 * 
 * Usage:
 *   SUPABASE_EMAIL=thomas@freefoot.se SUPABASE_PASSWORD=xxx node scripts/fetch-real-data.js
 *   
 *   Or simply:
 *   node scripts/fetch-real-data.js
 *   
 *   (reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.local)
 * 
 * This script authenticates with real credentials and fetches:
 * - User profile
 * - User's wheels
 * - Team memberships
 * - Team wheels
 * - Team members
 * 
 * Output is written to cypress/fixtures/ for use in tests
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: resolve(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase configuration in .env.local');
  console.error('   Expected: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const email = process.env.SUPABASE_EMAIL;
const password = process.env.SUPABASE_PASSWORD;

if (!email || !password) {
  console.error('❌ Missing credentials. Set SUPABASE_EMAIL and SUPABASE_PASSWORD environment variables.');
  console.error('   Example: SUPABASE_EMAIL=thomas@freefoot.se SUPABASE_PASSWORD=xxx node scripts/fetch-real-data.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchAllData() {
  console.log('🔐 Authenticating...');
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error('❌ Auth failed:', authError.message);
    process.exit(1);
  }

  console.log('✅ Authenticated as:', authData.user.email);

  const userId = authData.user.id;

  // Fetch auth user data (for GET /auth/v1/user)
  const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error('❌ Failed to fetch user:', userError);
  } else {
    console.log('📄 Writing auth-user.json...');
    writeFixture('auth-user.json', authUser);
  }

  // Fetch session data
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error('❌ Failed to fetch session:', sessionError);
  } else {
    console.log('📄 Writing auth-session.json...');
    writeFixture('auth-session.json', session);
  }

  // Fetch profile
  console.log('\n👤 Fetching profile...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('❌ Profile fetch failed:', profileError);
  } else {
    console.log('✅ Profile:', profile.email);
    writeFixture('profile.json', profile);
  }

  // Fetch subscription
  console.log('\n💳 Fetching subscription...');
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('❌ Subscription fetch failed:', subError);
  } else {
    console.log('✅ Subscription status:', subscription?.status || 'none (free plan)');
    writeFixture('subscription.json', subscription || { status: 'free' });
  }

  // Fetch user's personal wheels
  console.log('\n🎡 Fetching user wheels...');
  const { data: userWheels, error: wheelsError } = await supabase
    .from('year_wheels')
    .select(`
      *,
      teams (
        id,
        name
      )
    `)
    .eq('user_id', userId)
    .eq('is_template', false)
    .order('created_at', { ascending: false });

  if (wheelsError) {
    console.error('❌ User wheels fetch failed:', wheelsError);
  } else {
    console.log(`✅ Found ${userWheels.length} personal wheels`);
    userWheels.forEach(w => console.log(`   - ${w.title} (${w.year})`));
    writeFixture('user-wheels.json', userWheels);
  }

  // Fetch team memberships
  console.log('\n👥 Fetching team memberships...');
  const { data: teamMemberships, error: membershipsError } = await supabase
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId);

  if (membershipsError) {
    console.error('❌ Team memberships fetch failed:', membershipsError);
  } else {
    console.log(`✅ Member of ${teamMemberships.length} team(s)`);

    if (teamMemberships.length > 0) {
      const teamIds = teamMemberships.map(m => m.team_id);

      // Fetch teams
      console.log('\n🏢 Fetching teams...');
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds);

      if (teamsError) {
        console.error('❌ Teams fetch failed:', teamsError);
      } else {
        console.log(`✅ Teams:`);
        teams.forEach(t => console.log(`   - ${t.name}`));
        writeFixture('teams.json', teams);
        
        // Use first team for detailed fixtures
        if (teams.length > 0) {
          const firstTeam = teams[0];
          writeFixture('team.json', firstTeam);

          // Fetch team members
          console.log(`\n👤 Fetching members for team "${firstTeam.name}"...`);
          const { data: members, error: membersError } = await supabase.rpc('get_team_members_with_emails', {
            p_team_id: firstTeam.id
          });

          if (membersError) {
            console.error('❌ Team members fetch failed:', membersError);
          } else {
            console.log(`✅ Found ${members.length} members`);
            members.forEach(m => console.log(`   - ${m.email} (${m.role})`));
            writeFixture('team-members-real.json', members);
          }

          // Fetch team wheels
          console.log(`\n🎡 Fetching wheels for team "${firstTeam.name}"...`);
          const { data: teamWheels, error: teamWheelsError } = await supabase
            .from('year_wheels')
            .select(`
              *,
              teams (
                id,
                name
              )
            `)
            .eq('team_id', firstTeam.id)
            .order('created_at', { ascending: false });

          if (teamWheelsError) {
            console.error('❌ Team wheels fetch failed:', teamWheelsError);
          } else {
            console.log(`✅ Found ${teamWheels.length} team wheels`);
            teamWheels.forEach(w => console.log(`   - ${w.title} (${w.year})`));
            writeFixture('team-wheels.json', teamWheels);
          }
        }
      }
    }
  }

  // Fetch organization membership (affiliate check)
  console.log('\n🏛️  Fetching organization membership...');
  const { data: orgMembers, error: orgError } = await supabase
    .from('organization_members')
    .select(`
      organization_id,
      organizations!inner(is_affiliate)
    `)
    .eq('user_id', userId)
    .eq('organizations.is_affiliate', true)
    .limit(1);

  if (orgError) {
    console.error('❌ Organization membership fetch failed:', orgError);
  } else {
    console.log(`✅ Affiliate status:`, orgMembers.length > 0 ? 'Yes' : 'No');
    writeFixture('organization-members-affiliate.json', orgMembers);
  }

  console.log('\n✨ All fixtures generated successfully!');
  console.log('📂 Check cypress/fixtures/ directory');
  
  // Sign out
  await supabase.auth.signOut();
}

function writeFixture(filename, data) {
  const fixturePath = resolve(__dirname, '..', 'cypress', 'fixtures', filename);
  writeFileSync(fixturePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`   ✍️  Wrote ${fixturePath}`);
}

fetchAllData().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
