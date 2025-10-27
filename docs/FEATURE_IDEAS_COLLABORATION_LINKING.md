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

---

## 4. Unified Activity Feed & Direct Messaging System

### ✅ STATUS: COMMENTS & MENTIONS IMPLEMENTED (Oct 26, 2025)

**Completed Foundation:**
- ✅ Item-level comments with @mentions
- ✅ Wheel-level comments (general discussion)
- ✅ Notification system (in-app with unread badges)
- ✅ Real-time updates via Supabase Realtime
- ✅ Threading/reply support on all comments
- ✅ WheelCommentsPanel with filtering and navigation

**Next Phase: Aggregated Activity Feed & Messaging**

### Concept
Create a unified communication hub combining:
1. **Activity Feed Dashboard**: Aggregated view of all comments/mentions across accessible wheels
2. **Direct Messaging**: User-to-user and broadcast messaging system
3. **Unified Inbox**: Single place for all notifications, comments, and messages

### Use Cases

#### Activity Feed
- **Dashboard View**: See all recent comments on wheels you own or belong to
- **Mentions Filter**: View only comments that @mention you
- **Team Activity**: Track what team members are discussing across projects
- **Quick Navigation**: Click any comment to jump to source (wheel/item)
- **Unread Tracking**: Mark comments as read/unread for follow-up

#### Direct Messaging
- **Admin Broadcasts**: System-wide announcements to all users
  - "System maintenance scheduled for Sunday 2am"
  - "New feature announcement: Document attachments now available"
  - "Premium plan changes effective next month"
  
- **Admin → User**: Individual support/moderation messages
  - "Your support ticket has been resolved"
  - "Account upgrade successful"
  - "Action required: Verify your email"

- **User → Team Members**: Team collaboration
  - "Quick question about the Q2 timeline"
  - "Can you review my latest changes?"
  - Direct message anyone in your teams

- **User → Wheel Collaborators**: Project-specific communication
  - Message anyone with access to shared wheels
  - Doesn't require formal team membership

### Technical Implementation

#### Database Schema
```sql
-- Extend notifications table (already exists from migration 023)
-- Add message_type to distinguish notification types
ALTER TABLE notifications
ADD COLUMN message_type TEXT DEFAULT 'system' 
  CHECK (message_type IN ('system', 'mention', 'comment', 'assignment', 'direct_message', 'broadcast'));

-- Direct messages table (separate from notifications for threading)
CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Participants
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for broadcast
  
  -- Message content
  subject TEXT,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('direct', 'broadcast', 'team')),
  
  -- Context (optional - if related to specific wheel/item)
  wheel_id UUID REFERENCES year_wheels(id) ON DELETE SET NULL,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  
  -- Threading
  thread_id UUID REFERENCES direct_messages(id), -- first message in thread
  parent_message_id UUID REFERENCES direct_messages(id), -- reply to specific message
  
  -- Status tracking
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  delivered BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  
  -- Soft delete
  deleted_by_sender BOOLEAN DEFAULT FALSE,
  deleted_by_recipient BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message recipients for broadcasts (one row per recipient)
CREATE TABLE message_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  deleted BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(message_id, recipient_id)
);

-- User message preferences
CREATE TABLE user_message_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Who can message this user
  allow_messages_from TEXT DEFAULT 'team_members' 
    CHECK (allow_messages_from IN ('everyone', 'team_members', 'admins_only', 'nobody')),
  
  -- Notification preferences
  email_on_direct_message BOOLEAN DEFAULT TRUE,
  email_on_mention BOOLEAN DEFAULT TRUE,
  email_on_broadcast BOOLEAN DEFAULT TRUE,
  email_digest_frequency TEXT DEFAULT 'immediate'
    CHECK (email_digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'never')),
  
  -- Do not disturb mode
  do_not_disturb BOOLEAN DEFAULT FALSE,
  dnd_start_time TIME, -- e.g., 22:00
  dnd_end_time TIME,   -- e.g., 08:00
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_direct_messages_sender_id ON direct_messages(sender_id);
CREATE INDEX idx_direct_messages_recipient_id ON direct_messages(recipient_id);
CREATE INDEX idx_direct_messages_thread_id ON direct_messages(thread_id);
CREATE INDEX idx_direct_messages_created_at ON direct_messages(created_at DESC);
CREATE INDEX idx_message_recipients_recipient_id_read ON message_recipients(recipient_id, read);
```

