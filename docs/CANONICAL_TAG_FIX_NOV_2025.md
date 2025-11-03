# Canonical Tag SEO Fix - November 2025

## Problem Description
Google Search Console reported "Alternate page with proper canonical tag" errors for multiple pages on yearwheel.se. This occurred because:

1. The static `index.html` had a canonical tag pointing to `https://yearwheel.se/`
2. Many React pages didn't set their own canonical tags dynamically
3. This caused Google to see multiple pages all claiming `https://yearwheel.se/` as their canonical URL
4. Result: Duplicate content issues and poor indexing

## Solution Implemented

### 1. Created Reusable Hook: `useCanonicalUrl`
**File**: `src/hooks/useCanonicalUrl.js`

This hook provides two functions:
- `useCanonicalUrl(url, options)` - Sets canonical URL and optional noindex/nofollow
- `usePageMetadata(metadata)` - Helper for setting title, description, og tags

**Key Features**:
- Dynamically creates/updates `<link rel="canonical">` tags
- Supports `noindex` and `nofollow` options for pages that shouldn't be indexed
- Cleanup function restores default values when component unmounts
- Prevents duplicate content issues

### 2. Pages Updated with Canonical Tags

#### Public Pages (Should be indexed)
- ✅ `/` - LandingPage.jsx → `https://yearwheel.se/`
- ✅ `/pricing` - PricingPage.jsx → `https://yearwheel.se/pricing`
- ✅ `/support` - SupportPage.jsx → `https://yearwheel.se/support`
- ✅ `/legal/:document` - LegalPage.jsx → `https://yearwheel.se/legal/{document}`
- ✅ `/preview-wheel/:wheelId` - PreviewWheelPage.jsx → `https://yearwheel.se/preview-wheel/{wheelId}`

**Landing Pages** (already had correct canonical URLs via LandingPageTemplate):
- ✅ `/hr-planering` → `https://yearwheel.se/hr-planering`
- ✅ `/marknadsplanering` → `https://yearwheel.se/marknadsplanering`
- ✅ `/skola-och-utbildning` → `https://yearwheel.se/skola-och-utbildning`
- ✅ `/projektplanering` → `https://yearwheel.se/projektplanering`

#### Private Pages (Should NOT be indexed - noindex added)
- ✅ `/auth` - AuthPage.jsx (noindex - transactional page)
- ✅ `/dashboard` - Dashboard.jsx (noindex - requires login)
- ✅ `/cast-receiver` - CastReceiverPage.jsx (noindex - utility page)
- ✅ `/embed/:wheelId` - EmbedWheel.jsx (noindex - embedded content)

#### Other Routes (No changes needed)
- `/wheel/:wheelId` - Editor page (requires auth, not meant for search)
- `/admin` - Admin panel (requires admin, not meant for search)
- `/affiliate/*` - Affiliate pages (already handled or require auth)
- `/invite/:token` - Invitation acceptance (transactional, not meant for search)

## Technical Implementation

### Before (Problematic):
```html
<!-- index.html had static canonical -->
<link rel="canonical" href="https://yearwheel.se/" />

<!-- All pages inherited this, causing conflicts -->
```

### After (Fixed):
```jsx
// Each page dynamically sets its own canonical URL
import { useCanonicalUrl } from '../hooks/useCanonicalUrl';

function MyPage() {
  useCanonicalUrl('https://yearwheel.se/my-page');
  // or with noindex:
  useCanonicalUrl('https://yearwheel.se/utility-page', { noindex: true });
  
  return <div>...</div>;
}
```

## SEO Benefits

1. **Eliminates Duplicate Content**: Each page now has a unique canonical URL
2. **Proper Indexing**: Search engines know exactly which pages to index
3. **Prevents Private Content Indexing**: Dashboard, auth, and utility pages have noindex
4. **Better Rankings**: No more competing URLs for the same content
5. **Cleaner Search Console**: Should resolve Google's indexing errors

## Next Steps

### Immediate Actions (You should do this):
1. **Request Re-indexing in Google Search Console**:
   - Go to [Google Search Console](https://search.google.com/search-console)
   - Navigate to URL Inspection tool
   - Test each affected URL
   - Click "Request Indexing" for each page

2. **Monitor Validation Progress**:
   - Google will re-crawl the pages (takes 1-7 days)
   - Check "Page indexing" report in Search Console
   - Verify errors are resolved

3. **Verify Implementation**:
   - Use browser dev tools → Elements → `<head>` section
   - Confirm each page has correct canonical URL
   - Test that noindex pages have `<meta name="robots" content="noindex, follow">`

### Optional Enhancements (Future):
1. Add more descriptive titles/descriptions to public pages using `usePageMetadata`
2. Create segment-specific OG images for social sharing
3. Add structured data (Schema.org) to more pages
4. Set up sitemap.xml updates (if not already automated)

## Testing Checklist

- [x] Main landing page has canonical to `/`
- [x] Keyword landing pages have correct unique canonicals
- [x] Pricing page has canonical to `/pricing`
- [x] Auth page has noindex
- [x] Dashboard has noindex
- [x] Cast receiver has noindex
- [x] Embed pages have noindex
- [x] Legal pages have dynamic canonicals
- [x] Preview pages have dynamic canonicals

## Files Modified

1. `src/hooks/useCanonicalUrl.js` - **NEW** - Reusable canonical URL hook
2. `src/components/LandingPage.jsx` - Added canonical URL
3. `src/components/PricingPage.jsx` - Added canonical URL
4. `src/components/SupportPage.jsx` - Added canonical URL
5. `src/components/LegalPage.jsx` - Added dynamic canonical URL
6. `src/components/auth/AuthPage.jsx` - Added canonical + noindex
7. `src/components/dashboard/Dashboard.jsx` - Added canonical + noindex
8. `src/components/PreviewWheelPage.jsx` - Added dynamic canonical URL
9. `src/components/EmbedWheel.jsx` - Added canonical + noindex
10. `src/pages/CastReceiverPage.jsx` - Added canonical + noindex

**Landing pages** (already correct):
- `src/pages/landing/HRPlanering.jsx`
- `src/pages/landing/Marknadsplanering.jsx`
- `src/pages/landing/SkolaUtbildning.jsx`
- `src/pages/landing/Projektplanering.jsx`

## Expected Outcome

- **Before**: Multiple pages pointing to same canonical → Google sees duplicate content
- **After**: Each page has unique canonical → Google indexes correctly
- **Timeline**: 1-7 days for Google to re-crawl and validate fixes

## Documentation References

See also:
- `docs/SEO_IMPLEMENTATION_GUIDE.md` - Comprehensive SEO guidelines
- `docs/SEO_LANDING_PAGES.md` - Landing page SEO strategy
- Google's [Canonical URLs Guide](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)

---

**Implementation Date**: November 3, 2025
**Status**: ✅ Complete - Ready for Google validation
