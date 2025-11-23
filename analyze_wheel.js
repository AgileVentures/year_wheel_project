import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load .env.local
config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Get wheel ID from command line argument or use default
const wheelId = process.argv[2] || '417af283-c708-44d9-b282-6d235453a720';

async function analyzeWheel() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('WHEEL ANALYSIS FOR:', wheelId);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Check auth status
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.log('⚠️  Not authenticated - fetching as public user\n');
  } else {
    console.log('✅ Authenticated as:', user.email, '\n');
  }

  // First, try to find this specific wheel (with or without auth)
  console.log('🔍 Looking for wheel:', wheelId);
  const { data: targetWheel, error: targetError } = await supabase
    .from('year_wheels')
    .select('id, title, year, user_id, team_id, is_public')
    .eq('id', wheelId)
    .maybeSingle();

  if (targetError) {
    console.error('❌ Error checking wheel:', targetError);
  } else if (!targetWheel) {
    console.log('❌ Wheel not found or access denied\n');
    console.log('This could mean:');
    console.log('  1. The wheel belongs to another user');
    console.log('  2. RLS policies are blocking access');
    console.log('  3. The wheel ID is incorrect\n');
  } else {
    console.log('✅ Found wheel!\n');
    console.log('  Title:', targetWheel.title);
    console.log('  Year:', targetWheel.year);
    console.log('  User ID:', targetWheel.user_id);
    console.log('  Team ID:', targetWheel.team_id || 'None');
    console.log('  Public:', targetWheel.is_public);
    console.log('');
  }

  // List all wheels to verify what's accessible
  console.log('📋 Listing accessible wheels:');
  console.log('─────────────────────────────────────────────────────────────');
  const { data: allWheels, error: wheelsError } = await supabase
    .from('year_wheels')
    .select('id, title, year, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (wheelsError) {
    console.error('Error fetching wheels:', wheelsError);
    return;
  }

  if (allWheels && allWheels.length > 0) {
    allWheels.forEach((w, index) => {
      const isTarget = w.id === wheelId;
      console.log(`  ${isTarget ? '👉' : '  '} ${index + 1}. ${w.title || 'Untitled'} (${w.year})`);
      console.log(`     ID: ${w.id}`);
      console.log(`     Created: ${new Date(w.created_at).toLocaleString()}`);
    });
  } else {
    console.log('  No wheels accessible');
    return;
  }
  console.log('\n═══════════════════════════════════════════════════════════════\n');

  if (!targetWheel) {
    console.log('Cannot proceed with analysis - wheel not accessible');
    return;
  }

  // 1. Wheel Overview
  const { data: wheel, error: wheelError } = await supabase
    .from('year_wheels')
    .select('*')
    .eq('id', wheelId)
    .single();

  if (wheelError) {
    console.error('Error fetching wheel:', wheelError);
    return;
  }

  console.log('📊 WHEEL OVERVIEW:');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Title:', wheel.title);
  console.log('Year:', wheel.year);
  console.log('Created:', new Date(wheel.created_at).toLocaleString());
  console.log('Updated:', new Date(wheel.updated_at).toLocaleString());
  console.log('Public:', wheel.is_public);
  console.log('Template:', wheel.is_template);
  console.log('Week Ring:', wheel.show_week_ring);
  console.log('Month Ring:', wheel.show_month_ring);
  console.log('');

  // 2. Pages
  const { data: pages, error: pagesError } = await supabase
    .from('wheel_pages')
    .select('*')
    .eq('wheel_id', wheelId)
    .order('page_order', { ascending: true });

  console.log('📄 PAGES (' + (pages?.length || 0) + ' total):');
  console.log('─────────────────────────────────────────────────────────────');
  if (pages && pages.length > 0) {
    pages.forEach(page => {
      console.log(`  • Page ${page.page_order}: ${page.title || page.year} (Year: ${page.year})`);
      console.log(`    ID: ${page.id}`);
      console.log(`    Created: ${new Date(page.created_at).toLocaleString()}`);
    });
  } else {
    console.log('  No pages found');
  }
  console.log('');

  // 3. Rings
  const { data: rings, error: ringsError } = await supabase
    .from('wheel_rings')
    .select('*')
    .eq('wheel_id', wheelId)
    .order('ring_order', { ascending: true });

  console.log('🔵 RINGS (' + (rings?.length || 0) + ' total):');
  console.log('─────────────────────────────────────────────────────────────');
  if (rings && rings.length > 0) {
    rings.forEach(ring => {
      console.log(`  • ${ring.name} (${ring.type})`);
      console.log(`    ID: ${ring.id}`);
      console.log(`    Visible: ${ring.visible}, Orientation: ${ring.orientation || 'vertical'}`);
      console.log(`    Order: ${ring.ring_order}`);
    });
  } else {
    console.log('  No rings found');
  }
  console.log('');

  // 4. Activity Groups
  const { data: groups, error: groupsError } = await supabase
    .from('activity_groups')
    .select('*')
    .eq('wheel_id', wheelId)
    .order('name', { ascending: true });

  console.log('🎨 ACTIVITY GROUPS (' + (groups?.length || 0) + ' total):');
  console.log('─────────────────────────────────────────────────────────────');
  if (groups && groups.length > 0) {
    groups.forEach(group => {
      console.log(`  • ${group.name} (${group.color})`);
      console.log(`    ID: ${group.id}`);
      console.log(`    Visible: ${group.visible}`);
    });
  } else {
    console.log('  No activity groups found');
  }
  console.log('');

  // 5. Labels
  const { data: labels, error: labelsError } = await supabase
    .from('labels')
    .select('*')
    .eq('wheel_id', wheelId)
    .order('name', { ascending: true });

  console.log('🏷️  LABELS (' + (labels?.length || 0) + ' total):');
  console.log('─────────────────────────────────────────────────────────────');
  if (labels && labels.length > 0) {
    labels.forEach(label => {
      console.log(`  • ${label.name} (${label.color})`);
      console.log(`    ID: ${label.id}`);
      console.log(`    Visible: ${label.visible}`);
    });
  } else {
    console.log('  No labels found');
  }
  console.log('');

  // 6. Items by Page
  console.log('📦 ITEMS BY PAGE:');
  console.log('─────────────────────────────────────────────────────────────');
  if (pages && pages.length > 0) {
    for (const page of pages) {
      const { count } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('page_id', page.id);

      const { data: pageItems } = await supabase
        .from('items')
        .select('start_date, end_date')
        .eq('page_id', page.id)
        .order('start_date', { ascending: true });

      const earliest = pageItems && pageItems.length > 0 ? pageItems[0].start_date : 'N/A';
      const latest = pageItems && pageItems.length > 0 ? pageItems[pageItems.length - 1].end_date : 'N/A';

      console.log(`  Page ${page.page_order} (${page.year}): ${count || 0} items`);
      console.log(`    Date range: ${earliest} to ${latest}`);
    }
  }
  console.log('');

  // 7. Sample Items
  const { data: sampleItems, error: itemsError } = await supabase
    .from('items')
    .select(`
      id,
      name,
      start_date,
      end_date,
      ring:wheel_rings(name),
      group:activity_groups(name),
      page:wheel_pages(year)
    `)
    .eq('wheel_id', wheelId)
    .order('start_date', { ascending: true })
    .limit(10);

  console.log('📌 SAMPLE ITEMS (first 10):');
  console.log('─────────────────────────────────────────────────────────────');
  if (sampleItems && sampleItems.length > 0) {
    sampleItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name}`);
      console.log(`     Ring: ${item.ring?.name || 'N/A'}`);
      console.log(`     Group: ${item.group?.name || 'N/A'}`);
      console.log(`     Page Year: ${item.page?.year || 'N/A'}`);
      console.log(`     Dates: ${item.start_date} to ${item.end_date}`);
    });
  } else {
    console.log('  No items found');
  }
  console.log('');

  // 8. Total Item Count
  const { count: totalItems } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('wheel_id', wheelId);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY:');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Total Pages:', pages?.length || 0);
  console.log('Total Rings:', rings?.length || 0);
  console.log('Total Activity Groups:', groups?.length || 0);
  console.log('Total Labels:', labels?.length || 0);
  console.log('Total Items:', totalItems || 0);
  console.log('═══════════════════════════════════════════════════════════════');
}

analyzeWheel().catch(console.error);
