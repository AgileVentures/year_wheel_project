# Ring Deletion Fix

## Problem
When deleting a ring with activities, the ring would disappear temporarily but reappear after reload or auto-save.

## Root Cause
The `handleRemoveRing` function in `OrganizationPanel.jsx` only removed the ring from local state but **not the items** on that ring.

**Flow:**
1. User deletes ring → ring removed from `organizationData.rings`
2. Items on that ring still remain in `organizationData.items`
3. Auto-save runs:
   - Ring deleted from database (CASCADE deletes items)
   - Items sync runs, but skips items with deleted ring_id
4. On reload, database state is inconsistent with local state

## Solution
When removing a ring, **also remove all items on that ring** from local state.

### Code Change
**File:** `src/components/OrganizationPanel.jsx`

```javascript
const handleRemoveRing = (ringId) => {
  if (organizationData.rings.length <= 1) return;
  
  // Remove the ring
  const updatedRings = organizationData.rings.filter(r => r.id !== ringId);
  
  // CRITICAL: Also remove all items on this ring to prevent orphaned items
  const updatedItems = organizationData.items.filter(item => item.ringId !== ringId);
  
  console.log(`[handleRemoveRing] Removing ring ${ringId} and ${organizationData.items.length - updatedItems.length} items`);
  
  onOrganizationChange({ 
    ...organizationData, 
    rings: updatedRings,
    items: updatedItems
  });
};
```

## Database CASCADE
The database already has proper CASCADE delete configured:

```sql
-- items table
ring_id UUID REFERENCES public.wheel_rings(id) ON DELETE CASCADE NOT NULL
```

This means when a ring is deleted from the database, all items referencing it are automatically deleted. The fix ensures the **local state** matches this behavior.

## Testing
1. Create a ring with several activities
2. Delete the ring
3. Verify:
   - Ring disappears immediately
   - All activities on that ring disappear
   - After reload, ring and activities remain deleted
   - Auto-save doesn't bring them back

## Future Enhancement
Later, we may want to add a confirmation dialog:
- "This ring has X activities. Do you want to:"
  - "Delete ring and all activities"
  - "Move activities to another ring"
  - "Cancel"

But for now, immediate deletion is the correct behavior.

## Related Files
- `src/components/OrganizationPanel.jsx` - Ring deletion handler (FIXED)
- `src/services/wheelService.js` - Database sync with CASCADE logic
- `supabase/migrations/000_INITIAL_SCHEMA.sql` - ON DELETE CASCADE definition
