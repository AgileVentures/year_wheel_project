/**
 * AI Wheel Service
 * 
 * Service functions for AI assistant tool execution.
 * Wraps existing wheelService functions with AI-friendly interfaces.
 */

import { supabase } from '../lib/supabase';
import { fetchWheel, fetchPageData, saveWheelData, updateWheel, createPage as createPageService, isPageScopeSupported } from './wheelService';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

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
  
  // Also update wheel_pages.structure (shared metadata only)
  await supabase
    .from('wheel_pages')
    .update({
      structure: {
        rings: updatedOrgData.rings,
        activityGroups: updatedOrgData.activityGroups,
        labels: updatedOrgData.labels,
      },
    })
    .eq('id', pageId);
    
  return {
    structure: updatedOrgData,
    ringIdMap,
    activityIdMap,
    labelIdMap,
  };
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
    const { structure: persistedStructure, ringIdMap } = await saveAndUpdateIds(wheelId, pageId, updatedOrgData);

    const resolvedRingId = ringIdMap.get(ringId) || ringId;
    const persistedRing = persistedStructure.rings.find(r => r.id === resolvedRingId) || {
      ...newRing,
      id: resolvedRingId,
    };
    
    return {
      success: true,
      ring: persistedRing,
      message: `Ring "${persistedRing.name}" skapad`
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
    
    const { structure: persistedStructure, activityIdMap } = await saveAndUpdateIds(wheelId, pageId, updatedOrgData);

    const resolvedGroupId = activityIdMap.get(groupId) || groupId;
    const persistedGroup = persistedStructure.activityGroups.find(g => g.id === resolvedGroupId) || {
      ...newGroup,
      id: resolvedGroupId,
    };
    
    return {
      success: true,
      activityGroup: persistedGroup,
      message: `Aktivitetsgrupp "${persistedGroup.name}" skapad`
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
    
    const { structure: persistedStructure, labelIdMap } = await saveAndUpdateIds(wheelId, pageId, updatedOrgData);

    const resolvedLabelId = labelIdMap.get(labelId) || labelId;
    const persistedLabel = persistedStructure.labels.find(l => l.id === resolvedLabelId) || {
      ...newLabel,
      id: resolvedLabelId,
    };
    
    return {
      success: true,
      label: persistedLabel,
      message: `Etikett "${persistedLabel.name}" skapad`
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
    const normalizeStructure = (structure) => ({
      rings: Array.isArray(structure?.rings) ? [...structure.rings] : [],
      activityGroups: Array.isArray(structure?.activityGroups) ? [...structure.activityGroups] : [],
      labels: Array.isArray(structure?.labels) ? [...structure.labels] : [],
    });

    const { data: pageData, error: pageQueryError } = await supabase
      .from('wheel_pages')
      .select('year, structure')
      .eq('id', pageId)
      .single();

    if (pageQueryError || !pageData) {
      console.error('[aiWheelService] Unable to load page metadata for item creation:', pageQueryError);
      return {
        success: false,
        error: 'Kunde inte hämta sidans år'
      };
    }

    const pageYear = pageData.year;
    const structure = normalizeStructure(pageData.structure || {});

    const parseYear = (value) => {
      if (typeof value !== 'string') return NaN;
      const [yearPart] = value.split('-');
      return Number.parseInt(yearPart, 10);
    };

    const startYear = parseYear(startDate);
    const endYear = parseYear(endDate);

    if (startYear !== pageYear || endYear !== pageYear) {
      return {
        success: false,
        error: `Datumen måste vara inom år ${pageYear}. Start: ${startYear}, Slut: ${endYear}. Använd rätt pageId från getAvailablePages().`,
        pageYear,
        startYear,
        endYear
      };
    }

    const supportsPageScope = await isPageScopeSupported();

    if (supportsPageScope && !pageId) {
      return {
        success: false,
        error: 'Kunde inte skapa aktivitet - pageId krävs när sidan har aktiverat page_id-kolumnen.'
      };
    }

    const wheelData = await fetchWheel(wheelId);
    const colorPalette = Array.isArray(wheelData.colors) && wheelData.colors.length > 0
      ? wheelData.colors
      : ['#3B82F6', '#8B5CF6', '#F97316', '#22C55E'];

    const { data: ringRows, error: ringQueryError } = await supabase
      .from('wheel_rings')
      .select('id')
      .eq('id', ringId)
      .limit(1);

    if (ringQueryError) {
      console.error('[aiWheelService] Error validating ring before item insert:', ringQueryError);
      return {
        success: false,
        error: 'Kunde inte validera ringen för aktiviteten'
      };
    }

    const ringExists = (Array.isArray(ringRows) && ringRows.length > 0)
      || structure.rings.some(r => r.id === ringId)
      || (Array.isArray(wheelData.structure?.rings) && wheelData.structure.rings.some(r => r.id === ringId));

    if (!ringExists) {
      return {
        success: false,
        error: `Ring med ID ${ringId} hittades inte`
      };
    }

    const ensureActivityGroupById = async (requestedId) => {
      if (!requestedId) return null;
      const trimmedId = requestedId.trim();

      const { data: existingRows, error: existingError } = await supabase
        .from('activity_groups')
        .select('id')
        .eq('id', trimmedId)
        .limit(1);

      if (existingError) {
        console.error('[aiWheelService] Error fetching activity group', trimmedId, existingError);
        throw existingError;
      }

      if (Array.isArray(existingRows) && existingRows.length > 0) {
        return existingRows[0].id;
      }

      const structureGroup = structure.activityGroups.find(group => group.id === trimmedId);
      if (!structureGroup) {
        return null;
      }

      if (!UUID_REGEX.test(trimmedId)) {
        console.warn('[aiWheelService] Detected non-UUID activity group id in structure, cannot backfill:', trimmedId);
        return null;
      }

      const fallbackColor = colorPalette[0] && HEX_COLOR_REGEX.test(colorPalette[0])
        ? colorPalette[0]
        : '#3B82F6';

      const resolvedColor = typeof structureGroup.color === 'string' && HEX_COLOR_REGEX.test(structureGroup.color)
        ? structureGroup.color
        : fallbackColor;

      const insertPayload = {
        id: trimmedId,
        wheel_id: wheelId,
        name: (structureGroup.name || 'Aktivitetsgrupp').trim(),
        color: resolvedColor,
        visible: structureGroup.visible !== false,
      };

      if (supportsPageScope) {
        insertPayload.page_id = pageId;
      }

      const { error: insertError } = await supabase
        .from('activity_groups')
        .insert(insertPayload);

      if (insertError) {
        if (insertError.code === '23505') {
          return trimmedId;
        }
        throw insertError;
      }

      return trimmedId;
    };

    let finalActivityGroupId = activityGroupId?.trim();

    if (finalActivityGroupId) {
      const resolved = await ensureActivityGroupById(finalActivityGroupId);
      if (!resolved) {
        return {
          success: false,
          error: `Aktivitetsgrupp med ID ${finalActivityGroupId} hittades inte`
        };
      }
      finalActivityGroupId = resolved;
    } else {
      const fallbackGroup = structure.activityGroups.find(group => group.visible !== false) || structure.activityGroups[0];

      if (fallbackGroup) {
        const resolved = await ensureActivityGroupById(fallbackGroup.id);
        if (resolved) {
          finalActivityGroupId = resolved;
        }
      }

      if (!finalActivityGroupId) {
        const defaultColor = colorPalette[0] && HEX_COLOR_REGEX.test(colorPalette[0])
          ? colorPalette[0]
          : '#3B82F6';

        const defaultGroupPayload = {
          wheel_id: wheelId,
          name: 'Allmän',
          color: defaultColor,
          visible: true,
        };

        if (supportsPageScope) {
          defaultGroupPayload.page_id = pageId;
        }

        const { data: insertedGroup, error: defaultGroupError } = await supabase
          .from('activity_groups')
          .insert(defaultGroupPayload)
          .select('id, name, color, visible')
          .single();

        if (defaultGroupError) {
          console.error('[aiWheelService] Error creating default activity group:', defaultGroupError);
          return {
            success: false,
            error: 'Kunde inte skapa standardgrupp'
          };
        }

        finalActivityGroupId = insertedGroup.id;

        if (!structure.activityGroups.some(group => group.id === insertedGroup.id)) {
          structure.activityGroups.push({
            id: insertedGroup.id,
            name: insertedGroup.name,
            color: insertedGroup.color,
            visible: insertedGroup.visible,
          });

          const { error: structureUpdateError } = await supabase
            .from('wheel_pages')
            .update({
              structure: {
                rings: structure.rings,
                activityGroups: structure.activityGroups,
                labels: structure.labels,
              }
            })
            .eq('id', pageId);

          if (structureUpdateError) {
            console.warn('[aiWheelService] Failed to persist default activity group to page structure:', structureUpdateError);
          }
        }
      }
    }

    if (!finalActivityGroupId) {
      return {
        success: false,
        error: 'Ingen aktivitetsgrupp hittades eller kunde skapas'
      };
    }

    const itemPayload = {
      wheel_id: wheelId,
      ring_id: ringId,
      activity_id: finalActivityGroupId,
      label_id: labelId || null,
      name: name || 'Ny aktivitet',
      start_date: startDate,
      end_date: endDate,
      time: time || null,
    };

    if (supportsPageScope) {
      itemPayload.page_id = pageId;
    }

    const { data: newItem, error: insertError } = await supabase
      .from('items')
      .insert(itemPayload)
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
    
    const pagesWithCounts = await Promise.all(
      (pages || []).map(async (p) => {
        try {
          const items = await fetchPageData(p.id, p.year, wheelId);
          return {
            id: p.id,
            year: p.year,
            title: p.title,
            itemCount: Array.isArray(items) ? items.length : 0,
          };
        } catch (countError) {
          console.error('[aiWheelService] Failed to count items for page', p.id, countError);
          return {
            id: p.id,
            year: p.year,
            title: p.title,
            itemCount: 0,
          };
        }
      })
    );

    const pageList = pagesWithCounts;
    
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
