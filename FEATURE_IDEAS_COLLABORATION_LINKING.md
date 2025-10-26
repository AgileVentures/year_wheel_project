# Feature Ideas: Enhanced Collaboration & Wheel Linking

## Overview
This document outlines three interconnected feature concepts that would transform YearWheel from a visualization tool into a comprehensive project management and collaboration platform. These features build on the existing team collaboration foundation and multi-year architecture.

---

## 1. Document Attachments for Activities

### Concept
Allow users to attach files and documents directly to activities/items on the wheel, creating a centralized repository of project-related materials.

### Use Cases
- **Project Planning**: Attach project briefs, specifications, and timelines to project activities
- **HR Management**: Link employment contracts, performance reviews, or training materials to personnel activities
- **Content Production**: Attach content calendars, creative briefs, or draft documents to production activities
- **Board Governance**: Link board papers, minutes, or reports to board meeting activities
- **Compliance**: Store audit documents, certifications, or policy updates alongside compliance activities

### Technical Implementation

#### Database Schema
```sql
-- New table for document attachments
CREATE TABLE item_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  wheel_id UUID NOT NULL REFERENCES year_wheels(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- File metadata
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- MIME type
  file_size BIGINT NOT NULL, -- bytes
  storage_path TEXT NOT NULL, -- Supabase Storage path
  
  -- Organization
  description TEXT,
  category TEXT, -- e.g., 'brief', 'report', 'contract', 'image'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT item_attachments_wheel_id_fkey FOREIGN KEY (wheel_id) REFERENCES year_wheels(id)
);

-- Indexes for performance
CREATE INDEX idx_item_attachments_item_id ON item_attachments(item_id);
CREATE INDEX idx_item_attachments_wheel_id ON item_attachments(wheel_id);
CREATE INDEX idx_item_attachments_uploaded_by ON item_attachments(uploaded_by);
```

#### Storage Strategy
- Use **Supabase Storage** with wheel-scoped buckets: `wheel-attachments/{wheel_id}/{item_id}/{filename}`
- Storage policies based on team membership (can view attachments if team member)
- File size limits: Free tier (10MB per file, 100MB total), Premium (50MB per file, 5GB total)
- Supported formats: PDF, DOCX, XLSX, PPTX, images (PNG, JPG, SVG), text files

#### UI Components
1. **ItemTooltip Enhancement**: Show attachment count badge, click to expand list
2. **AttachmentPanel**: Modal or sidebar showing all attachments for an activity
   - Thumbnail previews for images
   - File name, size, upload date, uploader name
   - Download/delete actions (permission-based)
   - Drag-and-drop upload area
3. **EditItemModal Integration**: "Attachments" tab with upload interface
4. **Visual Indicator**: Small paperclip icon on items with attachments (optional toggle in settings)

#### Premium Feature Considerations
- Free: 2 attachments per item, 50MB total storage
- Premium: Unlimited attachments, 5GB storage per wheel
- Admin dashboards: Storage usage analytics

---

## 2. Team Member Mentions & Notifications

### Concept
Enable users to mention (@mention) team members in activity descriptions and comments, triggering notifications. This facilitates communication without assigning formal ownership.

### Use Cases
- **Coordination**: "Need @sarah to review this before we proceed"
- **FYI Updates**: "Completed design phase, @team-leads please note"
- **Question Routing**: "@john - can you clarify the budget for this?"
- **Acknowledgments**: "Great work on this @maria!"
- **Collaboration Requests**: "@design-team - need input on branding"

### Technical Implementation

#### Database Schema
```sql
-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification content
  type TEXT NOT NULL, -- 'mention', 'assignment', 'comment', 'wheel_share', etc.
  title TEXT NOT NULL,
  message TEXT,
  
  -- Context linking
  wheel_id UUID REFERENCES year_wheels(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES item_comments(id) ON DELETE CASCADE, -- see below
  
  -- Metadata
  triggered_by UUID REFERENCES auth.users(id), -- who caused the notification
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Action link
  action_url TEXT -- deep link to specific item/comment
);

-- Comments/notes on items (new feature)
CREATE TABLE item_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  wheel_id UUID NOT NULL REFERENCES year_wheels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES item_comments(id), -- for threading
  
  -- Mention tracking
  mentioned_users UUID[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- soft delete
);

-- Indexes
CREATE INDEX idx_notifications_user_id_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_wheel_id ON notifications(wheel_id);
CREATE INDEX idx_item_comments_item_id ON item_comments(item_id);
CREATE INDEX idx_item_comments_mentioned_users ON item_comments USING GIN(mentioned_users);
```

