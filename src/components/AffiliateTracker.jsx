// AffiliateTracker.jsx
// Component to handle affiliate link tracking on page load
// Should be mounted in App.jsx or root layout

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { trackAffiliateClick } from '../utils/affiliateTracking';

export default function AffiliateTracker() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check for affiliate parameter in URL
    // Support multiple param names: ?ref=code, ?affiliate=code, ?aff=code
    const affiliateCode = 
      searchParams.get('ref') || 
      searchParams.get('affiliate') || 
      searchParams.get('aff');

    if (affiliateCode) {
      // Track the click
      trackAffiliateClick(affiliateCode, supabase).then((result) => {
        if (result) {
          console.log('[Affiliate] Click tracked:', result);
        }
      });
    }
  }, [searchParams]);

  // This component doesn't render anything
  return null;
}
