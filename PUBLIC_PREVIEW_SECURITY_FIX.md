# Public Preview Security Fix

## Critical Security Issue
**Public preview pages allowed DELETE operations on activities** - Users viewing a public wheel via `/preview-wheel/:wheelId` could click on activities and see a DELETE button in the popup tooltip, potentially allowing them to delete items.

## Root Cause
The `ItemTooltip` component always showed edit and delete buttons regardless of whether the wheel was in readonly mode. While `PreviewWheelPage` passed `readonly={true}` to `YearWheel`, this prop was not being forwarded to `ItemTooltip`.

## Solution Implemented

### 1. Added `readonly` Prop to ItemTooltip
**File:** `src/components/ItemTooltip.jsx`

**Changes:**
- Added `readonly = false` prop to function signature
- Wrapped action buttons section in conditional: `{!readonly && (...) }`
- Now edit/delete buttons only appear in edit mode

```jsx
function ItemTooltip({ 
  item, 
  organizationData, 
  position, 
  onEdit, 
  onDelete, 
  onClose, 
  readonly = false  // ← NEW
}) {
  // ...content display...
  
  {/* Actions - only show in edit mode */}
  {!readonly && (  // ← NEW CONDITIONAL
    <div className="flex gap-2 p-3 border-t border-gray-200">
      <button onClick={...}>Redigera</button>
      <button onClick={...}>Radera</button>
    </div>
  )}
}
```

### 2. Updated YearWheel Component
**File:** `src/YearWheel.jsx`

**Changes:**
- Added `readonly = false` to YearWheel function signature
- Passed `readonly` prop to `ItemTooltip` component
- Added conditional to prevent `EditAktivitetModal` from rendering in readonly mode

```jsx
function YearWheel({
  // ...other props
  readonly = false,  // ← NEW
}) {
  // ...
  
  {/* Item Tooltip */}
  <ItemTooltip
    // ...other props
    readonly={readonly}  // ← NEW
  />
  
  {/* Edit Aktivitet Modal - only in edit mode */}
  {editingItem && !readonly && (  // ← NEW CONDITIONAL
    <EditAktivitetModal ... />
  )}
}
```

### 3. Verified PreviewWheelPage
**File:** `src/components/PreviewWheelPage.jsx`

**Already Correct:**
- ✅ Passes `readonly={true}` to YearWheel (line 179)
- ✅ No OrganizationPanel shown (sidebar is not rendered)
- ✅ Shows "Publikt delat årshjul - Skrivskyddat läge" in header
- ✅ Only allows navigation between years, no editing

## Security Layers Now in Place

### Layer 1: UI Controls (This Fix)
- ✅ Edit/Delete buttons hidden in readonly mode
- ✅ Edit modal cannot open in readonly mode
- ✅ ItemTooltip only shows read-only information

### Layer 2: Route Protection
- ✅ `/preview-wheel/:wheelId` is public route
- ✅ `/wheel/:wheelId` requires authentication (ProtectedRoute)
- ✅ Database operations require authentication

### Layer 3: Database Security (RLS Policies)
- ✅ Supabase Row Level Security policies protect all tables
- ✅ Even if someone bypasses UI, database will reject unauthorized writes
- ✅ Only authenticated users with proper permissions can modify data

## Testing Checklist

### Test Public Preview (Read-Only)
- [ ] Go to `/preview-wheel/{wheelId}` (get ID from public share link)
- [ ] Click on an activity
- [ ] **VERIFY**: Tooltip shows activity details
- [ ] **VERIFY**: NO edit button visible
- [ ] **VERIFY**: NO delete button visible
- [ ] **VERIFY**: Cannot open edit modal
- [ ] Try clicking multiple activities
- [ ] Navigate between years (if multi-page)
- [ ] **VERIFY**: All remain read-only

### Test Authenticated Edit Mode
- [ ] Go to `/wheel/{wheelId}` (logged in)
- [ ] Click on an activity
- [ ] **VERIFY**: Tooltip shows edit AND delete buttons
- [ ] **VERIFY**: Can open edit modal
- [ ] **VERIFY**: Can modify activities
- [ ] **VERIFY**: Can delete activities

### Test Edge Cases
- [ ] Open preview page, then try to manually navigate to edit route → Should redirect to login
- [ ] Open preview page in incognito → Should work, read-only
- [ ] Share preview link with another user → They see read-only version

## Files Modified

1. **src/components/ItemTooltip.jsx**
   - Line 3: Added `readonly = false` parameter
   - Lines 88-105: Wrapped action buttons in `{!readonly && (...)}` conditional

2. **src/YearWheel.jsx**
   - Line 22: Added `readonly = false` parameter
   - Line 453: Passed `readonly={readonly}` to ItemTooltip
   - Line 458: Added `&& !readonly` condition to EditAktivitetModal

3. **src/components/PreviewWheelPage.jsx**
   - No changes (already correct - passes `readonly={true}` on line 179)

## Visual Changes

### Before (Security Issue):
```
Public Preview Page
┌─────────────────────────┐
│ Click Activity →        │
│ ┌─────────────────────┐ │
│ │ Activity Details    │ │
│ │ [Edit] [Delete] ❌  │ │  ← DANGEROUS!
│ └─────────────────────┘ │
└─────────────────────────┘
```

### After (Secure):
```
Public Preview Page
┌─────────────────────────┐
│ Click Activity →        │
│ ┌─────────────────────┐ │
│ │ Activity Details    │ │
│ │ (Read-only)     ✅  │ │  ← SAFE!
│ └─────────────────────┘ │
└─────────────────────────┘

Edit Mode (Authenticated)
┌─────────────────────────┐
│ Click Activity →        │
│ ┌─────────────────────┐ │
│ │ Activity Details    │ │
│ │ [Edit] [Delete] ✅  │ │  ← AVAILABLE
│ └─────────────────────┘ │
└─────────────────────────┘
```

## Related Security Considerations

### Already Protected:
- ✅ Database writes require authentication (Supabase RLS)
- ✅ Edge functions check authentication tokens
- ✅ Protected routes use `ProtectedRoute` wrapper
- ✅ AI Assistant only shown on authenticated routes

### Future Considerations:
- Consider adding visual indicator (lock icon) in tooltip when readonly
- Consider adding "This is a preview" watermark on public pages
- Consider rate limiting on public preview pages
- Consider analytics tracking for public views

## Deployment

No database changes required - this is a **frontend-only security fix**.

```bash
# Changes are ready
git add src/components/ItemTooltip.jsx src/YearWheel.jsx
git commit -m "fix: prevent editing in public preview mode"
git push
```

## Impact

- **Security**: ✅ Critical - Prevents unauthorized modifications via UI
- **User Experience**: ✅ Improved - Clear distinction between view-only and edit modes
- **Performance**: ✅ No impact
- **Breaking Changes**: ❌ None - defaults maintain backward compatibility