#### Mention System Architecture
1. **Frontend Parsing**: Rich text editor with `@` autocomplete
   - Use library like `react-mentions` or `draft-js` with mention plugin
   - Autocomplete shows team members as you type `@`
   - Store mentions as structured data: `{userId: 'uuid', displayName: 'Sarah Johnson'}`

2. **Backend Processing** (Supabase Edge Function):
   ```javascript
   // On comment/description save:
   const mentionedUserIds = extractMentions(content);
   
   // Create notifications for each mentioned user
   for (const userId of mentionedUserIds) {
     await createNotification({
       userId,
       type: 'mention',
       title: `${triggeredBy.name} mentioned you in "${itemName}"`,
       message: content.substring(0, 100) + '...',
       wheelId, itemId, commentId,
       actionUrl: `/wheels/${wheelId}?item=${itemId}`
     });
   }
   
   // Send email notification (configurable per user)
   if (userPreferences.emailOnMention) {
     await sendEmail({
       to: user.email,
       subject: 'You were mentioned in YearWheel',
       template: 'mention_notification',
       data: { ... }
     });
   }
   ```

3. **Real-time Delivery**: Use Supabase Realtime to push notifications to active users
   ```javascript
   // In React app:
   const { data, error } = useRealtimeNotifications(userId);
   ```

#### UI Components
1. **Notification Bell**: Header icon with unread count badge
2. **Notification Dropdown**: Click bell to see list of notifications
   - Mark as read/unread
   - Click to navigate to context (wheel/item/comment)
   - "Mark all as read" action
3. **Item Comments Panel**: Thread-style comment section in ItemTooltip/detail view
   - Reply to comments
   - Edit/delete own comments
   - Visual highlight of mentions
4. **User Preferences**: Settings page to configure notification delivery
   - In-app notifications (always on)
   - Email notifications (on/off for each type)
   - Digest mode (daily summary vs immediate)

#### Alternative: Activity Assignment
Instead of lightweight mentions, implement full assignment:
- Each item can have `assigned_to UUID[]` field
- Assignees get notification when assigned
- Assignees shown as avatar badges on items
- Filter view: "Show only items assigned to me"

**Recommendation**: Implement both - assignments for formal ownership, mentions for lightweight coordination.

---

## 3. Inter-Wheel Linking (Project Hierarchies)

### ✅ STATUS: REFERENCE LINK MVP IMPLEMENTED (Oct 26, 2025)

**Implemented Features:**
- ✅ Database schema with `linked_wheel_id` and `link_type` columns
- ✅ Backend service functions with permission validation
- ✅ AddItemModal: Link selection with live preview
- ✅ EditItemModal: Link management UI
- ✅ Visual indicator: Blue chain link icon (🔗) on linked items
- ✅ ItemTooltip: Displays linked wheel with "Open →" button
- ✅ Navigation: Opens linked wheel in new tab with `?from=` parameter
- ✅ Full i18n support (English + Swedish)
- ✅ Circular reference detection
- ✅ Comprehensive JSDoc type definitions

**Implementation Notes:**
- Migration file: `supabase/migrations/022_ADD_WHEEL_LINKING.sql`
- Currently supports `'reference'` link type only
- `'dependency'` link type reserved for future implementation
- Chain link icon positioned at item start (left edge) to avoid conflicts
- Permission validation via `can_link_to_wheel()` database function

**Next Steps for Dependency Links (Phase 2):**
- Add live status updates from linked wheels
- Implement progress indicators
- Add risk analysis for overdue dependencies

### Concept
Allow activities to link to other wheels, enabling drill-down from high-level planning to detailed project wheels. Creates a hierarchical project management system.

### Use Cases
- **Portfolio Management**: Executive wheel shows all projects as activities, each links to detailed project wheel
- **Multi-Year Projects**: Annual planning wheel links to dedicated multi-year project wheels
- **Department Coordination**: Company-wide wheel shows departmental activities, each department has detailed wheel
- **Client Management**: Agency wheel shows client accounts, each client has dedicated wheel for deliverables
- **Product Roadmap**: Product strategy wheel links to feature-specific wheels with sprint planning

