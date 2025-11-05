# YearWheel Version History - Advanced User Guide

**Purpose**: Complete guide to version control, restoration, and collaboration tracking  
**Audience**: All users (free and premium), team leads, support team  
**Feature Status**: Available to all users

---

## Overview

YearWheel's Version History is a comprehensive versioning system that automatically tracks every change to your wheels, allowing you to:

- View complete history of changes
- ⏪ Restore previous versions
- Compare versions side-by-side
- See who made what changes (team wheels)
- Create manual snapshots (save points)
- Branch from historical versions

**Think of it as "Git for annual planning"** - but simpler and visual.

---

## How Versioning Works

### Automatic Version Creation

**Screenshot: Version timeline showing auto-save points**

YearWheel automatically creates versions when:
- ✅ Any activity is added, edited, or deleted
- ✅ Rings are created, renamed, or removed
- ✅ Activity groups are modified
- ✅ Inner ring content changes
- ✅ Settings are updated (visibility, colors, etc.)

**Frequency:** Every ~30 seconds after a change (debounced to avoid version spam)

**Storage:** Last 50 versions for free users, unlimited for Premium

---

### Manual Snapshots

You can also create manual "save points":
- Before major restructuring
- Before team collaboration session
- After completing quarterly planning
- Before applying AI assistant suggestions

**Screenshot: "Create Snapshot" button in header**

**How to create:**
1. **Click**: Version History icon in header (clock or history icon)
2. **Click**: **"Create Snapshot"** button
3. **Enter description**: "Before Q2 revisions" or "Final 2026 plan"
4. **Click**: **"Save Snapshot"**

Manual snapshots are:
- ⭐ Marked with star badge
- Pinned to top of version list
- Include your custom description
- Never auto-deleted (even when hitting version limits)

---

## Accessing Version History

**Screenshot: Version History button location in editor header**

### Opening Version History:

**Method 1: Header button**
1. **In wheel editor**: Click **"Version History"** button (or icon)
2. **Modal opens**: Full-screen version history interface

**Method 2: Keyboard shortcut**
- **Mac**: `Cmd + H`
- **Windows/Linux**: `Ctrl + H`

**Method 3: Dashboard**
- Right-click wheel card → "View History"

---

## Version History Interface

**Screenshot: Full version history modal with all sections labeled**

### Main components:

**1. Version Timeline (Left Sidebar)**
- Chronological list of versions (newest first)
- Each entry shows:
  - Date and time
  - User who made change (team wheels)
  - Change description (auto or manual)
  - ⭐ Star badge for manual snapshots
  - Version number

**2. Preview Area (Center)**
- Visual preview of selected version's wheel
- Zoom/pan controls
- Toggle ring visibility (as it was in that version)

**3. Details Panel (Right Sidebar)**
- Complete change log for selected version
- Diff view showing what changed
- Metadata (version ID, timestamp, user)
- Action buttons (Restore, Compare, Export)

**4. Action Bar (Bottom)**
- **Restore This Version** button (primary action)
- **Compare Versions** button
- **Export as .yrw** button
- **Close** button

---

## Viewing Version Details

**Screenshot: Version details panel showing change log**

### Change Log Format

Each version's details show:

**Added:**
- ✅ New activity: "Summer Campaign" (Marketing ring, Q2 group)
- ✅ New ring: "Budget Planning"

**Modified:**
- Activity "Spring Launch": Dates changed from Jan 15 - Feb 28 to Jan 20 - March 5
- Ring "Marketing": Renamed from "Marketing & Comm" to "Marketing"
- Activity group "Q1": Color changed from #3B82F6 to #2563EB

**Deleted:**
- ❌ Activity "Old Campaign" removed
- ❌ Ring "Deprecated" removed

### Viewing the Wheel State

**Screenshot: Preview of historical version showing older state**

The preview shows:
- Exactly how the wheel looked at that point in time
- All rings, activities, colors as they were
- Hidden rings are hidden (visibility settings preserved)
- Zoom level and rotation reset to default (for clarity)

**Interactive preview:**
- ✅ Can zoom and pan
- ✅ Can hover to see activity details
- ❌ Cannot edit (read-only)
- ❌ Cannot drag activities

---

## Restoring a Previous Version

**⚠️ IMPORTANT:** Restoring creates a NEW version based on the old one. Current state is not deleted!

**Screenshot: Restore confirmation dialog**

### Restoration Process:

1. **Select version**: Click on version in timeline
2. **Review preview**: Make sure it's the right one
3. **Click**: **"Restore This Version"** button
4. **Confirmation dialog**: Warns that current state will be replaced
   - "Are you sure? Current version will be saved before restoring."
5. **Click**: **"Yes, Restore"**

**What happens:**
1. Current state is saved as a new version (safety backup)
2. Selected historical version's data is copied
3. New version created with restored data
4. You're back in editor with restored state
5. Success message: "Restored version from [date]"

**Screenshot: Success message after restoration**

### After Restoration:

- Current version number increases (e.g., was v47, now v48)
- Version v48 contains data from old version (e.g., v32)
- Version v47 (pre-restoration) still exists in history
- You can "restore the restoration" if you change your mind

