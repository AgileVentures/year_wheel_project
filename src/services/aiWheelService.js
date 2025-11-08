/**
 * AI Wheel Service
 * 
 * Service functions for AI assistant tool execution.
 * Wraps existing wheelService functions with AI-friendly interfaces.
 */

import { supabase } from '../lib/supabase';
import { fetchWheel, fetchPageData, saveWheelData, updateWheel, createPage as createPageService } from './wheelService';

/**
 * Helper function to save wheel data and update local IDs with database UUIDs
 */
const saveAndUpdateIds = async (wheelId, pageId, orgData) => {
  // Save to database and get ID mappings
  const { ringIdMap, activityIdMap, labelIdMap } = await saveWheelData(wheelId, orgData, pageId);
  
  // Update IDs in case any were temporary
  const updatedOrgData = {
    ...orgData,
    rings: orgData.rings.map(ring => ({
      ...ring,
      id: ringIdMap.get(ring.id) || ring.id
    })),
    activityGroups: orgData.activityGroups.map(group => ({
      ...group,
      id: activityIdMap.get(group.id) || group.id
    })),
    labels: orgData.labels.map(label => ({
      ...label,
      id: labelIdMap.get(label.id) || label.id
    })),
    items: orgData.items.map(item => ({
      ...item,
      ringId: ringIdMap.get(item.ringId) || item.ringId,
      activityId: activityIdMap.get(item.activityId) || item.activityId,
      labelId: labelIdMap.get(item.labelId) || item.labelId
    }))
  };
  
  // Also update wheel_pages.organization_data
  await supabase
    .from('wheel_pages')
    .update({ organization_data: updatedOrgData })
    .eq('id', pageId);
    
  return updatedOrgData;
};

/**
 * Get current wheel context for AI
 * Now fetches items separately per page to avoid mixing years
 */
export const getWheelContext = async (wheelId, currentPageId) => {
  try {
    const wheelData = await fetchWheel(wheelId);
    const { data: pages } = await supabase
      .from('wheel_pages')
      .select('*')
      .eq('wheel_id', wheelId)
      .order('year');
    
    // Fetch items only for the current page
    const pageItems = currentPageId ? await fetchPageData(currentPageId) : [];
    
    return {
      title: wheelData.title,
      year: wheelData.year,
      colors: wheelData.colors,
      wheelStructure: {
        ...wheelData.wheelStructure,
        items: pageItems // Only current page's items
      },
      pages: pages || [],
      stats: {
        rings: wheelData.wheelStructure.rings?.length || 0,
        innerRings: wheelData.wheelStructure.rings?.filter(r => r.type === 'inner')?.length || 0,
        outerRings: wheelData.wheelStructure.rings?.filter(r => r.type === 'outer')?.length || 0,
        activityGroups: wheelData.wheelStructure.activityGroups?.length || 0,
        labels: wheelData.wheelStructure.labels?.length || 0,
        items: pageItems?.length || 0,
      }
    };
  } catch (error) {
    console.error('[aiWheelService] Error getting wheel context:', error);
    throw error;
  }
};

/**
 * Create a new ring (inner or outer)
 */
