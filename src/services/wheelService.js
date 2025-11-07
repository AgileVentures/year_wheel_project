/**
 * Wheel Service
 * 
 * Handles all CRUD operations for year wheels and their related data.
 * Uses Supabase client for database operations.
 */

import { supabase } from '../lib/supabase';

/**
 * Fetch all wheels for the current user
 * ONLY returns wheels that the user owns (not public wheels from others)
 * Excludes template wheels (they appear separately in admin view)
 */
export const fetchUserWheels = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('year_wheels')
    .select(`
      *,
      teams (
        id,
        name
      )
    `)
    .eq('user_id', user.id) // CRITICAL: Only fetch wheels owned by this user
    .eq('is_template', false) // CRITICAL: Exclude templates from personal wheels
    .order('created_at', { ascending: false }); // Sort by creation date (newest first)

  if (error) throw error;
  return data;
};

/**
 * Fetch team wheels that the user has access to (but doesn't own)
 * Returns wheels from teams where the user is a member
 */
export const fetchTeamWheels = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Get team IDs where user is a member
  const { data: memberships, error: membershipsError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id);

  if (membershipsError) throw membershipsError;
  if (!memberships || memberships.length === 0) return [];

  const teamIds = memberships.map(m => m.team_id);

  // Fetch wheels that belong to these teams
  const { data, error } = await supabase
    .from('year_wheels')
    .select(`
      *,
      teams (
        id,
        name
      )
    `)
    .in('team_id', teamIds)
    .not('user_id', 'eq', user.id) // Exclude wheels owned by the user (already in personal wheels)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Fetch a single wheel with all related data
 */
export const fetchWheel = async (wheelId) => {
  // console.log('=== fetchWheel SERVICE CALLED ===');
  // console.log('[wheelService] Fetching wheel:', wheelId);
  
  // Fetch wheel
  const { data: wheel, error: wheelError } = await supabase
    .from('year_wheels')
    .select('*')
    .eq('id', wheelId)
    .single();

  if (wheelError) {
    console.error('[wheelService] ERROR fetching wheel:', wheelError);
    throw wheelError;
  }
  
  // console.log('[wheelService] Fetched wheel data:', {
  //   id: wheel.id,
  //   title: wheel.title,
  //   colors: wheel.colors,
  //   year: wheel.year
  // });

  // Fetch rings
  const { data: rings, error: ringsError } = await supabase
    .from('wheel_rings')
    .select('*')
    .eq('wheel_id', wheelId)
    .order('ring_order');

  if (ringsError) throw ringsError;

  // Fetch ring data for inner rings
  const ringIds = rings.filter(r => r.type === 'inner').map(r => r.id);
  let ringData = [];
  if (ringIds.length > 0) {
    const { data, error: ringDataError } = await supabase
      .from('ring_data')
      .select('*')
      .in('ring_id', ringIds);
    
    if (ringDataError) throw ringDataError;
    ringData = data;
  }

  // Fetch activity groups
  const { data: activityGroups, error: activityGroupsError } = await supabase
    .from('activity_groups')
    .select('*')
    .eq('wheel_id', wheelId);

  if (activityGroupsError) throw activityGroupsError;

  // Fetch labels
  const { data: labels, error: labelsError } = await supabase
    .from('labels')
    .select('*')
    .eq('wheel_id', wheelId);

  if (labelsError) throw labelsError;

  // NOTE: Items are now fetched per-page using fetchPageData(pageId)
  // This prevents mixing items from different years/pages
  
  // Transform to match current app structure
  const wheelColors = wheel.colors || ['#F5E6D3', '#A8DCD1', '#F4A896', '#B8D4E8']; // Default to Pastell palette
  
  return {
    id: wheel.id,
    user_id: wheel.user_id,
    team_id: wheel.team_id,
    title: wheel.title,
    year: wheel.year.toString(),
    colors: wheelColors,
    is_public: wheel.is_public,
    is_template: wheel.is_template || false,
    show_on_landing: wheel.show_on_landing || false,
    showWeekRing: wheel.show_week_ring,
    showMonthRing: wheel.show_month_ring,
    showRingNames: wheel.show_ring_names,
    showLabels: wheel.show_labels !== undefined ? wheel.show_labels : false,
    weekRingDisplayMode: wheel.week_ring_display_mode || 'week-numbers',
    organizationData: {
      rings: rings.map((ring, index) => {
        // For inner rings, attach the month data
        if (ring.type === 'inner') {
          const monthData = ringData
            .filter(rd => rd.ring_id === ring.id)
            .sort((a, b) => a.month_index - b.month_index);
          
          return {
            id: ring.id,
            name: ring.name,
            type: ring.type,
            visible: ring.visible,
            orientation: ring.orientation || 'vertical',
            data: monthData.length > 0 
              ? monthData.map(md => md.content)
              : Array.from({ length: 12 }, () => ['']),
          };
        }
        
        // Outer rings - always derive color from current palette (colors saved as null in DB)
        const outerRingIndex = rings.filter((r, i) => i < index && r.type === 'outer').length;
        return {
          id: ring.id,
          name: ring.name,
          type: ring.type,
          color: ring.color || wheelColors[outerRingIndex % wheelColors.length],
          visible: ring.visible,
        };
      }),
      activityGroups: activityGroups.map((ag, index) => ({
        id: ag.id,
        name: ag.name,
        color: ag.color || wheelColors[index % wheelColors.length], // Always derive from current palette (colors saved as null in DB)
        visible: ag.visible,
      })),
      labels: labels.map((l, index) => ({
        id: l.id,
        name: l.name,
        color: l.color || wheelColors[index % wheelColors.length], // Always derive from current palette (colors saved as null in DB)
        visible: l.visible,
      })),
      items: [], // Items must be fetched separately using fetchPageData(pageId)
    },
  };
};

/**
 * Fetch items for a specific page
 * This separates page-specific data (items) from wheel-level data (rings, groups, labels)
 * 
 * @param {string} pageId - The UUID of the page to fetch items for
 * @returns {Promise<Array<Object>>} Array of item objects with the following structure:
 * @typedef {Object} Item
 * @property {string} id - Unique item UUID
 * @property {string} ringId - Reference to ring (inner or outer)
 * @property {string} activityId - Reference to activity group (required)
 * @property {string|null} labelId - Reference to label (optional)
 * @property {string} name - Item display name
 * @property {string} startDate - ISO date string (YYYY-MM-DD)
 * @property {string} endDate - ISO date string (YYYY-MM-DD)
 * @property {string|null} time - Optional time string (e.g., "09:00-17:00")
 * @property {string|null} description - Optional description text
 * @property {string} pageId - Reference to parent page (for multi-year support)
 * @property {string|null} linkedWheelId - Reference to another wheel (for inter-wheel linking)
 * @property {string|null} linkType - Type of link: 'reference' or 'dependency'
 */
/**
 * Fetch items for a specific page
 * CRITICAL: Also fetches multi-year items that span into this page's year
 * 
 * @param {string} pageId - The page ID
 * @param {number} pageYear - The year of this page (to find multi-year items)
 * @param {string} wheelId - The wheel ID (to find all items for this wheel)
 * @returns {Promise<Array>} Items for this page
 */