**💡 Pro tip:** Create manual snapshot before restoring, name it "Before restore v32"

---

## Comparing Versions

**Screenshot: Version comparison view with side-by-side wheels**

### Side-by-Side Comparison

**How to compare:**
1. **In version history**: Click **"Compare Versions"** button
2. **Select two versions**: 
   - Version A (left side): Usually older version
   - Version B (right side): Usually newer version
3. **Click**: **"Compare"**

**Comparison view shows:**

**Left side (Version A):**
- Wheel visualization as it was
- Timestamp and version number
- Change count from A to B

**Right side (Version B):**
- Wheel visualization as it became
- Timestamp and version number
- Highlights what changed

**Center panel (Diff):**
- Line-by-line changes
- Color coded:
  - 🟢 Green: Added items
  - 🔴 Red: Deleted items
  - 🟡 Yellow: Modified items

**Screenshot: Diff view showing detailed changes**

### Practical Use Cases

**Scenario 1: "What changed since last week?"**
- Compare version from 7 days ago vs current
- See all activities added/removed
- Track team's progress

**Scenario 2: "What did AI assistant change?"**
- Create snapshot before AI apply
- Create snapshot after AI apply
- Compare to see exactly what AI added

**Scenario 3: "Which plan did we present to the board?"**
- Find version from presentation date
- Compare with current to see what's been updated

---

## Team Collaboration Features

**Screenshot: Version list showing different users' contributions**

### User Attribution

For team wheels, each version shows:
- User avatar and name
- 📧 Email (on hover)
- 🕐 Timestamp
- What they changed

**Example timeline:**
```
v47 - Sarah Johnson - 2 hours ago
      Added 3 activities to Q2 ring

v46 - John Smith - 3 hours ago
      Renamed "Marketing" to "Marketing & Sales"

v45 - You - 5 hours ago
      Created snapshot: "Q1 Final Plan"

v44 - AI Assistant - 5 hours ago
      Auto-generated 15 activities
```

### Presence Indicators

**Screenshot: Real-time presence indicators on version timeline**

When multiple users are editing:
- 🟢 Green dot: Currently viewing/editing
- 🔵 Blue dot: Recently active (<5 minutes)
- ⚪ Gray: Offline

Shows who's looking at version history simultaneously!

---

## Auto-Save vs Manual Snapshots

### When to use each:

**Auto-Save (default):**
- ✅ Regular editing work
- ✅ Incremental changes
- ✅ "Just in case" protection
- Automatic, no action needed

**Manual Snapshots:**
- ⭐ Before major restructuring
- ⭐ Milestone completions ("Q1 Final", "Approved Plan")
- ⭐ Before risky operations (bulk delete, AI generation)
- ⭐ Versions you want to easily find later

**Screenshot: Timeline mixing auto-saves and manual snapshots (stars)**

### Snapshot Management

**Features:**
- **Pin to top**: Keep important snapshots easily accessible
- **Custom descriptions**: "Board Presentation Version" vs generic "Version 34"
- **Export individually**: Download .yrw of specific snapshot
- **Share snapshot**: Generate link to view that specific version (read-only)

---

## Version Metadata

Each version stores:

**Core Data:**
- Complete wheel structure (rings, activities, groups, labels)
- Organization data (inner ring content)
- Settings (colors, visibility, orientations)

**Metadata:**
- Version number (sequential)
- Timestamp (ISO 8601 format)
- User ID and name
- Change description
- Is manual snapshot (boolean)
- Parent version ID (for branching)

**Not stored:**
- Zoom level and rotation (reset each time)
- User's personal UI preferences
- Temporary selection states

---

## Advanced: Branching & Merging

**Note:** Full branching/merging is a Premium feature (or future roadmap item)

**Current capability:**
- ✅ Restore old version → creates new branch implicitly
- ✅ Multiple team members can restore different versions
- ❌ Cannot merge divergent branches automatically

**Workaround for merging:**
1. Restore version A
2. Manually copy activities from version B
3. Create snapshot: "Merged A + B"

**Screenshot: Conceptual diagram of version tree with branches**

---

## Performance & Limits

### Version Limits:

**Free Users:**
- Last 50 versions kept
- Older versions auto-deleted (except manual snapshots)
- Manual snapshots never deleted

**Premium Users:**
- Unlimited versions
- Full history retained forever
- Advanced search & filtering

### Storage:

Average version size: ~50-200 KB
- Small wheel (5 rings, 20 activities): ~50 KB
- Large wheel (15 rings, 200 activities): ~200 KB

Premium users: Unlimited storage for versions

### Performance:

- Loading version history: <1 second
- Previewing version: 1-2 seconds
- Restoring version: 2-3 seconds
- Comparing versions: 3-5 seconds

---

## Exporting Versions

**Screenshot: Export options for specific version**

### Why export a version:

- Local backup of important milestones
- 📧 Email to stakeholder for review
- Move to different YearWheel account
- 📦 Archive for compliance/records

### How to export:

1. **Select version** in history
2. **Click**: **"Export This Version"** button (download icon)
3. **Choose format**: .yrw (YearWheel native) or JSON
4. **File downloads**: `wheel-2026-v34.yrw`