export const aiCreateRing = async (wheelId, pageId, { name, type, color, orientation }) => {
  try {
    const wheelData = await fetchWheel(wheelId);
    const orgData = wheelData.wheelStructure;
    
    // Generate ID
    const ringId = `ring-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create new ring object
    const newRing = {
      id: ringId,
      name: name || `Ring ${orgData.rings.length + 1}`,
      type: type || 'outer',
      visible: true,
    };
    
    // Add type-specific properties
    if (type === 'inner') {
      newRing.orientation = orientation || 'vertical';
      newRing.data = Array.from({ length: 12 }, () => ['']); // Empty month data
    } else {
      newRing.color = color || wheelData.colors[orgData.rings.filter(r => r.type === 'outer').length % wheelData.colors.length];
    }
    
    // Add to organization data
    const updatedOrgData = {
      ...orgData,
      rings: [...orgData.rings, newRing]
    };
    
    // Save to database and update IDs
    await saveAndUpdateIds(wheelId, pageId, updatedOrgData);
    
    return {
      success: true,
      ring: newRing,
      message: `Ring "${name}" skapad`
    };
  } catch (error) {
    console.error('[aiWheelService] Error creating ring:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Create a new activity group
 */
export const aiCreateActivityGroup = async (wheelId, pageId, { name, color, visible = true }) => {
  try {
    const wheelData = await fetchWheel(wheelId);
    const orgData = wheelData.wheelStructure;
    
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newGroup = {
      id: groupId,
      name: name || `Aktivitetsgrupp ${orgData.activityGroups.length + 1}`,
      color: color || wheelData.colors[orgData.activityGroups.length % wheelData.colors.length],
      visible
    };
    
    const updatedOrgData = {
      ...orgData,
      activityGroups: [...orgData.activityGroups, newGroup]
    };
    
    await saveAndUpdateIds(wheelId, pageId, updatedOrgData);
    
    return {
      success: true,
      activityGroup: newGroup,
      message: `Aktivitetsgrupp "${name}" skapad`
    };
  } catch (error) {
    console.error('[aiWheelService] Error creating activity group:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Create a new label
 */
export const aiCreateLabel = async (wheelId, pageId, { name, color, visible = true }) => {
  try {
    const wheelData = await fetchWheel(wheelId);
    const orgData = wheelData.wheelStructure;
    
    const labelId = `label-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newLabel = {
      id: labelId,
      name: name || `Etikett ${orgData.labels.length + 1}`,
      color: color || wheelData.colors[orgData.labels.length % wheelData.colors.length],
      visible
    };
    
    const updatedOrgData = {
      ...orgData,
      labels: [...orgData.labels, newLabel]
    };
    
    await saveAndUpdateIds(wheelId, pageId, updatedOrgData);
    
    return {
      success: true,
      label: newLabel,
      message: `Etikett "${name}" skapad`
    };
  } catch (error) {
    console.error('[aiWheelService] Error creating label:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Create a new item/activity
 */
export const aiCreateItem = async (wheelId, pageId, { name, startDate, endDate, ringId, activityGroupId, labelId, time }) => {
  try {
    // Validate page year matches dates
    const { data: pageData, error: pageYearError } = await supabase
      .from('wheel_pages')
      .select('year')
      .eq('id', pageId)
      .single();
    
    if (pageYearError || !pageData) {
      return {
        success: false,
        error: 'Kunde inte hämta sidans år'
      };
    }
    
    const pageYear = pageData.year;
    const startYear = parseInt(startDate.split('-')[0]);
    const endYear = parseInt(endDate.split('-')[0]);
    
    // Validate dates match page year
    if (startYear !== pageYear || endYear !== pageYear) {
      return {
        success: false,
        error: `Datumen måste vara inom år ${pageYear}. Start: ${startYear}, Slut: ${endYear}. Använd rätt pageId från getAvailablePages().`,
        pageYear: pageYear,
        startYear: startYear,
        endYear: endYear
      };
    }
    
    // Validate ring exists (wheel-level check)
    const { data: ring, error: ringError } = await supabase
      .from('wheel_rings')
      .select('id')
      .eq('id', ringId)
      .eq('wheel_id', wheelId)
      .single();
    
    if (ringError || !ring) {
      return {
        success: false,
        error: `Ring med ID ${ringId} hittades inte`
      };
    }
    
    // Auto-create or validate activity group
    let finalActivityGroupId = activityGroupId;
    
    if (!activityGroupId || activityGroupId.trim() === '') {
      // Check if default group exists
      const { data: defaultGroup } = await supabase
        .from('activity_groups')
        .select('id')
        .eq('wheel_id', wheelId)
        .or('name.eq.Allmän,name.eq.General')
        .limit(1)
        .single();
      
      if (defaultGroup) {
        finalActivityGroupId = defaultGroup.id;
      } else {
        // Create default activity group
        const { data: newGroup, error: groupError } = await supabase
          .from('activity_groups')
          .insert({
            wheel_id: wheelId,
            name: 'Allmän',
            color: null, // Will derive from wheel palette
            visible: true
          })
          .select()
          .single();
        
        if (groupError) {
          console.error('[aiWheelService] Error creating default activity group:', groupError);
          return {
            success: false,
            error: 'Kunde inte skapa standardgrupp'
          };
        }
        
        finalActivityGroupId = newGroup.id;
        console.log('🔧 [AI] Auto-created default activity group "Allmän":', finalActivityGroupId);
      }
    } else {
      // Validate provided activity group exists
      const { data: activityGroup, error: agError } = await supabase
        .from('activity_groups')
        .select('id')
        .eq('id', finalActivityGroupId)
        .eq('wheel_id', wheelId)
        .single();
      
      if (agError || !activityGroup) {
        return {
          success: false,
          error: `Aktivitetsgrupp med ID ${finalActivityGroupId} hittades inte`
        };
      }
    }
    
    // Insert item directly with page_id
    const { data: newItem, error: insertError } = await supabase
      .from('items')
      .insert({
        wheel_id: wheelId,
        page_id: pageId, // ← CRITICAL: Links to specific page
        ring_id: ringId,
        activity_id: finalActivityGroupId,
        label_id: labelId || null,
        name: name || 'Ny aktivitet',
        start_date: startDate,
        end_date: endDate,
        time: time || null
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('[aiWheelService] Error inserting item:', insertError);
      throw insertError;
    }
    
    console.log('✅ [AI] Item created in database:', {
      id: newItem.id,
      name,
      pageId,
      startDate,
      endDate,
      ringId,
      activityGroupId: finalActivityGroupId
    });
    
    return {
      success: true,
      item: newItem,
      message: `Aktivitet "${name}" skapad (${startDate} till ${endDate})`
    };
  } catch (error) {
    console.error('[aiWheelService] Error creating item:', error);
    
    // Make error messages user-friendly
    let userMessage = error.message;
    if (error.message && error.message.includes('unique_ring_month')) {
      userMessage = `Kunde inte skapa "${name}" - det finns redan data för denna ring och månad. Detta är ett tekniskt problem med ring-data som behöver åtgärdas.`;
    } else if (error.code === '23505') {
      userMessage = `Kunde inte skapa "${name}" - ett objekt med samma egenskaper finns redan.`;
    } else if (error.message && error.message.includes('Ring med ID')) {
      userMessage = error.message; // Already user-friendly
    } else if (error.message && error.message.includes('Aktivitetsgrupp med ID')) {
      userMessage = error.message; // Already user-friendly
    }
    
    return {
      success: false,
      error: userMessage,
      message: `Fel vid skapande av "${name}": ${userMessage}`
    };
  }
};

/**
 * Update wheel colors
 */
export const aiUpdateColors = async (wheelId, { colors }) => {
  try {
    await updateWheel(wheelId, { colors });
    
    return {
      success: true,
      colors,
      message: 'Färger uppdaterade'
    };
  } catch (error) {
    console.error('[aiWheelService] Error updating colors:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Create a new page
 */
export const aiCreatePage = async (wheelId, { year, copyStructure = false }) => {
  try {
    const wheelData = await fetchWheel(wheelId);
    
    let wheelStructure;
    if (copyStructure) {
      // Copy rings and activity groups, but not items
      wheelStructure = {
        rings: wheelData.wheelStructure.rings || [],
        activityGroups: wheelData.wheelStructure.activityGroups || [],
        labels: wheelData.wheelStructure.labels || [],
        items: [] // Empty items
      };
    } else {
      // Blank page
      wheelStructure = {
        rings: [],
        activityGroups: [{
          id: `group-${Date.now()}`,
          name: 'Aktivitetsgrupp 1',
          color: wheelData.colors[0],
          visible: true
        }],
        labels: [],
        items: []
      };
    }
    
    const newPage = await createPageService(wheelId, {
      year,
      title: `${year}`,
      wheelStructure
    });
    
    return {
      success: true,
      page: newPage,
      message: `Sida för år ${year} skapad`
    };
  } catch (error) {
    console.error('[aiWheelService] Error creating page:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get current date information
 */
export const aiGetCurrentDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  const monthNames = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 
                      'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
  const dayNames = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
  
  return {
    success: true,
    date: {
      full: now.toISOString().split('T')[0], // YYYY-MM-DD
      year,
      month,
      day,
      monthName: monthNames[month - 1],
      dayName: dayNames[now.getDay()],
      formatted: `${dayNames[now.getDay()]} ${day} ${monthNames[month - 1]} ${year}`
    },
    message: `Idag är det **${dayNames[now.getDay()]} ${day} ${monthNames[month - 1]} ${year}**`
  };
};

/**
 * List all available pages/years for this wheel
 */
export const aiGetAvailablePages = async (wheelId) => {
  try {
    // Fetch pages directly from Supabase
    const { data: pages, error } = await supabase
      .from('wheel_pages')
      .select('*')
      .eq('wheel_id', wheelId)
      .order('year');
    
    if (error) throw error;
    
    const pageList = (pages || []).map(p => ({
      id: p.id,
      year: p.year,
      title: p.title,
      itemCount: p.organization_data?.items?.length || 0
    }));
    
    let message = `**Tillgängliga sidor:**\n`;
    if (pageList.length === 0) {
      message += `Inga sidor hittades.\n`;
    } else {
      pageList.forEach(p => {
        message += `- **${p.year}**${p.title ? ` - ${p.title}` : ''} (${p.itemCount} aktiviteter)\n`;
      });
    }
    
    return {
      success: true,
      pages: pageList,
      message
    };
  } catch (error) {
    console.error('[aiWheelService] Error getting pages:', error);
    return {
      success: false,
      message: `Kunde inte hämta sidor: ${error.message}`,
      error: error.message
    };
  }
};

/**
 * Delete a ring
 */
export const aiDeleteRing = async (wheelId, pageId, { ringId }) => {
  try {
    const wheelData = await fetchWheel(wheelId);
    const orgData = wheelData.wheelStructure;
    
    const ring = orgData.rings.find(r => r.id === ringId);
    if (!ring) {
      return {
        success: false,
        error: `Ring med ID ${ringId} hittades inte`
      };
    }
    
    // Count items that will be deleted
    const itemsToDelete = orgData.items.filter(i => i.ringId === ringId);
    
    // Remove ring and all items on that ring
    const updatedOrgData = {
      ...orgData,
      rings: orgData.rings.filter(r => r.id !== ringId),
      items: orgData.items.filter(i => i.ringId !== ringId)
    };
    
    await saveAndUpdateIds(wheelId, pageId, updatedOrgData);
    
    return {
      success: true,
      message: `Ring "${ring.name}" raderad (${itemsToDelete.length} aktiviteter också borttagna)`
    };
  } catch (error) {
    console.error('[aiWheelService] Error deleting ring:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete item(s) by name or ID
 */
export const aiDeleteItems = async (wheelId, pageId, { itemName, itemIds }) => {
  try {
    const wheelData = await fetchWheel(wheelId);
    const orgData = wheelData.wheelStructure;
    
    let itemsToDelete = [];
    
    // Find items by name (case-insensitive, partial match)
    if (itemName) {
      const searchName = itemName.toLowerCase();
      itemsToDelete = orgData.items.filter(item => 
        item.name.toLowerCase().includes(searchName)
      );
    }
    
    // Or find items by IDs
    if (itemIds && itemIds.length > 0) {
      itemsToDelete = orgData.items.filter(item => 
        itemIds.includes(item.id)
      );
    }
    
    if (itemsToDelete.length === 0) {
      return {
        success: false,
        error: itemName 
          ? `Inga aktiviteter hittades med namnet "${itemName}"`
          : 'Inga aktiviteter hittades'
      };
    }
    
    // Remove items
    const updatedOrgData = {
      ...orgData,
      items: orgData.items.filter(item => 
        !itemsToDelete.some(toDelete => toDelete.id === item.id)
      )
    };
    
    await saveAndUpdateIds(wheelId, pageId, updatedOrgData);
    
    console.log('🗑️ [AI] Items deleted:', itemsToDelete.map(i => i.name));
    
    return {
      success: true,
      deletedCount: itemsToDelete.length,
      deletedItems: itemsToDelete.map(i => ({ id: i.id, name: i.name })),
      message: itemsToDelete.length === 1
        ? `Aktivitet "${itemsToDelete[0].name}" raderad`
        : `${itemsToDelete.length} aktiviteter raderade: ${itemsToDelete.map(i => i.name).join(', ')}`
    };
  } catch (error) {
    console.error('[aiWheelService] Error deleting items:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete all items from a specific ring
 */
export const aiDeleteItemsByRing = async (wheelId, pageId, { ringName, ringId }) => {
  try {
    const wheelData = await fetchWheel(wheelId);
    const orgData = wheelData.wheelStructure;
    
    let ring;
    
    // Find ring by name or ID
    if (ringId) {
      ring = orgData.rings.find(r => r.id === ringId);
    } else if (ringName) {
      ring = orgData.rings.find(r => 
        r.name.toLowerCase().includes(ringName.toLowerCase())
      );
    }
    
    if (!ring) {
      return {
        success: false,
        error: `Hittade ingen ring med namnet "${ringName || ringId}"`,
        message: `Varning: Hittade ingen ring med namnet "${ringName || ringId}"`
      };
    }
    
    // Find all items on this ring
    const itemsToDelete = orgData.items.filter(i => i.ringId === ring.id);
    
    if (itemsToDelete.length === 0) {
      return {
        success: false,
        error: `Ringen "${ring.name}" har inga aktiviteter`,
        message: `Varning: Ringen "${ring.name}" har inga aktiviteter att ta bort`
      };
    }
    
    // Remove items
    const updatedOrgData = {
      ...orgData,
      items: orgData.items.filter(item => item.ringId !== ring.id)
    };
    
    await saveAndUpdateIds(wheelId, pageId, updatedOrgData);
    
    console.log('🗑️ [AI] Deleted all items from ring:', ring.name, 'Count:', itemsToDelete.length);
    
    return {
      success: true,
      deletedCount: itemsToDelete.length,
      deletedItems: itemsToDelete.map(i => ({ id: i.id, name: i.name })),
      message: `${itemsToDelete.length} aktiviteter raderade från ringen "${ring.name}":\n${itemsToDelete.map(i => `- ${i.name}`).join('\n')}`
    };
  } catch (error) {
    console.error('[aiWheelService] Error deleting items by ring:', error);
    return {
      success: false,
      error: error.message,
      message: `Fel vid radering: ${error.message}`
    };
  }
};

/**
 * Delete activity group (warning: this will also delete all items in the group)
 */
export const aiDeleteActivityGroup = async (wheelId, pageId, { activityGroupId }) => {
  try {
    const wheelData = await fetchWheel(wheelId);
    const orgData = wheelData.wheelStructure;
    
    const group = orgData.activityGroups.find(ag => ag.id === activityGroupId);
    if (!group) {
      return {
        success: false,
        error: `Aktivitetsgrupp med ID ${activityGroupId} hittades inte`
      };
    }
    
    // Count items that will be deleted
    const itemsToDelete = orgData.items.filter(i => i.activityId === activityGroupId);
    
    // Remove activity group and all items in the group
    const updatedOrgData = {
      ...orgData,
      activityGroups: orgData.activityGroups.filter(ag => ag.id !== activityGroupId),
      items: orgData.items.filter(i => i.activityId !== activityGroupId)
    };
    
    await saveAndUpdateIds(wheelId, pageId, updatedOrgData);
    
    return {
      success: true,
      message: `Aktivitetsgrupp "${group.name}" raderad (${itemsToDelete.length} aktiviteter också borttagna)`
    };
  } catch (error) {
    console.error('[aiWheelService] Error deleting activity group:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Search for activities, rings, activity groups, and labels
 */
export const aiSearchWheel = async (wheelId, { query, type }) => {
  try {
    const wheelData = await fetchWheel(wheelId);
    const orgData = wheelData.wheelStructure;
    
    const searchQuery = query.toLowerCase();
    const results = {
      items: [],
      rings: [],
      activityGroups: [],
      labels: []
    };
    
    // Search items/activities
    if (!type || type === 'items' || type === 'all') {
      results.items = orgData.items.filter(item => 
        item.name.toLowerCase().includes(searchQuery)
      ).map(item => {
        // Get associated ring and activity group names
        const ring = orgData.rings.find(r => r.id === item.ringId);
        const activityGroup = orgData.activityGroups.find(ag => ag.id === item.activityId);
        const label = item.labelId ? orgData.labels.find(l => l.id === item.labelId) : null;
        
        return {
          id: item.id,
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate,
          time: item.time,
          ring: ring?.name || 'Okänd ring',
          activityGroup: activityGroup?.name || 'Okänd grupp',
          label: label?.name || null
        };
      });
    }
    
    // Search rings
    if (!type || type === 'rings' || type === 'all') {
      results.rings = orgData.rings.filter(ring => 
        ring.name.toLowerCase().includes(searchQuery)
      ).map(ring => {
        // Count items on this ring
        const itemCount = orgData.items.filter(i => i.ringId === ring.id).length;
        
        return {
          id: ring.id,
          name: ring.name,
          type: ring.type,
          visible: ring.visible,
          itemCount
        };
      });
    }
    
    // Search activity groups
    if (!type || type === 'activityGroups' || type === 'all') {
      results.activityGroups = orgData.activityGroups.filter(ag => 
        ag.name.toLowerCase().includes(searchQuery)
      ).map(ag => {
        // Count items in this group
        const itemCount = orgData.items.filter(i => i.activityId === ag.id).length;
        
        return {
          id: ag.id,
          name: ag.name,
          color: ag.color,
          visible: ag.visible,
          itemCount
        };
      });
    }
    
    // Search labels
    if (!type || type === 'labels' || type === 'all') {
      results.labels = orgData.labels.filter(label => 
        label.name.toLowerCase().includes(searchQuery)
      ).map(label => {
        // Count items with this label
        const itemCount = orgData.items.filter(i => i.labelId === label.id).length;
        
        return {
          id: label.id,
          name: label.name,
          color: label.color,
          visible: label.visible,
          itemCount
        };
      });
    }
    
    // Calculate totals
    const totalResults = 
      results.items.length + 
      results.rings.length + 
      results.activityGroups.length + 
      results.labels.length;
    
    console.log('🔍 [AI] Search results for "' + query + '":', {
      items: results.items.length,
      rings: results.rings.length,
      activityGroups: results.activityGroups.length,
      labels: results.labels.length,
      total: totalResults
    });
    
    return {
      success: true,
      query,
      totalResults,
      results
    };
  } catch (error) {
    console.error('[aiWheelService] Error searching wheel:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get items on a specific ring by ring name or ID
 */
export const aiGetItemsByRing = async (wheelId, { ringName, ringId }) => {
  try {
    const wheelData = await fetchWheel(wheelId);
    const orgData = wheelData.wheelStructure;
    
    let ring;
    
    // Find ring by name or ID
    if (ringId) {
      ring = orgData.rings.find(r => r.id === ringId);
    } else if (ringName) {
      ring = orgData.rings.find(r => 
        r.name.toLowerCase().includes(ringName.toLowerCase())
      );
    }
    
    if (!ring) {
      return {
        success: false,
        message: `Hittade ingen ring med namnet "${ringName || ringId}". Tillgängliga ringar: ${orgData.rings.map(r => r.name).join(', ')}`
      };
    }
    
    // Get all items on this ring
    const itemsOnRing = orgData.items.filter(i => i.ringId === ring.id);
    
    if (itemsOnRing.length === 0) {
      return {
        success: true,
        message: `Ringen **${ring.name}** finns, men har inga aktiviteter ännu.`
      };
    }
    
    // Format the results
    let formattedMessage = `**Aktiviteter på ringen "${ring.name}"** (${itemsOnRing.length} st):\n\n`;
    
    itemsOnRing.forEach(item => {
      const activityGroup = orgData.activityGroups.find(ag => ag.id === item.activityId);
      formattedMessage += `- **${item.name}** (${item.startDate} till ${item.endDate})\n`;
      formattedMessage += `  - Grupp: ${activityGroup?.name || 'Okänd'}\n`;
    });
    
    return {
      success: true,
      ring: ring.name,
      itemCount: itemsOnRing.length,
      message: formattedMessage
    };
  } catch (error) {
    console.error('[aiWheelService] Error getting items by ring:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Analyze current wheel and provide insights
 */
export const aiAnalyzeWheel = async (wheelId) => {
  try {
    const context = await getWheelContext(wheelId);
    
    const analysis = {
      totalRings: context.stats.rings,
      innerRings: context.stats.innerRings,
      outerRings: context.stats.outerRings,
      activityGroups: context.stats.activityGroups,
      totalActivities: context.stats.items,
      labels: context.stats.labels,
      pages: context.pages.length,
      insights: []
    };
    
    // Generate insights
    if (context.stats.items === 0) {
      analysis.insights.push('Inga aktiviteter ännu. Börja med att skapa aktivitetsgrupper och lägg till händelser!');
    }
    
    if (context.stats.activityGroups === 0) {
      analysis.insights.push('Inga aktivitetsgrupper. Skapa kategorier för dina aktiviteter först.');
    }
    
    if (context.stats.outerRings === 0) {
      analysis.insights.push('Inga yttre ringar. Lägg till ringar för att organisera dina aktiviteter.');
    }
    
    if (context.pages.length === 1) {
      analysis.insights.push('Du har en sida. Skapa fler sidor för att planera flera år!');
    }
    
    // Format the analysis as a message
    let formattedMessage = `## Analys av ditt hjul "${context.title}"\n\n`;
    formattedMessage += `**Struktur:**\n`;
    formattedMessage += `- **${analysis.totalRings} ringar** (${analysis.innerRings} inner, ${analysis.outerRings} outer)\n`;
    formattedMessage += `- **${analysis.activityGroups} aktivitetsgrupper**\n`;
    formattedMessage += `- **${analysis.totalActivities} aktiviteter**\n`;
    formattedMessage += `- **${analysis.labels} etiketter**\n`;
    formattedMessage += `- **${analysis.pages} sidor**\n\n`;
    
    if (analysis.insights.length > 0) {
      formattedMessage += `**Insikter:**\n`;
      analysis.insights.forEach(insight => {
        formattedMessage += `- ${insight}\n`;
      });
    } else {
      formattedMessage += `**Status:** Ditt hjul är väl strukturerat och innehåller aktiviteter! 👍\n`;
    }
    
    return {
      success: true,
      analysis,
      message: formattedMessage
    };
  } catch (error) {
    console.error('[aiWheelService] Error analyzing wheel:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
