# Monday.com App Listing - Quick Reference

**For: Monday.com Developer Portal Configuration**

## How-To Guide URL

```
https://yearwheel.se/monday/how-to
```

### ✅ Verification Checklist
- [x] HTTPS protocol
- [x] Embeddable in iframe for `*.monday.com`
- [x] No external navigation (no header/footer)
- [x] Comprehensive installation guide
- [x] First-time usage instructions
- [x] Tested at https://iframetester.com/

## App Information

### App Name
```
YearWheel - Annual Planning Calendar
```

### Short Description (140 chars)
```
Transform your Monday.com boards into visual annual calendars. See your entire year at a glance with interactive circular planning wheels.
```

### Long Description
```
YearWheel brings powerful visual annual planning to Monday.com. Transform your project boards into interactive circular calendars that display your entire year at a glance.

**Key Features:**
• Circular annual calendar view of all board items
• Automatic syncing with Monday.com boards
• Color-coded by status for quick insights
• Multiple rings for different teams/groups
• Week and month ring for precise date tracking
• Export to PNG, SVG, PDF, or JPG
• Real-time collaboration with team members
• Interactive drag-to-rotate interface
• Click items to open in Monday.com

**Perfect For:**
• Annual strategic planning
• Project timeline visualization
• Resource allocation planning
• Marketing campaign calendars
• HR planning and events
• Multi-team coordination
• Executive reporting

**How It Works:**
1. Install YearWheel from the Monday.com Marketplace
2. Add YearWheel view to any board
3. Your board items automatically appear on the circular calendar
4. Positioned by dates, color-coded by status
5. Interact, export, and share with your team

**Data Privacy:**
YearWheel only reads data from boards where you explicitly add the view. We never access or store sensitive information.
```

### Category
```
Productivity & Planning
```

### Support Email
```
support@yearwheel.se
```

### Privacy Policy URL
```
https://yearwheel.se/legal/privacy-policy
```

### Terms of Service URL
```
https://yearwheel.se/legal/terms-of-service
```

### Website URL
```
https://yearwheel.se
```

## Screenshots for Marketplace

### Required Screenshots (Upload to Monday.com Developer Portal)

1. **Main App Screenshot** (1280x800px)
   - Full YearWheel view showing circular calendar
   - Multiple items distributed across the year
   - Professional, clean interface

2. **Installation Screenshot** (1280x800px)
   - Shows how easy it is to add YearWheel to a board
   - Highlights the "Add View" process

3. **Export Feature** (1280x800px)
   - Shows export options (PNG, SVG, PDF, JPG)
   - Demonstrates versatility for reporting

4. **Team Collaboration** (1280x800px)
   - Multiple team members using the view
   - Real-time updates visible

5. **Settings/Customization** (1280x800px)
   - Shows customization options
   - Year selection, ring visibility, color mapping

### App Icon (512x512px)
- YearWheel logo on transparent or white background
- High contrast, recognizable at small sizes
- PNG format with transparency

## Permissions Required

```json
{
  "scopes": [
    "boards:read",
    "me:read",
    "workspaces:read"
  ]
}
```

### Permission Descriptions
- **boards:read**: Read board structure, items, and metadata to display on the wheel
- **me:read**: Identify the user for personalization
- **workspaces:read**: Access workspace information for team features

## Webhook Configuration

### Installation Webhook
```
https://mmysvuymzabstnobdfvo.supabase.co/functions/v1/monday-webhook
```

**Events to Subscribe:**
- `install` - When app is installed
- `uninstall` - When app is uninstalled
- `subscription_change` - When subscription plan changes (if applicable)

## OAuth Configuration

### Redirect URI
```
https://yearwheel.se/api/monday/callback
```

### Scopes
```
boards:read me:read workspaces:read
```

## Build Configuration

### View Type
```
Board View
```

### View Name
```
YearWheel
```

### View URL (if using custom hosting)
```
https://yearwheel.se/monday/view/{context.boardId}
```

## Features to Highlight in Listing