### Re-importing:

1. **On Dashboard**: Click "Import Wheel"
2. **Select file**: Choose .yrw file
3. **New wheel created**: With data from that version
4. **Keep original**: Both versions now exist as separate wheels

---

## Troubleshooting

### Issue: "Version history is empty"

**Causes:**
- Very new wheel (no changes yet)
- Database sync issue
- Viewing while offline

**Solutions:**
- Make a change (add activity) to generate first version
- Refresh browser
- Check internet connection

---

### Issue: "Cannot restore version"

**Causes:**
- Permission denied (not owner/admin on team wheel)
- Version data corrupted (rare)
- Wheel is locked (admin lock feature)

**Solutions:**
- Check your role: Members can view but may not restore
- Contact team owner for permission
- Report to support if data corruption suspected

---

### Issue: "Restored wrong version"

**Solution:**
- **Immediate**: Press Ctrl+Z / Cmd+Z (undo)
- **After closing**: Open version history, restore the pre-restoration version
- All versions are preserved, nothing is lost!

**Screenshot: Version list showing restoration chain (v32 → v47 → v48)**

---

### Issue: "Versions not updating in real-time"

**Causes:**
- Realtime subscription disconnected
- Firewall blocking WebSocket
- Supabase realtime channel issue

**Solutions:**
- Refresh page (Cmd+R / Ctrl+R)
- Check browser console for WebSocket errors
- Manual refresh: Click refresh icon in version history

---

## Best Practices

### Do's:

✅ **Create snapshots at milestones**: "Q1 Complete", "Board Approved", "Final 2026 Plan"  
✅ **Descriptive names**: "Before summer restructure" vs "Snapshot 1"  
✅ **Review changes before presenting**: Check version from last week to see what changed  
✅ **Export important versions**: Local backup of critical milestones  
✅ **Restore freely**: You can always restore the current version back

### Don'ts:

❌ **Don't rely on versions as only backup**: Also export .yrw files periodically  
❌ **Don't delete manual snapshots**: They're your save points  
❌ **Don't restore without preview**: Always review before clicking "Restore"  
❌ **Don't spam snapshots**: Create them at meaningful points (not every 5 minutes)

---

## Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|---|---|---|
| Open version history | `Cmd + H` | `Ctrl + H` |
| Close version history | `Esc` | `Esc` |
| Next version | `↓` | `↓` |
| Previous version | `↑` | `↑` |
| Restore selected | `Cmd + Enter` | `Ctrl + Enter` |
| Create snapshot | `Cmd + Shift + S` | `Ctrl + Shift + S` |

---

## Integration with Other Features

### Version History + AI Assistant:

**Workflow:**
1. Create snapshot: "Before AI generation"
2. Use AI assistant to generate activities
3. Review results
4. If not satisfied: Restore snapshot, try different prompt
5. If satisfied: Create snapshot: "After AI - Final"

**Screenshot: Version list showing AI-generated versions**

### Version History + Team Collaboration:

**Use case:** Multiple team members editing simultaneously
- See who changed what in timeline
- Resolve conflicts by comparing versions
- Restore to last known good state if someone makes mistakes

### Version History + Export:

**Archive workflow:**
1. Create snapshot: "2026 Final Approved"
2. Export that specific version as .yrw
3. Store in company records/SharePoint/Drive
4. Continue editing for 2027 planning
5. Can always restore 2026 version from export

---

## FAQ

**Q: Are versions synced across devices?**  
A: Yes! Cloud-based, accessible from any device logged into your account.

**Q: Can I see versions before I added version history feature?**  
A: No, versioning only tracks changes after feature activation.

**Q: Do versions count toward my storage limit?**  
A: Free: 50 versions. Premium: Unlimited. Manual snapshots don't count toward limit.

**Q: Can team members restore versions?**  
A: Depends on role. Owners/Admins: Yes. Members: View only (unless permissions changed).

**Q: What happens if I hit the 50-version limit (free)?**  
A: Oldest auto-saves are deleted (not manual snapshots). Upgrade to Premium for unlimited.

**Q: Can I restore a version from a different wheel?**  
A: No, but you can export from one wheel and import to another.

**Q: Are versions backed up?**  
A: Yes, stored in Supabase with daily backups. Additional local export recommended for critical wheels.

**Q: Can I see timestamps in my local timezone?**  
A: Yes, automatically converted to your browser's timezone.

---

## Future Enhancements (Roadmap)

*Coming features (check latest version):*
- 🔀 **Visual diff**: Side-by-side wheel comparison with highlighted changes
- 📊 **Version analytics**: Activity count trends, change velocity over time
- 🔔 **Version notifications**: Alert when team member restores old version
- **Version comments**: Add notes to versions ("This is the approved plan")
- 🏷️ **Version tags**: Label versions (v2.0, v3.0) for easier navigation
- 🔐 **Version locking**: Prevent restoration of certain versions (compliance)

---

**End of Version History Guide**

*For support: support@yearwheel.com*  
*For recovery assistance: Include version number and timestamp*