export const fetchPageData = async (pageId, pageYear = null, wheelId = null) => {
  console.log(`[fetchPageData] Fetching for pageId=${pageId?.substring(0, 8)}, year=${pageYear}, wheelId=${wheelId?.substring(0, 8)}`);
  
  let items = [];
  
  // First, fetch items assigned to this page
  const { data: pageItems, error: itemsError } = await supabase
    .from('items')
    .select('*')
    .eq('page_id', pageId);

  if (itemsError) throw itemsError;
  
  console.log(`[fetchPageData] Found ${pageItems?.length || 0} items assigned to this page`);
  items = pageItems || [];
  
  // If we have both pageYear and wheelId, also fetch multi-year items that overlap with this year
  if (pageYear && wheelId) {
    const yearStart = `${pageYear}-01-01`;
    const yearEnd = `${pageYear}-12-31`;
    
    console.log(`[fetchPageData] Searching for multi-year items overlapping ${yearStart} to ${yearEnd}`);
    
    // Find items from other pages of the same wheel that overlap with this year
    const { data: multiYearItems, error: multiYearError } = await supabase
      .from('items')
      .select('*')
      .eq('wheel_id', wheelId)
      .neq('page_id', pageId) // Different page
      .or(`start_date.lte.${yearEnd},end_date.gte.${yearStart}`); // Overlaps with this year
    
    if (multiYearError) {
      console.error('[fetchPageData] Error fetching multi-year items:', multiYearError);
    } else if (multiYearItems && multiYearItems.length > 0) {
      console.log(`[fetchPageData] Found ${multiYearItems.length} potential multi-year items:`, 
        multiYearItems.map(i => ({
          id: i.id.substring(0, 8),
          name: i.name,
          pageId: i.page_id.substring(0, 8),
          dates: `${i.start_date} to ${i.end_date}`
        }))
      );
      
      // Filter to only include items that actually span into this year
      const filteredMultiYear = multiYearItems.filter(item => {
        const startDate = new Date(item.start_date);
        const endDate = new Date(item.end_date);
        const yearStartDate = new Date(yearStart);
        const yearEndDate = new Date(yearEnd);
        
        // Item overlaps if: start <= yearEnd AND end >= yearStart
        return startDate <= yearEndDate && endDate >= yearStartDate;
      });
      
      console.log(`[fetchPageData] After filtering: ${filteredMultiYear.length} multi-year items for year ${pageYear}`);
      items = [...items, ...filteredMultiYear];
    } else {
      console.log(`[fetchPageData] No multi-year items found for year ${pageYear}`);
    }
  }

  console.log(`[fetchPageData] Total items to return: ${items.length}`);
  
  return items.map(i => ({
    id: i.id,
    ringId: i.ring_id,
    activityId: i.activity_id,
    labelId: i.label_id,
    name: i.name,
    startDate: i.start_date,
    endDate: i.end_date,
    time: i.time,
    description: i.description, // ⚠️ CRITICAL: Include description from synced items
    pageId: i.page_id, // ⚠️ CRITICAL: Must preserve page_id for save cycle
    // Wheel linking fields
    linkedWheelId: i.linked_wheel_id,
    linkType: i.link_type,
  }));
};

/**
 * Create a new wheel
 */
export const createWheel = async (wheelData) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const defaultColors = wheelData.colors || ['#F5E6D3', '#A8DCD1', '#F4A896', '#B8D4E8'];
  const baseYear = parseInt(wheelData.year) || new Date().getFullYear();

  // Create wheel
  const { data: wheel, error: wheelError } = await supabase
    .from('year_wheels')
    .insert({
      user_id: user.id,
      title: wheelData.title || 'New wheel',
      year: baseYear,
      colors: defaultColors,
      show_week_ring: wheelData.showWeekRing !== undefined ? wheelData.showWeekRing : true,
      show_month_ring: wheelData.showMonthRing !== undefined ? wheelData.showMonthRing : true,
      show_ring_names: wheelData.showRingNames !== undefined ? wheelData.showRingNames : true,
      show_labels: wheelData.showLabels !== undefined ? wheelData.showLabels : false,
      week_ring_display_mode: wheelData.weekRingDisplayMode || 'week-numbers',
      team_id: wheelData.team_id || null,
    })
    .select()
    .single();

  if (wheelError) throw wheelError;

  // Ensure the wheel has a persisted default page + structure so items can be saved immediately
  const baseOrganizationData = wheelData.organizationData
    ? JSON.parse(JSON.stringify(wheelData.organizationData))
    : {
        rings: [
          {
            id: 'ring-1',
            name: 'Ring 1',
            type: 'inner',
            visible: true,
            orientation: 'vertical',
            data: Array.from({ length: 12 }, () => ['']),
          },
        ],
        activityGroups: [
          {
            id: 'ag-1',
            name: 'Planering',
            color: '#3B82F6',
            visible: true,
          },
        ],
        labels: [],
        items: [],
      };

  try {
    const initialPage = await createPage(wheel.id, {
      year: baseYear,
      title: `${baseYear}`,
      organizationData: baseOrganizationData,
      overrideColors: null,
      overrideShowWeekRing: null,
      overrideShowMonthRing: null,
      overrideShowRingNames: null,
    });

    const { ringIdMap, activityIdMap, labelIdMap } = await saveWheelData(
      wheel.id,
      baseOrganizationData,
      initialPage.id
    );

    const normalizedOrgData = {
      ...baseOrganizationData,
      rings: (baseOrganizationData.rings || []).map((ring) => ({
        ...ring,
        id: ringIdMap.get(ring.id) || ring.id,
      })),
      activityGroups: (baseOrganizationData.activityGroups || []).map((group) => ({
        ...group,
        id: activityIdMap.get(group.id) || group.id,
      })),
      labels: (baseOrganizationData.labels || []).map((label) => ({
        ...label,
        id: labelIdMap.get(label.id) || label.id,
      })),
      items: (baseOrganizationData.items || []).map((item) => ({
        ...item,
        ringId: ringIdMap.get(item.ringId) || item.ringId,
        activityId: activityIdMap.get(item.activityId) || item.activityId,
        labelId: item.labelId ? (labelIdMap.get(item.labelId) || item.labelId) : null,
      })),
    };

    await updatePage(initialPage.id, {
      organization_data: normalizedOrgData,
    });
  } catch (structureError) {
    console.error('[wheelService] Failed to initialize default wheel structure:', structureError);
    // Best-effort cleanup so we don't leave a broken wheel behind
    try {
      await supabase.from('year_wheels').delete().eq('id', wheel.id);
    } catch (cleanupError) {
      console.error('[wheelService] Failed to clean up wheel after initialization error:', cleanupError);
    }
    throw structureError;
  }

  return wheel.id;
};

/**
 * Update wheel metadata (title, year, colors, etc.)
 */
