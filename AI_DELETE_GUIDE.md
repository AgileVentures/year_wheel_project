# AI Assistant Delete Functions - Guide

## Overview

The AI assistant now supports **safe deletion** of wheels elements with **mandatory user confirmation**.

## Delete Functions

### 1. Delete Items (Activities)

**Command examples:**
```
Ta bort aktiviteten "Produktlansering"
Radera alla aktiviteter med namnet "möte"
Ta bort den aktivitet jag skapade i mars
```

**How it works:**
- AI searches for items by name (case-insensitive, partial match)
- AI will **ALWAYS ask for confirmation** before deleting
- Shows what will be deleted (name, count)
- Waits for explicit "ja", "ok", or similar confirmation

**Example conversation:**
```
User: Ta bort produktlansering i mars
AI: Jag hittade 2 aktiviteter med namnet "Produktlansering":
    - Produktlansering (2025-03-15 till 2025-03-30)
    - Produktlansering (2025-03-20 till 2025-03-25)
    Är du säker på att du vill ta bort dessa 2 aktiviteter?

User: ja
AI: ✅ 2 aktiviteter raderade: Produktlansering, Produktlansering
```

### 2. Delete Ring

**Command examples:**
```
Ta bort ringen "Projekt"
Radera yttre ring 2
```

**How it works:**
- AI finds ring by ID or name
- **WARNING**: Deletes ALL activities on that ring
- AI will **ALWAYS ask for confirmation** and explain consequences
- Shows count of activities that will also be deleted

**Example conversation:**
```
User: Ta bort ringen "Projekt"
AI: OBS! Om jag tar bort ringen "Projekt" kommer även 15 aktiviteter på den ringen att raderas.
    Är du säker på att du vill fortsätta?

User: nej, avbryt
AI: Ok, jag avbryter raderingen. Ringen "Projekt" och dess aktiviteter behålls.
```

### 3. Delete Activity Group

**Command examples:**
```
Ta bort aktivitetsgruppen "Marknadsföring"
Radera gruppen för projekt
```

**How it works:**
- AI finds activity group by ID or name
- **WARNING**: Deletes ALL activities in that group
- AI will **ALWAYS ask for confirmation** and explain consequences
- Shows count of activities that will also be deleted

**Example conversation:**
```
User: Ta bort aktivitetsgruppen "Marknadsföring"
AI: OBS! Om jag tar bort aktivitetsgruppen "Marknadsföring" kommer även 8 aktiviteter i gruppen att raderas.
    Är du säker på att du vill fortsätta?

User: ja, gör det
AI: ✅ Aktivitetsgrupp "Marknadsföring" raderad (8 aktiviteter också borttagna)
```

## Safety Features

### Mandatory Confirmation
The AI is **programmed to ALWAYS confirm** before deleting:
- Tool descriptions include explicit instructions to ask first
- System prompt emphasizes confirmation requirement
- AI won't execute delete tools without user approval

### Clear Communication
AI will:
- List what will be deleted (names, counts)
- Explain cascading deletions (e.g., "all activities on ring will be deleted")
- Wait for explicit confirmation words: "ja", "ok", "gör det", etc.
- Abort if user says "nej", "avbryt", "vänta", etc.

### Cascade Warnings
When deleting containers (rings, activity groups):
- AI explains that child items will also be deleted
- Shows count of affected items
- Gives user chance to back out

## Technical Implementation

### aiDeleteItems()
```javascript
export const aiDeleteItems = async (wheelId, { itemName, itemIds }) => {
  // Search by name (case-insensitive) or IDs
  // Returns: { success, deletedCount, deletedItems, message }
}
```

**Parameters:**
- `itemName` (optional): Partial name search (e.g., "produkt" matches "Produktlansering")
- `itemIds` (optional): Array of specific item IDs

**Returns:**
- List of deleted items with names
- Count of deletions
- Success/error message

### aiDeleteRing()
```javascript
export const aiDeleteRing = async (wheelId, { ringId }) => {
  // Deletes ring + all items on ring
  // Returns: { success, message }
}
```

**Cascade deletion:**
- Removes ring from `rings` array
- Removes all items where `item.ringId === ringId`
- Updates both database tables and `wheel_pages.organization_data`

### aiDeleteActivityGroup()
```javascript
export const aiDeleteActivityGroup = async (wheelId, { activityGroupId }) => {
  // Deletes group + all items in group
  // Returns: { success, message }
}
```

**Cascade deletion:**
- Removes activity group from `activityGroups` array
- Removes all items where `item.activityId === activityGroupId`
- Updates both database tables and `wheel_pages.organization_data`

## AI Tool Definitions