### Visual Example
```
Corporate Strategy 2025 Wheel (High-level)
├── Q1-Q2: "Project Phoenix" [Link to Phoenix Project Wheel]
├── Q2-Q4: "Product Launch Alpha" [Link to Alpha Launch Wheel]
└── Year-round: "HR Transformation" [Link to HR Program Wheel]

Phoenix Project Wheel (Detailed)
├── Ring 1 (Discovery): Research activities, user interviews
├── Ring 2 (Design): Wireframes, prototypes, testing
├── Ring 3 (Development): Sprint 1-8 with specific features
└── Ring 4 (Launch): Marketing, training, rollout
```

### Technical Implementation

#### Database Schema
```sql
-- Add linked_wheel_id to items table
ALTER TABLE items
ADD COLUMN linked_wheel_id UUID REFERENCES year_wheels(id) ON DELETE SET NULL,
ADD COLUMN link_type TEXT CHECK (link_type IN ('detail', 'reference', 'dependency'));

-- Index for lookups
CREATE INDEX idx_items_linked_wheel_id ON items(linked_wheel_id);

-- Breadcrumb/navigation tracking (optional)
CREATE TABLE wheel_navigation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  wheel_id UUID NOT NULL REFERENCES year_wheels(id),
  from_wheel_id UUID REFERENCES year_wheels(id),
  from_item_id UUID REFERENCES items(id),
  visited_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Link Types
1. **Detail Link** (`detail`): This item represents a project with full details in another wheel
   - Most common use case
   - Visual indicator: "🔗 View Details" button
   - Opens linked wheel in same window/tab

2. **Reference Link** (`reference`): Informational link to related wheel
   - Example: "See marketing calendar for promotion details"
   - Opens in new tab/window
   - Lighter visual treatment

3. **Dependency Link** (`dependency`): This item depends on completion of another wheel's activities
   - Advanced feature for future implementation
   - Could show progress/status from linked wheel
   - Risk analysis: highlight if linked wheel is behind schedule

#### UI Components
1. **ItemTooltip Enhancement**:
   ```
   Project Phoenix (Q1-Q2)
   Duration: Jan 15 - Jun 30
   
   [🔗 Open Project Details →]
   
   Quick Stats from Linked Wheel:
   ✓ 12/24 activities completed
   ⚠ 3 activities overdue
   ```

2. **Link Selection Modal** (in AddItemModal/EditItemModal):
   - "Link to Another Wheel" section
   - Dropdown/searchable list of accessible wheels
   - Preview card of selected wheel
   - Link type selector (detail/reference)

3. **Linked Item Visual Indicator**:
   - Small chain link icon (🔗) on items with links
   - Optional: Show thumbnail of linked wheel in tooltip
   - Hover shows preview of linked wheel structure

4. **Breadcrumb Navigation**:
   ```
   Strategy 2025 > Project Phoenix > Sprint Planning > Current View
   ```
   - Appears at top of editor when navigating through links
   - Click any crumb to navigate back
   - Browser back button also works (update URL route)

5. **Linked Wheels Panel** (new sidebar view):
   - Shows all wheels that link TO current wheel (backlinks)
   - Shows all wheels current wheel links TO (outgoing links)
   - Visual graph view of wheel relationships (advanced)

#### Permission Handling
**Key Challenge**: What if user doesn't have access to linked wheel?

**Solutions**:
1. **Link Creation Validation**: Only allow linking to wheels user can access
2. **Graceful Degradation**: If permissions revoked later, show:
   ```
   🔒 Linked Wheel (Access Required)
   Request access from [wheel owner]
   [Send Access Request]
   ```
3. **Inherited Access** (Optional Premium Feature): 
   - If item links to wheel B, team members can request temporary view-only access to wheel B
   - Owner of wheel B gets notification: "User X needs access to linked wheel for context"

#### URL Routing
```
/wheels/:wheelId                    // Current behavior
/wheels/:wheelId/items/:itemId      // Deep link to specific item
/wheels/:wheelId?from=:fromWheelId  // Track navigation path
```

#### Data Synchronization Considerations
**Question**: Should linked items show real-time status from linked wheel?

**Option A - Static Link** (MVP):
- Just a navigation link, no data sync
- User clicks to see details

**Option B - Live Status** (Advanced):
- Show completion percentage from linked wheel
- Show overdue indicator if linked wheel has issues
- Update in real-time via Supabase Realtime
- More complex, but powerful for portfolio management

**Recommendation**: Start with Option A, add Option B as premium feature.

---

## Cross-Feature Synergies

### Combined Power Examples

**Example 1: Project Management**
```
Activity: "Website Redesign" (Q2)
- Linked Wheel: "Website Redesign Project 2025" (detailed tasks)
- Attachments: 
  - Design Brief.pdf
  - Brand Guidelines.pdf
  - Technical Spec.docx