export const updateWheel = async (wheelId, updates) => {
  // console.log('=== updateWheel SERVICE CALLED ===');
  // console.log('[wheelService] wheelId:', wheelId);
  // console.log('[wheelService] updates:', updates);
  
  const updateData = {};
  
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.year !== undefined) updateData.year = parseInt(updates.year);
  if (updates.colors !== undefined) updateData.colors = updates.colors;
  if (updates.showWeekRing !== undefined) updateData.show_week_ring = updates.showWeekRing;
  if (updates.showMonthRing !== undefined) updateData.show_month_ring = updates.showMonthRing;
  if (updates.showRingNames !== undefined) updateData.show_ring_names = updates.showRingNames;
  if (updates.showLabels !== undefined) updateData.show_labels = updates.showLabels;
  if (updates.weekRingDisplayMode !== undefined) updateData.week_ring_display_mode = updates.weekRingDisplayMode;
  if (updates.is_public !== undefined) updateData.is_public = updates.is_public;

  // console.log('[wheelService] Final updateData being sent to DB:', updateData);

  const { error } = await supabase
    .from('year_wheels')
    .update(updateData)
    .eq('id', wheelId);

  if (error) {
    console.error('[wheelService] ERROR updating wheel:', error);
    throw error;
  }
  
  // console.log('[wheelService] ✓ Wheel updated successfully in database');
};

/**
 * Save complete wheel data (rings, activity groups, labels, items)
 * This is the main function for auto-save and manual save
 * 
 * CRITICAL: This function is now DEPRECATED for page-based wheels!
 * Use savePageData() instead which properly handles page_id scoping.
 * This is kept for backwards compatibility only.
 */
export const saveWheelData = async (wheelId, organizationData, pageId = null) => {
  if (!pageId) {
    console.error('[saveWheelData] pageId is required!');
    throw new Error('pageId is required for saveWheelData');
  }
  
  // 1. Sync rings and get ID mappings (old ID -> new UUID)
  const ringIdMap = await syncRings(wheelId, pageId, organizationData.rings || []);
  
  // 2. Sync activity groups and get ID mappings
  const activityIdMap = await syncActivityGroups(wheelId, pageId, organizationData.activityGroups || []);
  
  // 3. Sync labels and get ID mappings
  const labelIdMap = await syncLabels(wheelId, pageId, organizationData.labels || []);
  
  // 4. Sync items with ID mappings (scoped to pageId)
  await syncItems(wheelId, organizationData.items || [], ringIdMap, activityIdMap, labelIdMap, pageId);
  
  // Return ID maps so caller can update local state with new UUIDs
  return { ringIdMap, activityIdMap, labelIdMap };
};

/**
 * Sync rings (handles creates, updates, deletes)
 * Returns a map of old IDs to new database UUIDs
 * @param {string} wheelId - The wheel ID (rings are shared across all pages)
 * @param {string} pageId - Not used for rings (kept for API compatibility)
 */
const syncRings = async (wheelId, pageId, rings) => {
  const idMap = new Map(); // oldId -> newId
  
  // Fetch existing rings for THIS WHEEL with full data for name matching
  const { data: existingRings } = await supabase
    .from('wheel_rings')
    .select('id, name, type')
    .eq('wheel_id', wheelId);

  const existingIds = new Set(existingRings?.map(r => r.id) || []);
  
  // Create a map of existing rings by name+type for duplicate detection
  const existingByNameType = new Map();
  existingRings?.forEach(r => {
    const key = `${r.name.toLowerCase().trim()}|${r.type}`;
    existingByNameType.set(key, r);
  });
  
  // Only include IDs that are actual database UUIDs (not temporary client IDs)
  const currentIds = new Set(
    rings
      .map(r => r.id)
      .filter(id => 
        id && 
        !id.startsWith('ring-') && 
        !id.startsWith('inner-ring-') && 
        !id.startsWith('outer-ring-') &&
        existingIds.has(id) // Must exist in database
      )
  );

  // Delete removed rings
  const toDelete = [...existingIds].filter(id => !currentIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from('wheel_rings').delete().in('id', toDelete);
  }

  // Upsert rings
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    
    // First check if a ring with same name+type already exists (duplicate detection)
    const key = `${ring.name.toLowerCase().trim()}|${ring.type}`;
    const existingMatch = existingByNameType.get(key);
    
    const ringData = {
      wheel_id: wheelId,  // Primary FK - rings are shared across all pages
      name: ring.name,
      type: ring.type,
      color: null, // Don't save color - let it derive from palette based on ring_order
      visible: ring.visible !== undefined ? ring.visible : true,
      ring_order: i,
      orientation: ring.orientation || null,
    };

    if (existingMatch) {
      // Ring with same name+type already exists -> UPDATE and reuse UUID
      await supabase
        .from('wheel_rings')
        .update(ringData)
        .eq('id', existingMatch.id);
      
      // Map to existing UUID
      idMap.set(ring.id, existingMatch.id);
      currentIds.add(existingMatch.id);
      
      // Update month data for inner rings
      if (ring.type === 'inner' && ring.data) {
        await saveRingData(existingMatch.id, ring.data);
      }
    } else {
      // Check if this is a new ring (no ID, or has a temporary/non-UUID ID)
      const isNew = !ring.id || 
                    ring.id.startsWith('ring-') || 
                    ring.id.startsWith('inner-ring-') || 
                    ring.id.startsWith('outer-ring-') ||
                    !existingIds.has(ring.id); // Not in database
      
      if (isNew) {
        // Insert new ring
        const { data: newRing, error } = await supabase
          .from('wheel_rings')
          .insert(ringData)
          .select()
          .single();
        
        if (error) throw error;
        
        // Map old ID to new UUID
        idMap.set(ring.id, newRing.id);
        
        // Save month data for inner rings
        if (ring.type === 'inner' && ring.data) {
          await saveRingData(newRing.id, ring.data);
        }
      } else {
        // Update existing ring
        await supabase
          .from('wheel_rings')
          .update(ringData)
          .eq('id', ring.id);
        
        // Existing rings keep their ID
        idMap.set(ring.id, ring.id);
        
        // Update month data for inner rings
        if (ring.type === 'inner' && ring.data) {
          await saveRingData(ring.id, ring.data);
        }
      }
    }
  }
  
  return idMap;
};

/**
 * Save ring data (month-specific data for inner rings)
 */
const saveRingData = async (ringId, monthData) => {
  // Delete existing data
  await supabase.from('ring_data').delete().eq('ring_id', ringId);
  
  // Insert new data
  const dataToInsert = monthData
    .map((content, monthIndex) => ({
      ring_id: ringId,
      month_index: monthIndex,
      content: Array.isArray(content) ? content : [content],
    }))
    .filter(d => d.content.length > 0 && d.content[0] !== '');

  if (dataToInsert.length > 0) {
    const { error } = await supabase.from('ring_data').insert(dataToInsert);
    if (error) throw error;
  }
};

/**
 * Sync activity groups
 * Returns a map of old IDs to new database UUIDs
 * @param {string} wheelId - The wheel ID (groups are shared across all pages)
 * @param {string} pageId - Not used for groups (kept for API compatibility)
 */