#### RLS Policies
```sql
-- Direct messages: users can view messages they sent or received
CREATE POLICY "Users can view their messages"
  ON direct_messages FOR SELECT
  USING (
    sender_id = auth.uid() 
    OR recipient_id = auth.uid()
    OR (message_type = 'broadcast' AND id IN (
      SELECT message_id FROM message_recipients WHERE recipient_id = auth.uid()
    ))
  );

-- Only sender can create messages
CREATE POLICY "Users can send messages"
  ON direct_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Users can mark their received messages as read
CREATE POLICY "Users can mark messages as read"
  ON direct_messages FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Admin broadcast policy
CREATE POLICY "Admins can send broadcasts"
  ON direct_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() 
    AND message_type = 'broadcast'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
```

#### Helper Functions
```sql
-- Check if user A can message user B
CREATE OR REPLACE FUNCTION can_message_user(p_sender_id UUID, p_recipient_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_preference TEXT;
  v_is_admin BOOLEAN;
  v_share_team BOOLEAN;
BEGIN
  -- Check if sender is admin
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = p_sender_id;
  IF v_is_admin THEN RETURN TRUE; END IF;
  
  -- Get recipient preferences
  SELECT allow_messages_from INTO v_preference 
  FROM user_message_preferences 
  WHERE user_id = p_recipient_id;
  
  -- Default to team_members if no preference set
  v_preference := COALESCE(v_preference, 'team_members');
  
  IF v_preference = 'nobody' THEN RETURN FALSE; END IF;
  IF v_preference = 'admins_only' THEN RETURN FALSE; END IF;
  IF v_preference = 'everyone' THEN RETURN TRUE; END IF;
  
  -- Check if they share a team
  IF v_preference = 'team_members' THEN
    SELECT EXISTS (
      SELECT 1 FROM team_members tm1
      INNER JOIN team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = p_sender_id AND tm2.user_id = p_recipient_id
    ) INTO v_share_team;
    RETURN v_share_team;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send broadcast message to all users or specific teams
CREATE OR REPLACE FUNCTION send_broadcast_message(
  p_sender_id UUID,
  p_subject TEXT,
  p_content TEXT,
  p_team_ids UUID[] DEFAULT NULL -- NULL = all users
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
  v_recipient_id UUID;
BEGIN
  -- Check if sender is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_sender_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can send broadcast messages';
  END IF;
  
  -- Create the message
  INSERT INTO direct_messages (sender_id, subject, content, message_type)
  VALUES (p_sender_id, p_subject, p_content, 'broadcast')
  RETURNING id INTO v_message_id;
  
  -- Add recipients
  IF p_team_ids IS NULL THEN
    -- All users
    INSERT INTO message_recipients (message_id, recipient_id)
    SELECT v_message_id, id FROM auth.users WHERE id != p_sender_id;
  ELSE
    -- Specific teams
    INSERT INTO message_recipients (message_id, recipient_id)
    SELECT DISTINCT v_message_id, tm.user_id 
    FROM team_members tm
    WHERE tm.team_id = ANY(p_team_ids) AND tm.user_id != p_sender_id;
  END IF;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### UI Components

#### 1. Activity Feed on Dashboard
```jsx
<Dashboard>
  <ActivityFeed>
    <FilterBar>
      <Select>All Activity | Mentions Only | My Wheels | My Teams</Select>
      <DateRange>Last 7 Days ▼</DateRange>
    </FilterBar>
    
    <ActivityList>
      <ActivityItem>
        <Avatar user="Sarah Johnson" />
        <Content>
          <Text>
            <Strong>Sarah Johnson</Strong> mentioned you in 
            <Link>"Project Phoenix"</Link>
          </Text>
          <Comment>"@you Can you review the Q2 timeline?"</Comment>
          <Metadata>2 hours ago · Activity: Design Sprint</Metadata>
        </Content>
        <Actions>
          <Button>View →</Button>
          <MarkReadButton />
        </Actions>
      </ActivityItem>
      
      <ActivityItem unread>
        <Icon>💬</Icon>
        <Content>
          <Text>
            <Strong>3 new comments</Strong> on 
            <Link>"Marketing Strategy 2025"</Link>
          </Text>
          <Metadata>5 minutes ago</Metadata>
        </Content>
      </ActivityItem>
    </ActivityList>
  </ActivityFeed>
