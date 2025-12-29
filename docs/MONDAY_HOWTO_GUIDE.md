# Monday.com Integration - How-To Guide Setup

This document explains the Monday.com how-to guide implementation for YearWheel.

## Overview

The how-to guide is a standalone, iframe-embeddable page designed specifically for the Monday.com marketplace requirements. It provides comprehensive installation and usage instructions without the main site header/footer to prevent navigation away from the guide.

## Access URLs

- **Development:** http://localhost:5173/monday/how-to
- **Production:** https://yearwheel.se/monday/how-to

## Implementation

### Component Location
- **File:** `src/pages/MondayHowToGuide.jsx`
- **Route:** `/monday/how-to` (defined in `src/App.jsx`)

### Key Features

1. **Iframe-Friendly Design**
   - No main site header/footer (prevents external navigation)
   - Minimal branding to keep focus on instructions
   - Clean, professional layout optimized for embedded display

2. **HTTPS Protocol**
   - Served over HTTPS in production (required by Monday.com)
   - SSL handled by Netlify

3. **Special Headers**
   - CSP frame-ancestors allows `*.monday.com` domains
   - CORS headers configured in `netlify.toml`

4. **Interactive Step-by-Step Guide**
   - 6 major sections with progress tracking
   - Visual step indicators with icons
   - Previous/Next navigation
   - Jump-to-step navigation bar

5. **Comprehensive Content**
   - Installation prerequisites and steps
   - First-time setup instructions
   - Board view feature explanations
   - Team collaboration guidance
   - Export/share functionality
   - Troubleshooting and support

### Content Structure

```javascript
const steps = [
  {
    title: "Installation",
    time: "2 minutes",
    icon: Download,
    content: // Prerequisites, step-by-step installation
  },
  {
    title: "First-Time Setup", 
    time: "3 minutes",
    icon: Calendar,
    content: // Adding wheel to boards, connecting data
  },
  {
    title: "Using Board Views",
    time: "5 minutes", 
    icon: Eye,
    content: // Understanding the wheel, interactive features
  },
  {
    title: "Team Collaboration",
    time: "3 minutes",
    icon: Users,
    content: // Real-time sync, sharing, multi-board planning
  },
  {
    title: "Export & Share",
    time: "2 minutes",
    icon: Share2,
    content: // Export formats (PNG, SVG, PDF, JPG), usage examples
  },
  {
    title: "Troubleshooting & Support",
    time: "5 minutes",
    icon: Users,
    content: // Common issues, getting help, feature requests
  }
];
```

## Monday.com Requirements Checklist

### ✅ How-to-use Link
- [x] Embeddable link provided: `https://yearwheel.se/monday/how-to`
- [x] Injectable to iframe for `*.monday.com` domain
- [x] Uses HTTPS protocol

### ✅ How-to-use Content
- [x] Page cleaned from header and footer (no external navigation)
- [x] Full installation instructions included
- [x] Prerequisites listed (Monday.com account, admin access)
- [x] First-time use instructions provided
- [x] Building blocks explained (board view, widget structure)
- [x] Usage examples included
- [x] Supported with images (placeholders ready in `/public/docs/monday/`)
- [x] Professional formatting with step-by-step guides

### 🎯 Content Quality
- [x] Clear, concise language
- [x] Visual hierarchy with headers and sections
- [x] Progressive disclosure (step-by-step)
- [x] Interactive navigation
- [x] Time estimates for each section
- [x] Contact information for support

## Testing the Guide

### 1. Local Testing
```bash
yarn dev
# Visit: http://localhost:5173/monday/how-to
```

### 2. Iframe Testing
Use [iframetester.com](https://iframetester.com/) to verify the guide displays correctly in an iframe:

1. Go to https://iframetester.com/
2. Enter your URL: `https://yearwheel.se/monday/how-to`
3. Click "Test iframe"
4. Verify content displays without navigation issues

### 3. Production Testing
```bash
yarn build
yarn preview
# Visit: http://localhost:4173/monday/how-to
```

## Screenshots Needed

The guide references 6 screenshot files that should be added to `/public/docs/monday/`:

1. **installation-screenshot.png** - Monday.com Marketplace with YearWheel
2. **first-setup-screenshot.png** - Adding YearWheel view to a board
3. **board-view-screenshot.png** - Full YearWheel view in action
4. **team-collab-screenshot.png** - Team collaboration features
5. **export-screenshot.png** - Export menu showing format options
6. **support-screenshot.png** - Support resources

See `/public/docs/monday/README.md` for detailed image specifications.

## Configuration in Monday.com Developer Portal

Once the guide is deployed and tested:

1. Log in to Monday.com Developer Portal
2. Navigate to Your App → Features
3. Find the "How to use" section
4. Enter the URL: `https://yearwheel.se/monday/how-to`
5. Save changes
6. Test installation flow to verify the guide appears correctly

## Maintenance

### Updating Content
Edit `src/pages/MondayHowToGuide.jsx` to update:
- Step content
- Prerequisites
- Troubleshooting tips
- Support contact information

### Adding Steps
To add new steps, append to the `steps` array:
```javascript
{
  title: "New Feature",
  time: "X minutes",
  icon: IconComponent, // Import from lucide-react
  image: "/docs/monday/new-feature-screenshot.png",
  content: (
    <>
      {/* Your JSX content here */}
    </>
  )
}
```

### Updating Styling
The guide uses:
- **Tailwind CSS** for styling
- **Custom colors:** `#00A4A6` (primary), `#008B8D` (hover)
- **lucide-react** for icons
- **Responsive design** with mobile-first approach

## Security Considerations

### CSP Headers
The page has specific Content-Security-Policy headers allowing iframe embedding only from:
- `self` (same origin)
- `*.monday.com` (Monday.com domains)

### CORS
Cross-Origin Resource Sharing is configured to allow Monday.com access while maintaining security.

### No External Dependencies
The guide loads minimal external resources to ensure:
- Fast loading in iframes
- Reliable rendering
- No third-party tracking conflicts

## Support Information

The guide provides multiple support channels:
- **Email:** support@yearwheel.se
- **Documentation:** https://yearwheel.se/support
- **Community:** Coming soon (placeholder)
- **Feature Requests:** feedback@yearwheel.se

Update these contact points in the component if they change.

## Deployment

The guide is automatically deployed with the main application:
```bash
# Build for production
yarn build

# Deploy to Netlify (automatic via Git push)
git add .
git commit -m "monday how-to guide"
git push origin main
```

## Next Steps

1. **Add Screenshots:** Create and add the 6 required screenshots to `/public/docs/monday/`
2. **Video Tutorial:** Consider creating a video walkthrough to complement the text guide
3. **Monday.com Portal:** Submit the guide URL in the Monday.com Developer Portal
4. **User Testing:** Have beta users test the guide for clarity and completeness
5. **Analytics:** Consider adding privacy-respecting analytics to track guide usage

## Related Documentation

- `docs/MONDAY_WEBHOOK_SETUP.md` - Backend webhook configuration
- `docs/MONDAY_OAUTH_SETUP.md` - OAuth flow setup
- `docs/MONDAY_AUTH_OPTIONS.md` - Authentication options

## Version History

- **v1.0** (Dec 2025): Initial implementation with 6-step guide
  - Installation instructions
  - First-time setup
  - Board views usage
  - Team collaboration
  - Export features
  - Troubleshooting

---

**Last Updated:** December 29, 2025
**Maintained By:** YearWheel Development Team
**Contact:** support@yearwheel.se