const syncActivityGroups = async (wheelId, pageId, activityGroups) => {
  const idMap = new Map(); // oldId -> newId
  
  // Fetch existing for THIS WHEEL with full data for name matching
  const { data: existing} = await supabase
    .from('activity_groups')
    .select('id, name')
    .eq('wheel_id', wheelId);

  const existingIds = new Set(existing?.map(a => a.id) || []);
  
  // Create a map of existing groups by name for duplicate detection
  const existingByName = new Map();
  existing?.forEach(g => {
    const key = g.name.toLowerCase().trim();
    existingByName.set(key, g);
  });
  
  // Only include IDs that are actual database UUIDs
  const currentIds = new Set(
    activityGroups
      .map(a => a.id)
      .filter(id => id && !id.startsWith('group-') && existingIds.has(id))
  );

  // Delete removed
  const toDelete = [...existingIds].filter(id => !currentIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from('activity_groups').delete().in('id', toDelete);
  }

  // Upsert
  for (const group of activityGroups) {
    // Skip groups with empty or missing names
    if (!group.name || group.name.trim() === '') {
      console.warn('[wheelService] Skipping activity group with empty name:', group);
      continue;
    }
    
    // First check if a group with same name already exists (duplicate detection)
    const key = group.name.toLowerCase().trim();
    const existingMatch = existingByName.get(key);
    
    // Ensure color is valid 6-char hex (database constraint)
    // Color should always be set by frontend, default to blue if somehow missing
    const validColor = (group.color && /^#[0-9A-Fa-f]{6}$/.test(group.color)) 
      ? group.color 
      : '#3B82F6';
    
    const groupData = {
      wheel_id: wheelId,  // Primary FK - groups are shared across all pages
      name: group.name.trim(),
      color: validColor,
      visible: group.visible !== undefined ? group.visible : true,
    };

    if (existingMatch) {
      // Group with same name already exists -> UPDATE and reuse UUID
      await supabase.from('activity_groups').update(groupData).eq('id', existingMatch.id);
      idMap.set(group.id, existingMatch.id);
      currentIds.add(existingMatch.id);
    } else {
      const isNew = !group.id || group.id.startsWith('group-') || !existingIds.has(group.id);
      
      if (isNew) {
        const { data: newGroup, error } = await supabase
          .from('activity_groups')
          .insert(groupData)
          .select()
          .single();
        
        if (error) throw error;
        idMap.set(group.id, newGroup.id);
      } else {
        await supabase.from('activity_groups').update(groupData).eq('id', group.id);
        idMap.set(group.id, group.id);
      }
    }
  }
  
  return idMap;
};

/**
 * Sync labels
 * Returns a map of old IDs to new database UUIDs
 * @param {string} wheelId - The wheel ID (labels are shared across all pages)
 * @param {string} pageId - Not used for labels (kept for API compatibility)
 */
const syncLabels = async (wheelId, pageId, labels) => {
  const idMap = new Map(); // oldId -> newId
  
  // Fetch existing for THIS WHEEL with full data for name matching
  const { data: existing } = await supabase
    .from('labels')
    .select('id, name')
    .eq('wheel_id', wheelId);

  const existingIds = new Set(existing?.map(l => l.id) || []);
  
  // Create a map of existing labels by name for duplicate detection
  const existingByName = new Map();
  existing?.forEach(l => {
    const key = l.name.toLowerCase().trim();
    existingByName.set(key, l);
  });
  
  // Only include IDs that are actual database UUIDs
  const currentIds = new Set(
    labels
      .map(l => l.id)
      .filter(id => id && !id.startsWith('label-') && existingIds.has(id))
  );

  // Delete removed
  const toDelete = [...existingIds].filter(id => !currentIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from('labels').delete().in('id', toDelete);
  }

  // Upsert
  for (const label of labels) {
    // Skip labels with empty or missing names
    if (!label.name || label.name.trim() === '') {
      console.warn('[wheelService] Skipping label with empty name:', label);
      continue;
    }
    
    // First check if a label with same name already exists (duplicate detection)
    const key = label.name.toLowerCase().trim();
    const existingMatch = existingByName.get(key);
    
    const labelData = {
      wheel_id: wheelId,  // Primary FK - labels are shared across all pages
      name: label.name.trim(),
      color: null, // Don't save color - let it derive from palette based on index
      visible: label.visible !== undefined ? label.visible : true,
    };

    if (existingMatch) {
      // Label with same name already exists -> UPDATE and reuse UUID
      await supabase.from('labels').update(labelData).eq('id', existingMatch.id);
      idMap.set(label.id, existingMatch.id);
      currentIds.add(existingMatch.id);
    } else {
      const isNew = !label.id || label.id.startsWith('label-') || !existingIds.has(label.id);
      
      if (isNew) {
        const { data: newLabel, error } = await supabase
          .from('labels')
          .insert(labelData)
          .select()
          .single();
        
        if (error) throw error;
        idMap.set(label.id, newLabel.id);
      } else {
        await supabase.from('labels').update(labelData).eq('id', label.id);
        idMap.set(label.id, label.id);
      }
    }
  }
  
  return idMap;
};

/**
 * Sync items
 * Uses ID mappings to convert temporary IDs to database UUIDs
 */
export const syncItems = async (wheelId, items, ringIdMap, activityIdMap, labelIdMap, pageId = null) => {
  console.log(`[syncItems] Starting sync for wheelId=${wheelId}, pageId=${pageId}, items count=${items.length}`);
  
  // CRITICAL FIX: We need to compare against ALL existing items in the wheel,
  // not just those for the current page. This prevents accidental deletion
  // when items change page_id (e.g., multi-year activities getting re-assigned).
  const { data: existing } = await supabase
    .from('items')
    .select('id, name, page_id, start_date, end_date, created_at')
    .eq('wheel_id', wheelId);

  console.log(`[syncItems] Found ${existing?.length || 0} existing items in database`);
  if (existing && existing.length > 0) {
    existing.forEach((i, idx) => {
      console.log(`[syncItems]   Item ${idx + 1}: id=${i.id.substring(0, 8)}, name="${i.name}", pageId=${i.page_id.substring(0, 8)}, dates=${i.start_date} to ${i.end_date}, created=${i.created_at}`);
    });
  }

  const existingIds = new Set(existing?.map(i => i.id) || []);
  const currentIds = new Set(items.map(i => i.id).filter(id => id && !id.startsWith('item-')));

  console.log(`[syncItems] Items to sync (from organizationData):`);
  items.forEach((i, idx) => {
    console.log(`[syncItems]   Item ${idx + 1}: id=${i.id ? i.id.substring(0, 8) : 'NEW'}, name="${i.name}", pageId=${i.pageId ? i.pageId.substring(0, 8) : 'NONE'}, dates=${i.startDate} to ${i.endDate}`);
  });

  // CRITICAL: Only delete items that are truly removed from the wheel,
  // NOT items that just moved to a different page (multi-year activities).
  // We filter to only consider items from the CURRENT page for deletion.
  const existingPageItems = existing?.filter(i => i.page_id === pageId) || [];
  const existingPageIds = new Set(existingPageItems.map(i => i.id));
  
  // CRITICAL SAFETY: Never delete items created in the last 10 seconds
  // (they might be continuation items not yet in organizationData)
  const now = new Date();
  const recentlyCreated = new Set(
    existing
      ?.filter(i => {
        const createdAt = new Date(i.created_at);
        const ageSeconds = (now - createdAt) / 1000;
        const isRecent = ageSeconds < 10;
        if (isRecent) {
          console.log(`[syncItems]   Recently created: id=${i.id.substring(0, 8)}, name="${i.name}", age=${ageSeconds.toFixed(1)}s`);
        }
        return isRecent;
      })
      .map(i => i.id) || []
  );
  
  console.log(`[syncItems] Found ${recentlyCreated.size} recently created items that will be protected from deletion`);
  
  const toDelete = [...existingPageIds].filter(id => !currentIds.has(id) && !recentlyCreated.has(id));
  
  console.log(`[syncItems] Items on current page (${pageId?.substring(0, 8)}): ${existingPageItems.length}`);
  console.log(`[syncItems] Items to DELETE: ${toDelete.length}`, toDelete.map(id => id.substring(0, 8)));
  
  if (toDelete.length > 0) {
    await supabase.from('items').delete().in('id', toDelete);
    console.log(`[syncItems] DELETED ${toDelete.length} items from database`);
  }

  // Fetch all pages for this wheel to map years to page IDs
  const { data: allPages } = await supabase
    .from('wheel_pages')
    .select('id, year')
    .eq('wheel_id', wheelId)
    .order('year');
  
  // Create a map of year -> page_id for quick lookup
  const yearToPageId = new Map();
  if (allPages) {
    allPages.forEach(page => yearToPageId.set(page.year, page.id));
  }
  
  // Upsert items
  for (const item of items) {
    // Check if item exists in database (not just if it has an ID)
    const isNew = !item.id || item.id.startsWith('item-') || !existingIds.has(item.id);
    
    // Map old IDs to new database UUIDs
    let ringId = ringIdMap.get(item.ringId) || item.ringId;
    let activityId = activityIdMap.get(item.activityId) || item.activityId;
    let labelId = item.labelId ? (labelIdMap.get(item.labelId) || item.labelId) : null;
    
    // Validate that ring_id and activity_id exist
    const isValidUUID = (id) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // If IDs are still not valid UUIDs, skip this item
    if (!isValidUUID(ringId)) {
      console.warn(`Skipping item "${item.name}" - could not resolve ring_id: ${item.ringId} -> ${ringId}`);
      continue;
    }
    
    if (!isValidUUID(activityId)) {
      console.warn(`Skipping item "${item.name}" - could not resolve activity_id: ${item.activityId} -> ${activityId}`);
      continue;
    }
    
    // Validate labelId if present
    if (labelId && !isValidUUID(labelId)) {
      console.warn(`Item "${item.name}" - could not resolve label_id, setting to null: ${item.labelId} -> ${labelId}`);
      labelId = null;
    }
    
    // CRITICAL FIX: Determine correct page_id based on item's start date year
    // This prevents items from getting assigned to the wrong page
    let determinedPageId = item.pageId; // Explicit pageId takes precedence
    
    if (!determinedPageId && item.startDate) {
      // Calculate page_id from start date year
      const itemYear = new Date(item.startDate).getFullYear();
      determinedPageId = yearToPageId.get(itemYear);
      
      if (!determinedPageId) {
        console.warn(`No page found for year ${itemYear} for item "${item.name}". Using fallback pageId parameter.`);
        determinedPageId = pageId; // Last resort fallback
      }
    } else if (!determinedPageId) {
      // No pageId and no startDate - use fallback
      determinedPageId = pageId;
    }
    
    if (!determinedPageId) {
      console.warn(`Cannot determine page_id for item "${item.name}". Skipping.`);
      continue;
    }
    
    const itemData = {
      wheel_id: wheelId,
      ring_id: ringId,
      activity_id: activityId,
      label_id: labelId || null,
      name: item.name,
      start_date: item.startDate,
      end_date: item.endDate,
      time: item.time || null,
      page_id: determinedPageId, // ✅ Now properly determined from dates
    };
    
    try {
      if (isNew) {
        // DEDUPLICATION: Check if item with same key attributes already exists
        const { data: existingItem } = await supabase
          .from('items')
          .select('id')
          .eq('wheel_id', wheelId)
          .eq('page_id', determinedPageId)
          .eq('name', item.name)
          .eq('start_date', item.startDate)
          .eq('end_date', item.endDate)
          .eq('ring_id', ringId)
          .single();
        
        if (existingItem) {
          console.log(`Item "${item.name}" already exists (${item.startDate} to ${item.endDate}), skipping insert.`);
          continue; // Skip duplicate insert
        }
        
        const { error } = await supabase.from('items').insert(itemData);
        if (error) {
          console.error(`Error inserting item "${item.name}":`, error);
          throw error;
        }
      } else {
        const { error } = await supabase.from('items').update(itemData).eq('id', item.id);
        if (error) {
          console.error(`Error updating item "${item.name}":`, error);
          throw error;
        }
      }
    } catch (err) {
      console.error('Failed to save item:', item, err);
      // Continue with next item instead of failing completely
    }
  }
};

/**
 * Update a single item in the database (optimized for drag operations)
 * @param {string} wheelId - The wheel ID
 * @param {string} pageId - The page ID
 * @param {object} item - The item to update
 * @param {Map} ringIdMap - Ring ID mappings (oldId -> newId)
 * @param {Map} activityIdMap - Activity ID mappings (oldId -> newId)
 * @param {Map} labelIdMap - Label ID mappings (oldId -> newId)
 * @returns {Promise<void>}
 */
const mapDbItemToClient = (dbItem) => {
  if (!dbItem) return null;

  return {
    id: dbItem.id,
    ringId: dbItem.ring_id,
    activityId: dbItem.activity_id,
    labelId: dbItem.label_id,
    name: dbItem.name,
    startDate: dbItem.start_date,
    endDate: dbItem.end_date,
    time: dbItem.time,
    description: dbItem.description,
    pageId: dbItem.page_id,
    linkedWheelId: dbItem.linked_wheel_id,
    linkType: dbItem.link_type,
    source: dbItem.source,
    externalId: dbItem.external_id,
    syncMetadata: dbItem.sync_metadata,
  };
};

export const saveWheelSnapshot = async (wheelId, snapshot) => {
  if (!wheelId) throw new Error('wheelId is required for saveWheelSnapshot');
  if (!snapshot) throw new Error('snapshot is required for saveWheelSnapshot');

  const {
    metadata = {},
    globalOrganizationData = {},
    pages = [],
  } = snapshot;

  const sanitizedMetadata = metadata && typeof metadata === 'object' ? metadata : {};

  if (Object.keys(sanitizedMetadata).length > 0) {
    await updateWheel(wheelId, sanitizedMetadata);
  }

  const baseRings = Array.isArray(globalOrganizationData.rings)
    ? globalOrganizationData.rings.map((ring) => ({ ...ring }))
    : [];
  const baseActivityGroups = Array.isArray(globalOrganizationData.activityGroups)
    ? globalOrganizationData.activityGroups.map((group) => ({ ...group }))
    : [];
  const baseLabels = Array.isArray(globalOrganizationData.labels)
    ? globalOrganizationData.labels.map((label) => ({ ...label }))
    : [];

  const ringIdMap = await syncRings(wheelId, null, baseRings);
  const activityIdMap = await syncActivityGroups(wheelId, null, baseActivityGroups);
  const labelIdMap = await syncLabels(wheelId, null, baseLabels);

  const normalizedPages = Array.isArray(pages) ? pages : [];

  const ensureItemId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `item-${crypto.randomUUID()}`;
    }
    return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  for (const page of normalizedPages) {
    if (!page || !page.id || !page.organizationData) {
      continue;
    }

    const rawItems = Array.isArray(page.organizationData.items)
      ? page.organizationData.items
      : [];

    const sanitizedItems = rawItems
      .filter(Boolean)
      .map((item) => {
        const { _remoteUpdate, _remoteUser, _remoteTimestamp, ...cleanItem } = item;
        const mappedRingId = ringIdMap.get(cleanItem.ringId) || cleanItem.ringId;
        const mappedActivityId = activityIdMap.get(cleanItem.activityId) || cleanItem.activityId;
        const mappedLabelId = cleanItem.labelId ? (labelIdMap.get(cleanItem.labelId) || cleanItem.labelId) : null;

        return {
          ...cleanItem,
          id: cleanItem.id || ensureItemId(),
          pageId: cleanItem.pageId || page.id,
          ringId: mappedRingId,
          activityId: mappedActivityId,
          labelId: mappedLabelId,
        };
      });

    await syncItems(
      wheelId,
      sanitizedItems,
      ringIdMap,
      activityIdMap,
      labelIdMap,
      page.id
    );
  }

  const { data: persistedItems, error: persistedItemsError } = await supabase
    .from('items')
    .select('*')
    .eq('wheel_id', wheelId);

  if (persistedItemsError) {
    throw persistedItemsError;
  }

  const itemsByPage = {};
  (persistedItems || []).forEach((dbItem) => {
    const clientItem = mapDbItemToClient(dbItem);
    if (!clientItem) {
      return;
    }

    if (!itemsByPage[clientItem.pageId]) {
      itemsByPage[clientItem.pageId] = [];
    }

    itemsByPage[clientItem.pageId].push(clientItem);
  });

  const normalizedRings = baseRings.map((ring) => ({
    ...ring,
    id: ringIdMap.get(ring.id) || ring.id,
  }));

  const normalizedActivityGroups = baseActivityGroups.map((group) => ({
    ...group,
    id: activityIdMap.get(group.id) || group.id,
  }));

  const normalizedLabels = baseLabels.map((label) => ({
    ...label,
    id: labelIdMap.get(label.id) || label.id,
  }));

  for (const page of normalizedPages) {
    if (!page || !page.id || !page.organizationData) {
      continue;
    }

    await updatePage(page.id, {
      organization_data: {
        rings: normalizedRings,
        activityGroups: normalizedActivityGroups,
        labels: normalizedLabels,
        items: itemsByPage[page.id] || [],
      },
      year: page.year ?? null,
    });
  }

  return {
    ringIdMap,
    activityIdMap,
    labelIdMap,
    itemsByPage,
  };
};