- Assigned: @sarah (Project Lead)
- Comments:
  - @john: "Budget approved, proceed with vendor selection"
  - @design-team: "Please review attached brand guidelines"
```

**Example 2: Executive Dashboard**
```
CEO's Annual Wheel
├── "Digital Transformation" (linked to detailed program wheel)
│   └── Status: 45% complete (pulled from linked wheel)
│   └── Alert: 2 initiatives behind schedule
├── "Market Expansion" (linked to expansion program wheel)
│   └── Attachments: Market Research Report Q1.pdf
│   └── @cfo mentioned in latest update
└── "Talent Acquisition" (linked to HR program wheel)
    └── 12 new team members (pulled from linked wheel stats)
```

### Implementation Priority Recommendation

**Phase 1 - Foundation** (2-3 weeks):
1. Document attachments (basic: upload, download, delete)
2. Mention system infrastructure (parsing, notifications table)
3. Inter-wheel linking (basic navigation)

**Phase 2 - Polish** (2-3 weeks):
4. Notification UI (bell, dropdown, email integration)
5. Comments system with threading
6. Link type variants (detail/reference)

**Phase 3 - Advanced** (3-4 weeks):
7. Attachment previews and versioning
8. Live status from linked wheels
9. Visual graph of wheel relationships
10. Assignment system with workload tracking

---

## Premium Tier Differentiation

### Free Tier
- 2 attachments per item, 50MB total storage
- Basic mentions (in-app notifications only)
- Link to up to 2 other wheels
- Basic comments (no threading)

### Premium Tier
- Unlimited attachments, 5GB storage per wheel
- Full notification system (email, digest modes)
- Unlimited inter-wheel linking
- Threaded comments with @mentions
- Live status updates from linked wheels
- Visual relationship graphs
- Assignment tracking and workload views
- Attachment versioning and history

---

## Technical Risks & Considerations

### 1. Storage Costs
- Attachments will increase storage usage significantly
- Mitigation: Enforce limits, implement storage usage dashboard, consider CDN for frequently accessed files

### 2. Notification Overload
- Users could get bombarded with mentions
- Mitigation: Smart digest mode, user preferences, "Do Not Disturb" mode

### 3. Circular Linking
- Wheel A → Wheel B → Wheel A (infinite loop)
- Mitigation: Detect circular references on link creation, limit depth to 3-4 levels

### 4. Performance at Scale
- Loading items with attachments/comments/links could be slow
- Mitigation: Lazy loading, pagination, database indexes, caching

### 5. Permission Complexity
- Linked wheels with different team members = complex permission scenarios
- Mitigation: Clear access request flows, audit logging

---

## Open Questions for Product Decision

1. **Attachment Preview**: Should we generate thumbnails/previews, or just show file icons?
2. **Comment Privacy**: Should comments be editable by item owner, or only by commenter?
3. **Link Visualization**: Do we need a graph view showing all wheel relationships, or is breadcrumb enough?
4. **Assignment vs Mention**: Implement both, or start with one? Which is more valuable?
5. **Mobile Support**: How do these features work on mobile devices? (especially file uploads)
6. **API Access**: Should linked wheels be accessible via API for external integrations?

---

## Success Metrics

### Document Attachments
- Adoption: % of items with at least 1 attachment
- Engagement: Average attachments per active wheel
- Storage usage trends
- Premium conversion: Users upgrading for storage limits

### Mentions & Notifications
- Adoption: % of team wheels using mentions
- Engagement: Average mentions per week per user
- Notification open rate
- Email notification opt-in rate

### Inter-Wheel Linking
- Adoption: % of wheels with at least 1 outgoing link
- Depth: Average navigation depth (levels traversed)
- Navigation patterns: Most common link paths
- Premium conversion: Users upgrading for unlimited linking

---

## Conclusion

These three features work synergistically to transform YearWheel from a visualization tool into a collaborative project management platform. They leverage the existing multi-year architecture and team collaboration foundation while adding powerful new capabilities for document management, communication, and hierarchical planning.

**Recommended Next Steps**:
1. User research: Validate these concepts with 5-10 existing premium users
2. Create detailed wireframes/mockups for each feature
3. Break down into specific GitHub issues with technical specs
4. Implement Phase 1 features as MVP
5. Gather feedback and iterate before Phase 2

The document attachment and mention systems are relatively independent and could be implemented in parallel, while inter-wheel linking should come after those are stable (to avoid compounding complexity).