</Dashboard>
```

#### 2. Messages Inbox
```jsx
<MessagesPage>
  <Sidebar>
    <NewMessageButton />
    <MessageFolders>
      <Folder active>Inbox (3)</Folder>
      <Folder>Sent</Folder>
      <Folder>Archived</Folder>
      <Folder>Broadcasts</Folder>
    </MessageFolders>
  </Sidebar>
  
  <MessageList>
    <MessagePreview unread>
      <Avatar user="Admin" badge="admin" />
      <Preview>
        <From>YearWheel System</From>
        <Subject>New Feature: Direct Messaging</Subject>
        <Snippet>You can now send direct messages to team members...</Snippet>
        <Time>10 minutes ago</Time>
      </Preview>
    </MessagePreview>
  </MessageList>
  
  <MessageDetail>
    <Header>
      <Subject>New Feature: Direct Messaging</Subject>
      <Actions>
        <ReplyButton />
        <ArchiveButton />
        <DeleteButton />
      </Actions>
    </Header>
    <MessageContent>
      {/* Full message with threading */}
    </MessageContent>
  </MessageDetail>
</MessagesPage>
```

#### 3. New Message Composer
```jsx
<ComposeModal>
  <RecipientPicker>
    <Label>To:</Label>
    <Select multiple searchable>
      <OptGroup label="Team Members">
        <Option>Sarah Johnson</Option>
        <Option>John Smith</Option>
      </OptGroup>
      <OptGroup label="Wheel Collaborators">
        <Option>Emily Chen (Project Phoenix)</Option>
      </OptGroup>
    </Select>
  </RecipientPicker>
  
  <SubjectInput placeholder="Subject (optional)" />
  
  <MentionInput 
    placeholder="Write your message..."
    multiLine
    rows={10}
  />
  
  <AttachmentSection>
    <LinkWheelButton />
    <LinkItemButton />
  </AttachmentSection>
  
  <Actions>
    <SendButton />
    <DraftButton />
    <CancelButton />
  </Actions>
</ComposeModal>
```

#### 4. Admin Broadcast Interface
```jsx
<AdminPanel>
  <BroadcastSection>
    <Title>Send System Announcement</Title>
    
    <RecipientSelector>
      <Radio checked>All Users</Radio>
      <Radio>Specific Teams</Radio>
      <Radio>Premium Users Only</Radio>
      <Radio>Free Users Only</Radio>
    </RecipientSelector>
    
    <SubjectInput required />
    <MessageEditor />
    
    <PreviewButton>Preview (shows to 123 users)</PreviewButton>
    <SendButton danger>Send Broadcast</SendButton>
  </BroadcastSection>
</AdminPanel>
```

#### 5. Unified Inbox (Combined View)
```jsx
<InboxPage>
  <Tabs>
    <Tab active>All (12)</Tab>
    <Tab>Mentions (3)</Tab>
    <Tab>Comments (7)</Tab>
    <Tab>Messages (2)</Tab>
    <Tab>Notifications (5)</Tab>
  </Tabs>
  
  <UnifiedList>
    {/* Mix of comments, messages, notifications */}
    {/* Sorted by date, with type badges */}
  </UnifiedList>