export const updateSingleItem = async (wheelId, pageId, item, ringIdMap = new Map(), activityIdMap = new Map(), labelIdMap = new Map()) => {
  console.log(`[updateSingleItem] wheelId=${wheelId?.substring(0,8)}, pageId=${pageId?.substring(0,8)}, item.pageId=${item.pageId?.substring(0,8)}, item.name="${item.name}", dates=${item.startDate} to ${item.endDate}`);
  
  // Map old IDs to new database UUIDs
  let ringId = ringIdMap.get(item.ringId) || item.ringId;
  let activityId = activityIdMap.get(item.activityId) || item.activityId;
  let labelId = item.labelId ? (labelIdMap.get(item.labelId) || item.labelId) : null;
  
  // Validate that ring_id and activity_id exist
  const isValidUUID = (id) => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  
  // If IDs are still not valid UUIDs, throw error
  if (!isValidUUID(ringId)) {
    throw new Error(`Invalid ring_id for item "${item.name}": ${item.ringId} -> ${ringId}`);
  }
  
  if (!isValidUUID(activityId)) {
    throw new Error(`Invalid activity_id for item "${item.name}": ${item.activityId} -> ${activityId}`);
  }
  
  // Validate labelId if present
  if (labelId && !isValidUUID(labelId)) {
    console.warn(`Item "${item.name}" - invalid label_id, setting to null: ${item.labelId} -> ${labelId}`);
    labelId = null;
  }
  
  const determinedPageId = item.pageId || pageId || null;
  console.log(`[updateSingleItem] Using page_id: ${determinedPageId?.substring(0,8)} (item.pageId=${item.pageId?.substring(0,8)}, pageId param=${pageId?.substring(0,8)})`);
  
  const itemData = {
    wheel_id: wheelId,
    ring_id: ringId,
    activity_id: activityId,
    label_id: labelId || null,
    name: item.name,
    start_date: item.startDate,
    end_date: item.endDate,
    time: item.time || null,
    description: item.description || null,
    page_id: determinedPageId,
    // Wheel linking fields (optional)
    linked_wheel_id: item.linkedWheelId || null,
    link_type: item.linkType || null,
  };
  
  
  // Check if item exists in database
  const isNew = !item.id || item.id.startsWith('item-');
  
  console.log(`[updateSingleItem] isNew=${isNew}, item.id=${item.id?.substring(0,8) || 'NONE'}`);
  
  if (isNew) {
    console.log(`[updateSingleItem] INSERTING new item "${item.name}" with page_id=${determinedPageId?.substring(0,8)}`);
    const { data, error } = await supabase
      .from('items')
      .insert(itemData)
      .select('*')
      .single();
    if (error) {
      console.error(`Error inserting item "${item.name}":`, error);
      throw error;
    }
    console.log(`[updateSingleItem] INSERT successful, new id=${data.id.substring(0,8)}, page_id=${data.page_id.substring(0,8)}`);
    return mapDbItemToClient(data);
  }

  console.log(`[updateSingleItem] UPDATING item "${item.name}" id=${item.id.substring(0,8)} with page_id=${determinedPageId?.substring(0,8)}`);
  const { data, error } = await supabase
    .from('items')
    .update(itemData)
    .eq('id', item.id)
    .select('*')
    .single();
  if (error) {
    console.error(`Error updating item "${item.name}":`, error);
    throw error;
  }
  console.log(`[updateSingleItem] UPDATE successful, page_id=${data.page_id.substring(0,8)}`);

  return mapDbItemToClient(data);
};