### 🎯 Visual Planning
"See your entire year in one view - perfect for strategic planning and executive reporting"

### 🔄 Real-Time Sync
"Changes in Monday.com automatically update on the wheel - no manual updates needed"

### 🎨 Automatic Color-Coding
"Status colors transfer from Monday.com to provide instant visual insights"

### 📊 Multiple Export Formats
"Export to PNG, SVG, PDF, or JPG for presentations, reports, and printing"

### 👥 Team Collaboration
"Share wheels with your team using Monday.com's existing permissions"

### ⚡ Easy Setup
"Add to any board with one click - no configuration required to get started"

## Support Resources

### Help Center
```
https://yearwheel.se/support
```

### Video Tutorial (when available)
```
https://yearwheel.se/tutorials/monday-integration
```

### FAQ Page
```
https://yearwheel.se/support#faq
```

## Pricing Information

### Free Tier
- Up to 2 wheels
- Basic features
- Export in standard resolution
- Community support

### Premium Tier ($X/month)
- Unlimited wheels
- High-resolution exports
- Priority support
- Advanced customization options
- Team collaboration features

**Note:** Update pricing based on final business model

## Testing Instructions for Reviewers

1. Install app from Monday.com Marketplace
2. Open any board with date columns
3. Click "+" to add view → Select "YearWheel"
4. Board items appear automatically on circular calendar
5. Test interactions:
   - Hover over items for details
   - Click items to open in Monday.com
   - Rotate the wheel
   - Export to different formats
6. Make changes in Monday.com board
7. Verify changes reflect in YearWheel view

## Marketing Taglines

### Primary
```
"Your Year. One View. Infinite Possibilities."
```

### Secondary Options
```
"Annual Planning, Visualized"
"See the Big Picture, Plan the Details"
"From Linear to Circular: Transform Your Planning"
```

## Keywords for Discovery

```
annual planning, yearly calendar, project visualization, timeline view, 
strategic planning, visual planning, circular calendar, gantt alternative,
resource planning, marketing calendar, project timeline, visual analytics
```

## App Store Optimization

### Title (50 chars)
```
YearWheel - Annual Planning Calendar for Monday
```

### Subtitle (80 chars)
```
Transform boards into visual annual calendars. See your entire year at a glance.
```

## Social Media Assets

### Twitter Description
```
Introducing YearWheel for @monday! Transform your boards into stunning circular annual calendars. Perfect for strategic planning, project timelines, and team coordination. 

Try it now: https://yearwheel.se/monday
```

### LinkedIn Description
```
Exciting news! YearWheel is now available on Monday.com 🎉

Transform your Monday.com boards into interactive circular annual calendars. Perfect for:
• Strategic planning
• Project timeline visualization
• Resource allocation
• Marketing calendars
• Executive reporting

Key features:
✓ Real-time sync with Monday.com
✓ Automatic color-coding by status
✓ Export to PNG, SVG, PDF, JPG
✓ Team collaboration built-in
✓ One-click installation

See the full year at a glance and make better planning decisions.

Learn more: https://yearwheel.se/monday
```

## Launch Checklist

- [ ] App submitted to Monday.com Developer Portal
- [ ] How-to guide URL configured: `https://yearwheel.se/monday/how-to`
- [ ] Screenshots uploaded (5 images)
- [ ] App icon uploaded (512x512px)
- [ ] Webhook endpoint configured and tested
- [ ] OAuth redirect URI configured
- [ ] Permissions properly scoped
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Support email active: support@yearwheel.se
- [ ] Iframe tested at iframetester.com
- [ ] Installation flow tested end-to-end
- [ ] Export functionality verified
- [ ] Real-time sync verified
- [ ] Documentation complete
- [ ] Beta users testing
- [ ] Marketing materials prepared
- [ ] Social media announcements ready
- [ ] Press release drafted (if applicable)

---

**Last Updated:** December 29, 2025
**Status:** Ready for Submission
**Contact:** support@yearwheel.se