### deleteItems Tool
```javascript
{
  description: 'Ta bort aktiviteter/händelser. VIKTIGT: Dubbelkolla ALLTID med användaren innan radering! Fråga "Är du säker på att du vill ta bort X aktivitet(er)?" och vänta på bekräftelse.',
  inputSchema: z.object({
    itemName: z.string().optional().describe('Namnet på aktiviteten'),
    itemIds: z.array(z.string()).optional().describe('Array av item IDs')
  })
}
```

### deleteRing Tool
```javascript
{
  description: 'Ta bort en ring (och ALLA aktiviteter på den ringen). VIKTIGT: Dubbelkolla ALLTID med användaren innan radering! Förklara att alla aktiviteter på ringen också raderas.',
  inputSchema: z.object({
    ringId: z.string().describe('Ring ID från kontext')
  })
}
```

### deleteActivityGroup Tool
```javascript
{
  description: 'Ta bort en aktivitetsgrupp (och ALLA aktiviteter i gruppen). VIKTIGT: Dubbelkolla ALLTID med användaren innan radering! Förklara att alla aktiviteter i gruppen också raderas.',
  inputSchema: z.object({
    activityGroupId: z.string().describe('Aktivitetsgrupp ID från kontext')
  })
}
```

## System Prompt Safety Rules

The AI receives these explicit instructions:

```
VIKTIGT - Raderingsregler:
- Innan du raderar NÅGONTING, fråga ALLTID användaren om bekräftelse
- Förklara vad som kommer att raderas (antal aktiviteter, vilka objekt, etc.)
- Vänta på explicit bekräftelse ("ja", "ok", "gör det", etc.) innan du kallar delete-verktyg
- Om användaren säger "nej" eller är osäker, avbryt raderingen
```

## Database Updates

All delete operations update **BOTH**:
1. **Individual tables** (`items`, `rings`, `activity_groups`) via `saveWheelData()`
2. **`wheel_pages.organization_data`** JSON column directly

This ensures:
- UI immediately reflects deletions
- Database is properly cleaned up
- No orphaned records

## Testing

### Test Delete Items
```
User: Skapa två aktiviteter med namnet "test" i januari
AI: [creates activities]
User: Ta bort alla aktiviteter med namnet "test"
AI: Jag hittade 2 aktiviteter med namnet "test". Är du säker på att du vill ta bort dessa?
User: ja
AI: ✅ 2 aktiviteter raderade
```

### Test Abort Deletion
```
User: Ta bort ringen "Projekt"
AI: OBS! Detta kommer att radera 10 aktiviteter också. Är du säker?
User: nej
AI: Ok, jag avbryter. Ingenting raderat.
```

### Test Cascade Warning
```
User: Radera aktivitetsgruppen "Marknadsföring"
AI: Det finns 5 aktiviteter i denna grupp som också kommer raderas. Fortsätt?
User: ok
AI: ✅ Aktivitetsgrupp "Marknadsföring" raderad (5 aktiviteter också borttagna)
```

## Best Practices

### For Users
1. **Be specific**: "Ta bort produktlansering i mars" is better than "ta bort den där"
2. **Confirm carefully**: AI will explain what's being deleted - read it!
3. **Use undo**: If you accidentally confirm, you can manually re-create items

### For AI Prompt Engineering
1. **Always list items** before asking confirmation
2. **Show counts**: "2 aktiviteter", "15 items på ringen"
3. **Explain cascades**: "Detta kommer också ta bort X aktiviteter"
4. **Wait for clear yes/no**: Don't assume confirmation from vague responses

## Troubleshooting

### "Inga aktiviteter hittades"
- Check spelling of activity name
- Try partial name: "produkt" instead of "Produktlansering Extra"
- Ask AI to list all activities first: "Visa alla aktiviteter"

### Deletion didn't work
- Check console for errors
- Verify AI asked for confirmation (it should always ask)
- Refresh browser to see if change persisted
- Check if correct wheel is open

### Too many items deleted
- AI should have warned about cascade deletions
- Check if you confirmed deletion of ring/group (deletes children)
- Use manual undo: re-create deleted items through UI

## Future Enhancements

Potential improvements:
- **Undo stack**: "Ångra senaste radering"
- **Soft delete**: Mark as deleted instead of permanent removal
- **Trash bin**: 30-day recovery window
- **Batch operations**: "Ta bort alla aktiviteter i januari"
- **Pattern matching**: "Ta bort alla möten"

## Summary

✅ **Safe deletion** with mandatory confirmation
✅ **Clear warnings** about cascade deletions
✅ **Intelligent search** by name or ID
✅ **Immediate UI updates** via dual database sync
✅ **Robust error handling** with helpful messages

The AI will **never delete without asking first**! 🛡️