export const deleteSingleItem = async (itemId) => {
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error(`Error deleting item ${itemId}:`, error);
    throw error;
  }
};

export { mapDbItemToClient };

/**
 * Delete a wheel (and all related data via CASCADE)
 */
export const deleteWheel = async (wheelId) => {
  const { error } = await supabase
    .from('year_wheels')
    .delete()
    .eq('id', wheelId);

  if (error) throw error;
};

/**
 * Duplicate a wheel
 */
export const duplicateWheel = async (wheelId) => {
  const wheelData = await fetchWheel(wheelId);
  wheelData.title = `${wheelData.title} (kopia)`;
  const newWheelId = await createWheel(wheelData);
  return newWheelId;
};

/**
 * Generate and set share token for a wheel
 */
export const generateShareLink = async (wheelId) => {
  const { data, error } = await supabase.rpc('generate_share_token');
  if (error) throw error;
  
  const token = data;
  
  await supabase
    .from('year_wheels')
    .update({ 
      is_public: true, 
      share_token: token 
    })
    .eq('id', wheelId);

  return token;
};

/**
 * Fetch wheel by share token (public access)
 */
export const fetchWheelByShareToken = async (token) => {
  const { data: wheel, error } = await supabase
    .from('year_wheels')
    .select('id')
    .eq('share_token', token)
    .eq('is_public', true)
    .single();

  if (error) throw error;
  return fetchWheel(wheel.id);
};