</InboxPage>
```

### Implementation Phases

#### Phase 1: Activity Feed (2-3 weeks)
- [ ] Create `ActivityFeed.jsx` component on Dashboard
- [ ] Service: `getAggregatedComments(userId, filters)` 
  - Fetch all comments from accessible wheels
  - Filter by mentions, wheels, teams
  - Sort by date, unread status
- [ ] Mark as read functionality
- [ ] Navigation to source (wheel/item)
- [ ] Real-time updates

#### Phase 2: Direct Messaging (3-4 weeks)
- [ ] Database migration for messages tables
- [ ] Service layer: `messageService.js`
  - `sendMessage(recipientId, content, subject)`
  - `getConversation(recipientId)` - thread view
  - `getInbox(filters)` - user's messages
  - `markAsRead(messageId)`
- [ ] UI: Messages page with inbox/sent/archived
- [ ] Composer with recipient picker
- [ ] Threading support
- [ ] Real-time delivery

#### Phase 3: Admin Broadcasts (1-2 weeks)
- [ ] Admin panel section for broadcasts
- [ ] `sendBroadcast()` function with recipient targeting
- [ ] Preview mode showing recipient count
- [ ] Broadcast history/analytics
- [ ] Email integration for broadcasts

#### Phase 4: Unified Inbox (2-3 weeks)
- [ ] Combined view of all communication types
- [ ] Unified search across comments/messages/notifications
- [ ] Smart filters and tags
- [ ] Bulk actions (mark all as read, archive, etc.)
- [ ] Email digest integration

### Permission Matrix

| Action | Free User | Premium User | Team Owner | Admin |
|--------|-----------|--------------|------------|-------|
| View own activity feed | ✅ | ✅ | ✅ | ✅ |
| Send direct message to team member | ✅ (limit: 10/day) | ✅ | ✅ | ✅ |
| Send message to non-team member | ❌ | ✅ | ✅ | ✅ |
| View all team activity | ❌ | ✅ | ✅ | ✅ |
| Send broadcast to team | ❌ | ❌ | ✅ | ✅ |
| Send system-wide broadcast | ❌ | ❌ | ❌ | ✅ |
| Access unified inbox | ❌ | ✅ | ✅ | ✅ |

### Privacy & User Control

#### Message Preferences
Users can control:
- Who can send them messages (everyone, team members only, admins only, nobody)
- Email notification preferences per type
- Digest frequency (immediate, daily, weekly)
- Do Not Disturb schedule

#### Blocking & Reporting
- Block specific users from messaging
- Report spam/abuse to admins
- Admins can see reports and take action

### Email Integration

#### Notification Emails
```html
<EmailTemplate type="mention">
  Subject: Sarah Johnson mentioned you in Project Phoenix
  
  Hi [User Name],
  
  Sarah Johnson mentioned you in a comment on "Project Phoenix":
  
  "@[User Name] Can you review the Q2 timeline?"
  
  [View Comment] [Reply]
  
  Manage your notification settings: [Settings Link]
</EmailTemplate>

<EmailTemplate type="direct_message">
  Subject: New message from Sarah Johnson
  
  Hi [User Name],
  
  You have a new message from Sarah Johnson:
  
  Subject: Q2 Budget Review
  "Can we schedule a quick call to discuss the budget allocation..."
  
  [Read Message] [Reply]
</EmailTemplate>

<EmailTemplate type="broadcast">
  Subject: [System Announcement] New Feature Available
  
  Hi [User Name],
  
  YearWheel has a new feature: Direct Messaging
  
  [Full announcement text]
  
  [Learn More] [Try It Now]
</EmailTemplate>
```

#### Digest Mode
Daily/weekly digest combining all activity:
```
Your YearWheel Activity Digest - [Date]

📬 3 Mentions
- Sarah mentioned you in "Project Phoenix"
- John mentioned you in "Q2 Planning"
- Team discussion in "Marketing Strategy"

💬 7 New Comments
- 4 comments on "Website Redesign"
- 2 comments on "Brand Refresh"
- 1 comment on "Hiring Plan"

📨 2 Direct Messages
- Message from Sarah Johnson
- Message from Admin Team

[View All Activity →]
```

### Analytics & Insights

#### For Users
- Activity heatmap: When you're most active
- Response time: How quickly you respond to mentions
- Engagement: Most discussed wheels/items

#### For Admins
- System-wide activity metrics
- Broadcast open rates
- Most active teams/users
- Response time analytics

### Mobile Considerations

#### Push Notifications
- Real-time push for mentions and direct messages
- Configurable per notification type
- Deep linking to specific comments/messages

#### Mobile UI Adaptations
- Swipe actions for mark as read/archive
- Simplified composer for mobile
- Voice-to-text support
- Offline message drafts

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
