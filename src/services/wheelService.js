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
    .order('created_at', { ascending: false }); // Sort by creation date (newest first)

  if (error) throw error;
  return data;
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
    title: wheel.title,
    year: wheel.year.toString(),
    colors: wheelColors,
    is_public: wheel.is_public,
    showWeekRing: wheel.show_week_ring,
    showMonthRing: wheel.show_month_ring,
    showRingNames: wheel.show_ring_names,
    // TODO: Add show_labels column to database before enabling this
    // showLabels: wheel.show_labels !== undefined ? wheel.show_labels : false,
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
 */
export const fetchPageData = async (pageId) => {
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('*')
    .eq('page_id', pageId);

  if (itemsError) throw itemsError;

  return items.map(i => ({
    id: i.id,
    ringId: i.ring_id,
    activityId: i.activity_id,
    labelId: i.label_id,
    name: i.name,
    startDate: i.start_date,
    endDate: i.end_date,
    time: i.time,
    pageId: i.page_id, // ⚠️ CRITICAL: Must preserve page_id for save cycle
  }));
};

/**
 * Create a new wheel
 */
export const createWheel = async (wheelData) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Create wheel
  const { data: wheel, error: wheelError } = await supabase
    .from('year_wheels')
    .insert({
      user_id: user.id,
      title: wheelData.title || 'New wheel',
      year: parseInt(wheelData.year) || new Date().getFullYear(),
      colors: wheelData.colors || ['#F5E6D3', '#A8DCD1', '#F4A896', '#B8D4E8'],
      show_week_ring: wheelData.showWeekRing !== undefined ? wheelData.showWeekRing : true,
      show_month_ring: wheelData.showMonthRing !== undefined ? wheelData.showMonthRing : true,
      show_ring_names: wheelData.showRingNames !== undefined ? wheelData.showRingNames : true,
      // TODO: Add show_labels column to database before enabling this
      // show_labels: wheelData.showLabels !== undefined ? wheelData.showLabels : false,
      team_id: wheelData.team_id || null,
    })
    .select()
    .single();

  if (wheelError) throw wheelError;

  // Create default ring and activity group if provided
  if (wheelData.organizationData) {
    await saveWheelData(wheel.id, wheelData.organizationData);
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
  // TODO: Add show_labels column to database before enabling this
  // if (updates.showLabels !== undefined) updateData.show_labels = updates.showLabels;
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
  
  // Fetch existing rings for THIS WHEEL (rings are shared, not per-page!)
  const { data: existingRings } = await supabase
    .from('wheel_rings')
    .select('id')
    .eq('wheel_id', wheelId);

  const existingIds = new Set(existingRings?.map(r => r.id) || []);
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
    // Check if this is a new ring (no ID, or has a temporary/non-UUID ID)
    const isNew = !ring.id || 
                  ring.id.startsWith('ring-') || 
                  ring.id.startsWith('inner-ring-') || 
                  ring.id.startsWith('outer-ring-') ||
                  !existingIds.has(ring.id); // Not in database
    
    const ringData = {
      wheel_id: wheelId,  // Primary FK - rings are shared across all pages
      name: ring.name,
      type: ring.type,
      color: null, // Don't save color - let it derive from palette based on ring_order
      visible: ring.visible !== undefined ? ring.visible : true,
      ring_order: i,
      orientation: ring.orientation || null,
    };

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
  
  // Fetch existing for THIS WHEEL (groups are shared, not per-page!)
  const { data: existing} = await supabase
    .from('activity_groups')
    .select('id')
    .eq('wheel_id', wheelId);

  const existingIds = new Set(existing?.map(a => a.id) || []);
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
    
    const isNew = !group.id || group.id.startsWith('group-') || !existingIds.has(group.id);
    const groupData = {
      wheel_id: wheelId,  // Primary FK - groups are shared across all pages
      name: group.name.trim(),
      color: group.color || null, // Save the color from the group
      visible: group.visible !== undefined ? group.visible : true,
    };

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
  
  // Fetch existing for THIS WHEEL (labels are shared, not per-page!)
  const { data: existing } = await supabase
    .from('labels')
    .select('id')
    .eq('wheel_id', wheelId);

  const existingIds = new Set(existing?.map(l => l.id) || []);
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
    
    const isNew = !label.id || label.id.startsWith('label-') || !existingIds.has(label.id);
    const labelData = {
      wheel_id: wheelId,  // Primary FK - labels are shared across all pages
      name: label.name.trim(),
      color: null, // Don't save color - let it derive from palette based on index
      visible: label.visible !== undefined ? label.visible : true,
    };

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
  
  return idMap;
};

/**
 * Sync items
 * Uses ID mappings to convert temporary IDs to database UUIDs
 */
const syncItems = async (wheelId, items, ringIdMap, activityIdMap, labelIdMap, pageId = null) => {
  // Fetch existing items - SCOPED TO PAGE if pageId provided
  let query = supabase
    .from('items')
    .select('id')
    .eq('wheel_id', wheelId);
  
  // CRITICAL: If pageId is provided, only sync items for that page
  if (pageId) {
    query = query.eq('page_id', pageId);
  }
  
  const { data: existing } = await query;

  const existingIds = new Set(existing?.map(i => i.id) || []);
  const currentIds = new Set(items.map(i => i.id).filter(id => id && !id.startsWith('item-')));

  // Delete removed items (only within the scoped page if pageId provided)
  const toDelete = [...existingIds].filter(id => !currentIds.has(id));
  if (toDelete.length > 0) {
    console.log(`[syncItems] Deleting ${toDelete.length} items from ${pageId ? `page ${pageId}` : 'wheel'}`);
    await supabase.from('items').delete().in('id', toDelete);
  }

  // Upsert items
  for (const item of items) {
    const isNew = !item.id || item.id.startsWith('item-');
    
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
    
    const itemData = {
      wheel_id: wheelId,
      ring_id: ringId,
      activity_id: activityId,
      label_id: labelId || null,
      name: item.name,
      start_date: item.startDate,
      end_date: item.endDate,
      time: item.time || null,
      page_id: item.pageId || pageId || null, // ⚠️ Use item's pageId or fall back to function parameter
    };

    try {
      if (isNew) {
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
