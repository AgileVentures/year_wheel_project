/**
 * Wheel Service
 * 
 * Handles all CRUD operations for year wheels and their related data.
 * Uses Supabase client for database operations.
 */

import { supabase } from '../lib/supabase';

/**
 * Fetch all wheels for the current user
 */
export const fetchUserWheels = async () => {
  const { data, error } = await supabase
    .from('year_wheels')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * Fetch a single wheel with all related data
 */
export const fetchWheel = async (wheelId) => {
  // Fetch wheel
  const { data: wheel, error: wheelError } = await supabase
    .from('year_wheels')
    .select('*')
    .eq('id', wheelId)
    .single();

  if (wheelError) throw wheelError;

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

  // Fetch items
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('*')
    .eq('wheel_id', wheelId);

  if (itemsError) throw itemsError;

  // Transform to match current app structure
  return {
    id: wheel.id,
    title: wheel.title,
    year: wheel.year.toString(),
    colors: wheel.colors,
    showWeekRing: wheel.show_week_ring,
    showMonthRing: wheel.show_month_ring,
    showRingNames: wheel.show_ring_names,
    organizationData: {
      rings: rings.map(ring => {
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
        
        // Outer rings
        return {
          id: ring.id,
          name: ring.name,
          type: ring.type,
          color: ring.color,
          visible: ring.visible,
        };
      }),
      activityGroups: activityGroups.map(ag => ({
        id: ag.id,
        name: ag.name,
        color: ag.color,
        visible: ag.visible,
      })),
      labels: labels.map(l => ({
        id: l.id,
        name: l.name,
        color: l.color,
        visible: l.visible,
      })),
      items: items.map(i => ({
        id: i.id,
        ringId: i.ring_id,
        activityId: i.activity_id,
        labelId: i.label_id,
        name: i.name,
        startDate: i.start_date,
        endDate: i.end_date,
        time: i.time,
      })),
    },
  };
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
      title: wheelData.title || 'Organisation',
      year: parseInt(wheelData.year) || new Date().getFullYear(),
      colors: wheelData.colors || ['#334155', '#475569', '#64748B', '#94A3B8'],
      show_week_ring: wheelData.showWeekRing !== undefined ? wheelData.showWeekRing : true,
      show_month_ring: wheelData.showMonthRing !== undefined ? wheelData.showMonthRing : true,
      show_ring_names: wheelData.showRingNames !== undefined ? wheelData.showRingNames : true,
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
  const updateData = {};
  
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.year !== undefined) updateData.year = parseInt(updates.year);
  if (updates.colors !== undefined) updateData.colors = updates.colors;
  if (updates.showWeekRing !== undefined) updateData.show_week_ring = updates.showWeekRing;
  if (updates.showMonthRing !== undefined) updateData.show_month_ring = updates.showMonthRing;
  if (updates.showRingNames !== undefined) updateData.show_ring_names = updates.showRingNames;

  const { error } = await supabase
    .from('year_wheels')
    .update(updateData)
    .eq('id', wheelId);

  if (error) throw error;
};

/**
 * Save complete wheel data (rings, activity groups, labels, items)
 * This is the main function for auto-save and manual save
 */
export const saveWheelData = async (wheelId, organizationData) => {
  // 1. Sync rings and get ID mappings (old ID -> new UUID)
  const ringIdMap = await syncRings(wheelId, organizationData.rings || []);
  
  // 2. Sync activity groups and get ID mappings
  const activityIdMap = await syncActivityGroups(wheelId, organizationData.activityGroups || []);
  
  // 3. Sync labels and get ID mappings
  const labelIdMap = await syncLabels(wheelId, organizationData.labels || []);
  
  // 4. Sync items with ID mappings
  await syncItems(wheelId, organizationData.items || [], ringIdMap, activityIdMap, labelIdMap);
};

/**
 * Sync rings (handles creates, updates, deletes)
 * Returns a map of old IDs to new database UUIDs
 */
const syncRings = async (wheelId, rings) => {
  const idMap = new Map(); // oldId -> newId
  
  // Fetch existing rings
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
      wheel_id: wheelId,
      name: ring.name,
      type: ring.type,
      color: ring.color || null,
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
 */
const syncActivityGroups = async (wheelId, activityGroups) => {
  const idMap = new Map(); // oldId -> newId
  
  // Fetch existing
  const { data: existing } = await supabase
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
    const isNew = !group.id || group.id.startsWith('group-') || !existingIds.has(group.id);
    const groupData = {
      wheel_id: wheelId,
      name: group.name,
      color: group.color,
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
 */
const syncLabels = async (wheelId, labels) => {
  const idMap = new Map(); // oldId -> newId
  
  // Fetch existing
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
    const isNew = !label.id || label.id.startsWith('label-') || !existingIds.has(label.id);
    const labelData = {
      wheel_id: wheelId,
      name: label.name,
      color: label.color,
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
const syncItems = async (wheelId, items, ringIdMap, activityIdMap, labelIdMap) => {
  // Fetch existing
  const { data: existing } = await supabase
    .from('items')
    .select('id')
    .eq('wheel_id', wheelId);

  const existingIds = new Set(existing?.map(i => i.id) || []);
  const currentIds = new Set(items.map(i => i.id).filter(id => id && !id.startsWith('item-')));

  // Delete removed
  const toDelete = [...existingIds].filter(id => !currentIds.has(id));
  if (toDelete.length > 0) {
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