// =============================================
// VERSION CONTROL FUNCTIONS
// =============================================

/**
 * Create a new version snapshot of a wheel
 */
export const createVersion = async (wheelId, snapshotData, description = null, isAutoSave = false) => {
  try {
    // Get next version number
    const { data: versionNumber, error: versionError } = await supabase
      .rpc('get_next_version_number', { p_wheel_id: wheelId });

    if (versionError) throw versionError;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Create version
    const { data, error } = await supabase
      .from('wheel_versions')
      .insert({
        wheel_id: wheelId,
        version_number: versionNumber,
        snapshot_data: snapshotData,
        change_description: description,
        is_auto_save: isAutoSave,
        created_by: user?.id,
        metadata: {
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) throw error;

    // Cleanup old versions (keep last 100)
    await supabase.rpc('cleanup_old_versions', { 
      p_wheel_id: wheelId, 
      p_keep_count: 100 
    });

    return data;
  } catch (error) {
    console.error('Error creating version:', error);
    throw error;
  }
};

/**
 * List all versions for a wheel
 */
export const listVersions = async (wheelId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('wheel_versions')
      .select(`
        id,
        version_number,
        created_at,
        change_description,
        is_auto_save,
        created_by,
        metadata
      `)
      .eq('wheel_id', wheelId)
      .order('version_number', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Fetch user details for each version
    const userIds = [...new Set(data.map(v => v.created_by).filter(Boolean))];
    
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (!usersError && users) {
        // Map user data to versions
        const userMap = Object.fromEntries(users.map(u => [u.id, u]));
        return data.map(version => ({
          ...version,
          user: version.created_by ? userMap[version.created_by] : null
        }));
      }
    }

    return data.map(v => ({ ...v, user: null }));
  } catch (error) {
    console.error('Error listing versions:', error);
    throw error;
  }
};

/**
 * Get a specific version's snapshot data
 */
export const getVersion = async (versionId) => {
  try {
    const { data, error } = await supabase
      .from('wheel_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting version:', error);
    throw error;
  }
};

/**
 * Restore a wheel to a previous version
 * Returns the snapshot data to be applied
 */
export const restoreVersion = async (wheelId, versionId) => {
  try {
    // Get the version snapshot
    const { data: version, error } = await supabase
      .from('wheel_versions')
      .select('snapshot_data, version_number')
      .eq('id', versionId)
      .eq('wheel_id', wheelId)
      .single();

    if (error) throw error;

    return {
      data: version.snapshot_data,
      versionNumber: version.version_number
    };
  } catch (error) {
    console.error('Error restoring version:', error);
    throw error;
  }
};

/**
 * Delete a specific version
 */
export const deleteVersion = async (versionId) => {
  try {
    const { error } = await supabase
      .from('wheel_versions')
      .delete()
      .eq('id', versionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting version:', error);
    throw error;
  }
};

/**
 * Get version count for a wheel
 */
export const getVersionCount = async (wheelId) => {
  try {
    const { count, error} = await supabase
      .from('wheel_versions')
      .select('*', { count: 'exact', head: true })
      .eq('wheel_id', wheelId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting version count:', error);
    return 0;
  }
};

// =============================================
// MULTI-PAGE WHEEL FUNCTIONS
// =============================================

/**
 * Fetch all pages for a wheel
 */
export const fetchPages = async (wheelId) => {
  try {
    const { data, error } = await supabase
      .from('wheel_pages')
      .select('*')
      .eq('wheel_id', wheelId)
      .order('page_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pages:', error);
    throw error;
  }
};

/**
 * Fetch a single page
 */
export const fetchPage = async (pageId) => {
  try {
    const { data, error } = await supabase
      .from('wheel_pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching page:', error);
    throw error;
  }
};

/**
 * Create a new page
 */
export const createPage = async (wheelId, pageData) => {
  try {
    // Get next page order
    const { data: nextOrder, error: orderError } = await supabase
      .rpc('get_next_page_order', { p_wheel_id: wheelId });

    if (orderError) throw orderError;

    // Create page
    const { data, error } = await supabase
      .from('wheel_pages')
      .insert({
        wheel_id: wheelId,
        page_order: nextOrder,
        year: pageData.year || new Date().getFullYear(),
        title: pageData.title || `Sida ${nextOrder}`,
        organization_data: pageData.organizationData || {
          rings: [],
          activityGroups: [],
          labels: [],
          items: []
        },
        override_colors: pageData.overrideColors || null,
        override_show_week_ring: pageData.overrideShowWeekRing || null,
        override_show_month_ring: pageData.overrideShowMonthRing || null,
        override_show_ring_names: pageData.overrideShowRingNames || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating page:', error);
    throw error;
  }
};

/**
 * Update a page
 */
export const updatePage = async (pageId, updates) => {
  try {
    const { data, error } = await supabase
      .from('wheel_pages')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', pageId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating page:', error);
    throw error;
  }
};

/**
 * Delete a page
 */
export const deletePage = async (pageId) => {
  try {
    const { error } = await supabase
      .from('wheel_pages')
      .delete()
      .eq('id', pageId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting page:', error);
    throw error;
  }
};

/**
 * Duplicate a page using the database function
 */
export const duplicatePage = async (pageId) => {
  try {
    const { data: newPageId, error } = await supabase
      .rpc('duplicate_wheel_page', { p_page_id: pageId });

    if (error) throw error;

    // Fetch the newly created page
    return await fetchPage(newPageId);
  } catch (error) {
    console.error('Error duplicating page:', error);
    throw error;
  }
};

/**
 * Reorder pages
 */
export const reorderPages = async (wheelId, pageOrders) => {
  try {
    // Update each page's order
    const updates = pageOrders.map(({ id, page_order }) => 
      supabase
        .from('wheel_pages')
        .update({ page_order })
        .eq('id', id)
    );

    const results = await Promise.all(updates);
    
    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      throw errors[0].error;
    }

    return await fetchPages(wheelId);
  } catch (error) {
    console.error('Error reordering pages:', error);
    throw error;
  }
};

/**
 * Get page count for a wheel
 */
export const getPageCount = async (wheelId) => {
  try {
    const { count, error } = await supabase
      .from('wheel_pages')
      .select('*', { count: 'exact', head: true })
      .eq('wheel_id', wheelId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting page count:', error);
    return 0;
  }
};

/**
 * Fetch all template wheels (public templates marked by admins)
 * Can be called by anyone (including unauthenticated users)
 */
export const fetchTemplateWheels = async () => {
  try {
    const { data, error } = await supabase
      .from('year_wheels')
      .select(`
        *,
        teams (
          id,
          name
        )
      `)
      .eq('is_template', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching template wheels:', error);
    return [];
  }
};

/**
 * Toggle template status for a wheel (admin only)
 */
export const toggleTemplateStatus = async (wheelId, isTemplate) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    throw new Error('Only admins can set template status');
  }

  const { data, error } = await supabase
    .from('year_wheels')
    .update({ 
      is_template: isTemplate,
      is_public: isTemplate, // Templates must be public to be viewable
      show_on_landing: isTemplate // Automatically show templates on landing page
    })
    .eq('id', wheelId)
    .select()
    .single();

  if (error) {
    console.error('[toggleTemplateStatus] Error:', error);
    throw error;
  }
  
  console.log('[toggleTemplateStatus] Success:', {
    wheelId,
    is_template: data.is_template,
    is_public: data.is_public,
    show_on_landing: data.show_on_landing
  });
  
  return data;
};

/**
 * Toggle show_on_landing status for a template wheel (admin only)
 */
export const toggleShowOnLanding = async (wheelId, showOnLanding) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    throw new Error('Only admins can control landing page visibility');
  }

  const { data, error } = await supabase
    .from('year_wheels')
    .update({ show_on_landing: showOnLanding })
    .eq('id', wheelId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Fetch templates for landing page (public access)
 * Returns only templates with show_on_landing = true
 */
export const fetchLandingPageTemplates = async () => {
  try {
    const { data, error } = await supabase
      .from('year_wheels')
      .select(`
        id,
        title,
        year,
        colors,
        created_at
      `)
      .eq('is_template', true)
      .eq('show_on_landing', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching landing page templates:', error);
    return [];
  }
};

/**
 * Check if current user is admin
 */
export const checkIsAdmin = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    return profile?.is_admin || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// ============================================================================
// WHEEL LINKING FUNCTIONS
// ============================================================================

/**
 * Fetch all wheels accessible to current user (for linking dropdown)
 * Includes: owned wheels, team wheels, and public wheels
 * Excludes templates and the current wheel
 * @param {string} currentWheelId - ID of the current wheel to exclude from results
 */
export const fetchAccessibleWheels = async (currentWheelId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user's own wheels
    const { data: ownWheels, error: ownError } = await supabase
      .from('year_wheels')
      .select('id, title, year, user_id, team_id')
      .eq('user_id', user.id)
      .eq('is_template', false)
      .order('title', { ascending: true });

    if (ownError) throw ownError;

    // Get team wheels
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id);

    let teamWheels = [];
    if (memberships && memberships.length > 0) {
      const teamIds = memberships.map(m => m.team_id);
      const { data, error } = await supabase
        .from('year_wheels')
        .select('id, title, year, user_id, team_id')
        .in('team_id', teamIds)
        .not('user_id', 'eq', user.id) // Exclude own wheels (already in ownWheels)
        .order('title', { ascending: true });

      if (!error) teamWheels = data || [];
    }

    // Combine and deduplicate
    const allWheels = [...(ownWheels || []), ...teamWheels];
    const uniqueWheels = Array.from(
      new Map(allWheels.map(w => [w.id, w])).values()
    );

    // Exclude the current wheel
    return uniqueWheels.filter(w => w.id !== currentWheelId);
  } catch (error) {
    console.error('Error fetching accessible wheels:', error);
    throw error;
  }
};

/**
 * Set or update a wheel link on an item
 * 
 * Link Types:
 * - 'reference': Informational link to related wheel (default)
 *   Example: "Project Alpha" links to detailed project wheel
 * - 'dependency': Future feature - indicates dependency relationship
 *   Example: Item depends on completion of activities in linked wheel
 * 
 * @param {string} itemId - Item UUID (must be valid database UUID)
 * @param {string} linkedWheelId - Target wheel UUID to link to
 * @param {string} linkType - Type of link ('reference' | 'dependency')
 * @returns {Promise<void>}
 * @throws {Error} If user not authenticated, invalid link type, or no access to target wheel
 */
export const setItemWheelLink = async (itemId, linkedWheelId, linkType = 'reference') => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Validate link type
    if (!['reference', 'dependency'].includes(linkType)) {
      throw new Error(`Invalid link type: ${linkType}`);
    }

    // Verify user has access to target wheel (using helper function from migration)
    const { data: hasAccess, error: accessError } = await supabase
      .rpc('can_link_to_wheel', { 
        target_wheel_id: linkedWheelId, 
        user_id: user.id 
      });

    if (accessError) {
      console.error('Error checking wheel access:', accessError);
      throw new Error('Unable to verify access to target wheel');
    }

    if (!hasAccess) {
      throw new Error('You do not have access to the selected wheel');
    }

    // Update the item with the link
    const { error: updateError } = await supabase
      .from('items')
      .update({ 
        linked_wheel_id: linkedWheelId,
        link_type: linkType,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (updateError) throw updateError;

  } catch (error) {
    console.error('Error setting item wheel link:', error);
    throw error;
  }
};

/**
 * Remove a wheel link from an item
 * @param {string} itemId - Item UUID
 * @returns {Promise<void>}
 */
export const removeItemWheelLink = async (itemId) => {
  try {
    const { error } = await supabase
      .from('items')
      .update({ 
        linked_wheel_id: null,
        link_type: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing item wheel link:', error);
    throw error;
  }
};

/**
 * Fetch basic info about a linked wheel (for preview/tooltip)
 * @param {string} wheelId - Wheel UUID
 * @returns {Promise<Object>} Wheel info (id, title, year)
 */
export const fetchLinkedWheelInfo = async (wheelId) => {
  try {
    const { data, error } = await supabase
      .from('year_wheels')
      .select('id, title, year, team_id')
      .eq('id', wheelId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching linked wheel info:', error);
    return null;
  }
};

/**
 * Check for circular references when linking wheels
 * Prevents: Wheel A -> Wheel B -> Wheel A (infinite loop)
 * @param {string} sourceWheelId - The wheel containing the item
 * @param {string} targetWheelId - The wheel to link to
 * @param {number} maxDepth - Maximum allowed depth (default: 3)
 * @returns {Promise<boolean>} True if safe to link, false if circular
 */
export const checkCircularReference = async (sourceWheelId, targetWheelId, maxDepth = 3) => {
  try {
    // BFS to detect circular references
    const visited = new Set([sourceWheelId]);
    let queue = [{ wheelId: targetWheelId, depth: 0 }];

    while (queue.length > 0) {
      const { wheelId, depth } = queue.shift();

      // Check depth limit
      if (depth >= maxDepth) {
        console.warn(`Link depth exceeds limit (${maxDepth})`);
        return false; // Too deep
      }

      // Check if we've encountered the source wheel (circular!)
      if (wheelId === sourceWheelId) {
        console.warn('Circular reference detected');
        return false;
      }

      // Already visited
      if (visited.has(wheelId)) continue;
      visited.add(wheelId);

      // Fetch all items in this wheel that link to other wheels
      const { data: linkedItems, error } = await supabase
        .from('items')
        .select('linked_wheel_id')
        .eq('wheel_id', wheelId)
        .not('linked_wheel_id', 'is', null);

      if (error) throw error;

      // Add linked wheels to queue
      if (linkedItems) {
        linkedItems.forEach(item => {
          if (item.linked_wheel_id && !visited.has(item.linked_wheel_id)) {
            queue.push({ wheelId: item.linked_wheel_id, depth: depth + 1 });
          }
        });
      }
    }

    return true; // No circular reference found
  } catch (error) {
    console.error('Error checking circular reference:', error);
    return false; // Err on the side of caution
  }
};
