import { useRef, useCallback, useState } from 'react';

/**
 * useChangeTracker - Tracks changes to wheel data for efficient delta saves
 * 
 * Instead of saving entire wheel on every change, tracks what was:
 * - Added (new items/rings/groups)
 * - Modified (changed properties)
 * - Deleted (removed items/rings/groups)
 * 
 * Usage:
 *   const tracker = useChangeTracker();
 *   tracker.trackItemChange(itemId, 'added', item);
 *   tracker.trackItemChange(itemId, 'modified', updatedItem);
 *   tracker.trackItemChange(itemId, 'deleted', item);
 *   const changes = tracker.getChanges();
 *   tracker.clearChanges();
 */
export function useChangeTracker() {
  // Version counter to trigger React re-renders when changes are tracked or cleared
  const [version, setVersion] = useState(0);
  
  const changesRef = useRef({
    items: { added: new Map(), modified: new Map(), deleted: new Set() },
    rings: { added: new Map(), modified: new Map(), deleted: new Set() },
    activityGroups: { added: new Map(), modified: new Map(), deleted: new Set() },
    labels: { added: new Map(), modified: new Map(), deleted: new Set() },
    pages: { added: new Map(), modified: new Map(), deleted: new Set() }
  });

  const trackItemChange = useCallback((id, action, item) => {
    const changes = changesRef.current.items;

    if (action === 'added') {
      // New item added
      changes.added.set(id, item);
      changes.modified.delete(id);
      changes.deleted.delete(id);
    } else if (action === 'deleted') {
      // Item deleted
      changes.deleted.add(id);
      changes.added.delete(id);
      changes.modified.delete(id);
    } else if (action === 'modified') {
      // Item modified
      if (!changes.added.has(id)) {
        // Only track as modified if not a new item
        changes.modified.set(id, item);
      } else {
        // Update the added item data
        changes.added.set(id, item);
      }
    }
    // Increment version to trigger React re-render
    setVersion(v => v + 1);
  }, []);

  const trackRingChange = useCallback((id, action, ring) => {
    const changes = changesRef.current.rings;

    if (action === 'added') {
      changes.added.set(id, ring);
      changes.modified.delete(id);
      changes.deleted.delete(id);
    } else if (action === 'deleted') {
      changes.deleted.add(id);
      changes.added.delete(id);
      changes.modified.delete(id);
    } else if (action === 'modified') {
      if (!changes.added.has(id)) {
        changes.modified.set(id, ring);
      } else {
        changes.added.set(id, ring);
      }
    }    setVersion(v => v + 1);  }, []);

  const trackActivityGroupChange = useCallback((id, action, group) => {
    const changes = changesRef.current.activityGroups;

    if (action === 'added') {
      changes.added.set(id, group);
      changes.modified.delete(id);
      changes.deleted.delete(id);
    } else if (action === 'deleted') {
      changes.deleted.add(id);
      changes.added.delete(id);
      changes.modified.delete(id);
    } else if (action === 'modified') {
      if (!changes.added.has(id)) {
        changes.modified.set(id, group);
      } else {
        changes.added.set(id, group);
      }
    }    setVersion(v => v + 1);  }, []);

  const trackLabelChange = useCallback((id, action, label) => {
    const changes = changesRef.current.labels;

    if (action === 'added') {
      changes.added.set(id, label);
      changes.modified.delete(id);
      changes.deleted.delete(id);
    } else if (action === 'deleted') {
      changes.deleted.add(id);
      changes.added.delete(id);
      changes.modified.delete(id);
    } else if (action === 'modified') {
      if (!changes.added.has(id)) {
        changes.modified.set(id, label);
      } else {
        changes.added.set(id, label);
      }
    }
    setVersion(v => v + 1);
  }, []);

  const trackPageChange = useCallback((id, action, page) => {
    const changes = changesRef.current.pages;

    if (action === 'added') {
      changes.added.set(id, page);
      changes.modified.delete(id);
      changes.deleted.delete(id);
    } else if (action === 'deleted') {
      changes.deleted.add(id);
      changes.added.delete(id);
      changes.modified.delete(id);
    } else if (action === 'modified') {
      if (!changes.added.has(id)) {
        changes.modified.set(id, page);
      } else {
        changes.added.set(id, page);
      }
    }
    setVersion(v => v + 1);
  }, []);

  const getChanges = useCallback(() => {
    const changes = changesRef.current;
    return {
      items: {
        added: Array.from(changes.items.added.values()),
        modified: Array.from(changes.items.modified.values()),
        deleted: Array.from(changes.items.deleted)
      },
      rings: {
        added: Array.from(changes.rings.added.values()),
        modified: Array.from(changes.rings.modified.values()),
        deleted: Array.from(changes.rings.deleted)
      },
      activityGroups: {
        added: Array.from(changes.activityGroups.added.values()),
        modified: Array.from(changes.activityGroups.modified.values()),
        deleted: Array.from(changes.activityGroups.deleted)
      },
      labels: {
        added: Array.from(changes.labels.added.values()),
        modified: Array.from(changes.labels.modified.values()),
        deleted: Array.from(changes.labels.deleted)
      },
      pages: {
        added: Array.from(changes.pages.added.values()),
        modified: Array.from(changes.pages.modified.values()),
        deleted: Array.from(changes.pages.deleted)
      }
    };
  }, []);

  const hasChanges = useCallback(() => {
    const changes = changesRef.current;
    return (
      changes.items.added.size > 0 ||
      changes.items.modified.size > 0 ||
      changes.items.deleted.size > 0 ||
      changes.rings.added.size > 0 ||
      changes.rings.modified.size > 0 ||
      changes.rings.deleted.size > 0 ||
      changes.activityGroups.added.size > 0 ||
      changes.activityGroups.modified.size > 0 ||
      changes.activityGroups.deleted.size > 0 ||
      changes.labels.added.size > 0 ||
      changes.labels.modified.size > 0 ||
      changes.labels.deleted.size > 0 ||
      changes.pages.added.size > 0 ||
      changes.pages.modified.size > 0 ||
      changes.pages.deleted.size > 0
    );
  }, []);

  const clearChanges = useCallback(() => {
    changesRef.current = {
      items: { added: new Map(), modified: new Map(), deleted: new Set() },
      rings: { added: new Map(), modified: new Map(), deleted: new Set() },
      activityGroups: { added: new Map(), modified: new Map(), deleted: new Set() },
      labels: { added: new Map(), modified: new Map(), deleted: new Set() },
      pages: { added: new Map(), modified: new Map(), deleted: new Set() }
    };
    // Increment version to trigger React re-render
    setVersion(v => v + 1);
  }, []);

  const getChangesSummary = useCallback(() => {
    const changes = changesRef.current;
    return {
      items: {
        added: changes.items.added.size,
        modified: changes.items.modified.size,
        deleted: changes.items.deleted.size
      },
      rings: {
        added: changes.rings.added.size,
        modified: changes.rings.modified.size,
        deleted: changes.rings.deleted.size
      },
      activityGroups: {
        added: changes.activityGroups.added.size,
        modified: changes.activityGroups.modified.size,
        deleted: changes.activityGroups.deleted.size
      },
      labels: {
        added: changes.labels.added.size,
        modified: changes.labels.modified.size,
        deleted: changes.labels.deleted.size
      },
      pages: {
        added: changes.pages.added.size,
        modified: changes.pages.modified.size,
        deleted: changes.pages.deleted.size
      }
    };
  }, []);

  return {
    trackItemChange,
    trackRingChange,
    trackActivityGroupChange,
    trackLabelChange,
    trackPageChange,
    getChanges,
    hasChanges,
    clearChanges,
    getChangesSummary,
    version // Expose version so components can use it as a dependency
  };
}
