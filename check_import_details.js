import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xywyzhpjxjpxodfzmamn.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5d3l6aHBqeGpweG9kZnptYW1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU4ODE1ODYsImV4cCI6MjA0MTQ1NzU4Nn0.cKkp_D7m7MUv8z_YrIOjfgHZXZ5qiikuHJa5M-lC-2Q'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkImport() {
  // Get the most recent completed job
  const { data: job, error: jobError } = await supabase
    .from('import_jobs')
    .select('*')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (jobError) {
    console.error('Error fetching job:', jobError)
    return
  }

  console.log('\n=== IMPORT JOB ===')
  console.log('Job ID:', job.id)
  console.log('Wheel ID:', job.wheel_id)
  console.log('Total items:', job.metadata?.totalItems)
  console.log('Processed items:', job.metadata?.processedItems)
  console.log('Created rings:', job.metadata?.createdRings)
  console.log('Created groups:', job.metadata?.createdGroups)
  console.log('Created labels:', job.metadata?.createdLabels)

  // Get rings for this wheel
  const { data: rings, error: ringsError } = await supabase
    .from('wheel_rings')
    .select('*')
    .eq('wheel_id', job.wheel_id)

  console.log('\n=== RINGS ===')
  console.log('Count:', rings?.length)
  rings?.forEach(r => console.log(`  - ${r.name} (${r.id})`))

  // Get activity groups for this wheel
  const { data: groups, error: groupsError } = await supabase
    .from('activity_groups')
    .select('*')
    .eq('wheel_id', job.wheel_id)

  console.log('\n=== ACTIVITY GROUPS ===')
  console.log('Count:', groups?.length)
  groups?.forEach(g => console.log(`  - ${g.name} (${g.id})`))

  // Get items grouped by page
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('*, wheel_pages(year)')
    .eq('wheel_id', job.wheel_id)
    .order('start_date')

  console.log('\n=== ITEMS ===')
  console.log('Total items:', items?.length)
  
  // Group by year
  const byYear = {}
  items?.forEach(item => {
    const year = item.wheel_pages?.year || 'unknown'
    byYear[year] = (byYear[year] || 0) + 1
  })
  
  console.log('By year:')
  Object.entries(byYear).forEach(([year, count]) => {
    console.log(`  ${year}: ${count}`)
  })

  // Check for items with missing references
  const missingRing = items?.filter(i => !i.ring_id).length || 0
  const missingActivity = items?.filter(i => !i.activity_id).length || 0
  
  console.log('\nItems with missing references:')
  console.log('  Missing ring_id:', missingRing)
  console.log('  Missing activity_id:', missingActivity)

  // Sample some items to see their structure
  console.log('\n=== SAMPLE ITEMS (first 3) ===')
  items?.slice(0, 3).forEach(item => {
    console.log({
      name: item.name,
      start_date: item.start_date,
      ring_id: item.ring_id,
      activity_id: item.activity_id,
      year: item.wheel_pages?.year
    })
  })

  // Get the CSV data from the job to analyze
  if (job.csv_data) {
    const csvLines = job.csv_data.split('\n')
    console.log('\n=== CSV ANALYSIS ===')
    console.log('Total CSV lines:', csvLines.length)
    console.log('Header:', csvLines[0])
    
    // Parse a few lines to see the data
    const headers = csvLines[0].split(';')
    console.log('\nHeaders:', headers)
    
    // Check if there are any empty or malformed lines
    const emptyLines = csvLines.filter(line => !line.trim()).length
    console.log('Empty lines:', emptyLines)
  }

  console.log('\n=== DISCREPANCY ===')
  const expected = job.metadata?.totalItems || 0
  const actual = items?.length || 0
  const missing = expected - actual
  console.log(`Expected: ${expected}`)
  console.log(`Actual: ${actual}`)
  console.log(`Missing: ${missing}`)
  
  if (missing > 0) {
    console.log(`\n⚠️  ${missing} activities were filtered out during import!`)
    console.log('This happens when ring_id or activity_id cannot be matched.')
  }
}

checkImport().then(() => process.exit(0)).catch(err => {
  console.error(err)
  process.exit(1)
})
