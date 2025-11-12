# Smart Activity Redistribution

## Overview

The AI Assistant can now intelligently redistribute activities across rings based on their semantic meaning, names, and descriptions. This feature uses GPT-4o to analyze activity content and suggest optimal ring placement.

## Use Cases

1. **Semantic Organization**: "Fördela aktiviteterna till de olika ringarna efter ämne"
2. **Empty a Ring**: "Töm ring 1 genom att flytta aktiviteter till rätt ställe"
3. **Reorganize Specific Rings**: "Omfördela alla aktiviteter i ring Projekt"
4. **Preview Changes**: "Föreslå omfördelning av aktiviteter" (dry run mode)

## How It Works

### Analysis Process

1. **Data Collection**: Fetches all rings and activities from the wheel
2. **AI Analysis**: GPT-4o analyzes:
   - Activity names and descriptions
   - Semantic similarity with ring names
   - Logical grouping patterns
   - Ring purpose and type (inner/outer)
3. **Smart Suggestions**: AI proposes redistributions with reasons
4. **Application**: Updates activities to new rings (if not in dry run mode)

### Example Workflow

**User Request:**
```
"Fördela aktiviteterna till de olika ringarna efter ämne. Ring 1 ska bli tom"
```

**AI Process:**
1. Identifies all rings: ["Ring 1", "Marknadsföring", "Försäljning", "Produkt"]
2. Analyzes activities in Ring 1:
   - "Kampanjlansering Q1" → Moves to "Marknadsföring"
   - "Produktdesign" → Moves to "Produkt"
   - "Försäljningsmål" → Moves to "Försäljning"
3. Reports: "✅ Omfördelade 15 aktiviteter baserat på deras innehåll och syfte"

## Tool: `smart_distribute_activities`

### Parameters

```typescript
{
  includeRingNames?: string[] | null,  // Only redistribute FROM these rings
  excludeRingNames?: string[] | null,  // Skip these rings
  dryRun?: boolean                     // Preview without applying (default: false)
}
```

### Examples

#### 1. Full Redistribution
```
User: "Fördela alla aktiviteter efter ämne"
Agent calls: smart_distribute_activities({ dryRun: false })
```

#### 2. Empty Specific Ring
```
User: "Töm ring 1"
Agent calls: smart_distribute_activities({ 
  includeRingNames: ["ring 1"], 
  dryRun: false 
})
```

#### 3. Preview Changes
```
User: "Föreslå omfördelning av aktiviteter i Projekt-ringen"
Agent calls: smart_distribute_activities({ 
  includeRingNames: ["Projekt"], 
  dryRun: true 
})
```

#### 4. Exclude Certain Rings
```
User: "Omfördela aktiviteter men lämna Helgdagar orörd"
Agent calls: smart_distribute_activities({ 
  excludeRingNames: ["Helgdagar"], 
  dryRun: false 
})
```

## Response Format

### Successful Redistribution

```json
{
  "success": true,
  "redistributions": [
    {
      "activityName": "Kampanjlansering Q1",
      "from": "Ring 1",
      "to": "Marknadsföring",
      "reason": "Aktiviteten handlar om marknadsföringskampanj och passar bättre i Marknadsföring-ringen"
    },
    {
      "activityName": "Produktdesign",
      "from": "Ring 1",
      "to": "Produkt",
      "reason": "Produktutveckling ska ligga i Produkt-ringen enligt semantisk logik"
    }
  ],
  "suggested": 15,
  "applied": 15,
  "message": "Omfördelade 15 av 15 aktiviteter"
}
```

### Dry Run Mode

```json
{
  "success": true,
  "redistributions": [...],
  "suggested": 15,
  "applied": 0,
  "message": "Föreslår 15 omfördelningar (kör utan dryRun för att applicera)"
}
```

### No Changes Needed

```json
{
  "success": true,
  "redistributions": [],
  "applied": 0,
  "message": "Alla aktiviteter är redan i optimala ringar - ingen omfördelning behövs!"
}
```

## Integration with Activity Agent

