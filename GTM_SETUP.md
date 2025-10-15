# Google Tag Manager Setup

## Overview
Google Tag Manager (GTM) has been integrated into the Year Wheel POC application for advanced analytics and tracking.

**Container ID:** `GTM-MX5D5LSB`

## Configuration

### Implementation Method
GTM is loaded directly in `index.html` for optimal performance and SEO. The scripts are:
- **Head script**: Loads GTM asynchronously as early as possible
- **Body noscript**: Fallback for users with JavaScript disabled

### Verification
1. Open your browser console
2. Type: `window.dataLayer`
3. You should see an array with GTM events

No additional configuration needed - it works out of the box!

## Usage

### Automatic Initialization
GTM is automatically initialized when the app loads via `src/main.jsx`.

### Manual Event Tracking
Use the provided utility functions to track custom events:

```javascript
import { trackEvent, trackWheelEvent, trackAuthEvent, trackSubscriptionEvent } from './utils/gtm'

// Track general events
trackEvent('Category', 'Action', 'Label', 123)

// Track year wheel interactions
trackWheelEvent('ItemCreated', { label: 'Activity', value: 1 })
trackWheelEvent('WheelExported', { label: 'SVG' })

// Track authentication events
trackAuthEvent('Login', 'Email')
trackAuthEvent('Signup', 'Google')

// Track subscription events
trackSubscriptionEvent('Subscribe', 'Monthly')
trackSubscriptionEvent('Upgrade', 'Yearly')
```

### Available Functions

#### `trackEvent(category, action, label, value)`
Track generic custom events.

#### `trackWheelEvent(action, details)`
Track user interactions with the year wheel:
- Creating/editing items
- Exporting wheels
- Changing views
- etc.

#### `trackAuthEvent(action, method)`
Track authentication events:
- Login
- Signup
- Logout
- Password reset

#### `trackSubscriptionEvent(action, plan)`
Track subscription-related events:
- Subscribe
- Upgrade
- Downgrade
- Cancel

#### `trackPageView(pagePath, pageTitle)`
Manually track page views (useful for SPA navigation).

#### `pushToDataLayer(event, data)`
Push custom data directly to the dataLayer.

## Verifying GTM Installation

### In Development
1. Open browser Developer Tools (F12)
2. Go to Console
3. Look for: `GTM initialized with ID: GTM-XXXXXXX`
4. Check Network tab for requests to `googletagmanager.com`

### Using GTM Preview Mode
1. In Google Tag Manager, click "Preview"
2. Enter your site URL
3. Verify that tags are firing correctly

### Using Google Tag Assistant
1. Install [Google Tag Assistant Chrome Extension](https://chrome.google.com/webstore/detail/tag-assistant-legacy-by-g/kejbdjndbnbjgmefkgdddjlbokphdefk)
2. Visit your site
3. Click the extension icon to verify GTM is loaded

## Security & Privacy

### GDPR Compliance
Ensure you have proper cookie consent before initializing GTM if required by your jurisdiction. You may want to:

1. Wait for user consent before calling `initializeGTM()`
2. Use GTM's consent mode
3. Update your privacy policy to mention Google Analytics/GTM

### Environment-Based Loading
GTM only loads when `VITE_GTM_ID` is set. This means:
- ✅ No tracking in development (unless you explicitly set the ID)
- ✅ Production-only tracking by default
- ✅ Easy to disable by removing the environment variable

## Common GTM Tags to Set Up

Once GTM is installed, you can add these tags in the GTM interface:

1. **Google Analytics 4** - Track page views and events
2. **Facebook Pixel** - Track conversions
3. **LinkedIn Insight Tag** - B2B conversion tracking
4. **Hotjar** - User behavior analytics
5. **Custom JavaScript** - Any custom tracking code

## Troubleshooting

### GTM Not Loading
- Verify `VITE_GTM_ID` is set in `.env`
- Check browser console for errors
- Ensure ad blockers are disabled during testing

### Events Not Firing
- Verify GTM Preview Mode shows your events
- Check dataLayer in browser console: `console.log(window.dataLayer)`
- Ensure event names match your GTM triggers

### Performance Concerns
- GTM script loads asynchronously and shouldn't block rendering
- Use GTM's built-in tag loading rules to optimize performance
- Consider lazy-loading tags that aren't critical

## Example: Tracking Wheel Exports

```javascript
// In YearWheel.jsx or Header.jsx
import { trackWheelEvent } from '../utils/gtm'

const handleExportSVG = () => {
  // ... export logic ...
  trackWheelEvent('Export', { label: 'SVG', value: 1 })
}

const handleExportJSON = () => {
  // ... export logic ...
  trackWheelEvent('Export', { label: 'JSON', value: 1 })
}
```

## Resources
- [Google Tag Manager Documentation](https://developers.google.com/tag-manager)
- [GTM Best Practices](https://support.google.com/tagmanager/answer/9442095)
- [DataLayer Reference](https://developers.google.com/tag-platform/tag-manager/datalayer)