The tool is part of the **Activity Agent**, which handles:
- Creating individual activities
- Updating activities (dates, names, rings, groups)
- Deleting activities
- Querying/filtering activities
- **AI-powered redistribution** (new!)

## Routing from Orchestrator

Requests containing these keywords route to Activity Agent:
- "fördela aktiviteter"
- "omfördela"
- "töm ring"
- "flytta aktiviteter till rätt ställe"
- "organisera aktiviteter efter ämne"

## Implementation Details

### Code Location
- **File**: `supabase/functions/ai-assistant-v2/index.ts`
- **Tool**: `smartDistributeActivitiesTool` (lines ~3710-3920)
- **Agent**: `activityAgent` (includes tool in tools array)

### AI Prompt Strategy

The tool sends GPT-4o:
1. **Available Rings**: List with names, types, colors
2. **Activities to Redistribute**: Names, descriptions, current rings
3. **Instructions**: Analyze semantics, group logically, spread evenly
4. **Output Format**: JSON with activityId, currentRing, suggestedRing, reason

### Database Operations

1. Fetches rings from `wheel_rings` table (wheel-scoped)
2. Fetches activities from `items` table with joins to get current ring names
3. Filters by `includeRingNames` / `excludeRingNames` if provided
4. Updates `ring_id` in `items` table for each redistribution
5. Triggers frontend refresh via `queueRefreshEvent`

## Performance Considerations

- **OpenAI API**: Single GPT-4o call for analysis (~5-10 seconds)
- **Database Updates**: Sequential updates to avoid race conditions
- **Activity Count**: Works efficiently up to ~100 activities
- **Large Wheels**: For 100+ activities, consider filtering by rings

## Security & Validation

- ✅ Scoped to current wheel (wheel_id context)
- ✅ Only visible rings included
- ✅ Validates target rings exist before updating
- ✅ Error handling for missing rings or update failures
- ✅ Metrics tracking for debugging

## Future Enhancements

- [ ] Batch database updates for better performance
- [ ] Support for activity group redistribution
- [ ] User-defined redistribution rules
- [ ] Learning from user corrections
- [ ] Multi-wheel redistribution patterns

## Testing

### Manual Test Cases

1. **Empty Ring Test**
   - Create ring "Test Ring" with 5+ activities
   - Request: "Töm Test Ring"
   - Verify: Activities moved to semantically correct rings

2. **Full Redistribution Test**
   - Wheel with mixed/random ring assignments
   - Request: "Fördela alla aktiviteter efter ämne"
   - Verify: Logical grouping emerges

3. **Dry Run Test**
   - Request: "Föreslå omfördelning"
   - Verify: Suggestions provided, no database changes

4. **Filtered Redistribution Test**
   - Request: "Omfördela aktiviteter i ring X men inte ring Y"
   - Verify: Only ring X activities affected

## Troubleshooting

### Issue: Activities Not Moving

**Possible Causes:**
1. DryRun mode enabled (check dryRun parameter)
2. Activities already in optimal rings (check response message)
3. Ring filter excluding all activities (check includeRingNames)

**Solution:** Call with `dryRun: false` and check filter parameters

### Issue: Wrong Ring Assignments

**Possible Causes:**
1. Ambiguous activity names (e.g., "Meeting" → unclear which ring)
2. Ring names too generic (e.g., "Ring 1", "Ring 2")
3. Missing activity descriptions

**Solution:** 
- Use descriptive ring names ("Marketing", "Product", not "Ring 1")
- Add descriptions to activities for better semantic analysis
- Review dry run suggestions before applying

### Issue: Performance Slow

**Possible Causes:**
1. Large number of activities (100+)
2. OpenAI API latency
3. Sequential database updates

**Solution:**
- Filter by rings: `includeRingNames: ["Ring X", "Ring Y"]`
- Split into multiple smaller redistributions
- Consider off-peak hours for large operations

## Related Documentation

- [AI Assistant V2 Architecture](./AI_ASSISTANT_V2_IMPROVEMENTS.md)
- [Activity Agent Guide](./HOWTO.md)
- [Data Flow Analysis](./DATA_FLOW_ANALYSIS.md)
