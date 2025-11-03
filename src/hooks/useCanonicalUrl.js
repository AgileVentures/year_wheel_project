import { useEffect } from 'react';

/**
 * Hook to set the canonical URL for a page
 * This prevents duplicate content issues by telling search engines
 * which URL is the "official" version of the page
 * 
 * @param {string} canonicalUrl - The canonical URL (e.g., "https://yearwheel.se/hr-planering")
 * @param {Object} options - Additional SEO options
 * @param {boolean} options.noindex - If true, adds noindex meta tag (for pages that shouldn't be indexed)
 * @param {boolean} options.nofollow - If true, adds nofollow meta tag (for pages with external links)
 */
export function useCanonicalUrl(canonicalUrl, options = {}) {
  const { noindex = false, nofollow = false } = options;
  
  useEffect(() => {
    // Set canonical URL
    if (canonicalUrl) {
      let linkTag = document.querySelector('link[rel="canonical"]');
      if (!linkTag) {
        linkTag = document.createElement('link');
        linkTag.rel = 'canonical';
        document.head.appendChild(linkTag);
      }
      linkTag.href = canonicalUrl;
    }
    
    // Set robots meta tag if noindex or nofollow
    if (noindex || nofollow) {
      let robotsTag = document.querySelector('meta[name="robots"]');
      if (!robotsTag) {
        robotsTag = document.createElement('meta');
        robotsTag.name = 'robots';
        document.head.appendChild(robotsTag);
      }
      
      const robotsValue = [
        noindex ? 'noindex' : 'index',
        nofollow ? 'nofollow' : 'follow'
      ].join(', ');
      
      robotsTag.content = robotsValue;
    }
    
    // Cleanup function - restore defaults
    return () => {
      // Restore default canonical URL
      const linkTag = document.querySelector('link[rel="canonical"]');
      if (linkTag) {
        linkTag.href = 'https://yearwheel.se/';
      }
      
      // Restore default robots tag
      const robotsTag = document.querySelector('meta[name="robots"]');
      if (robotsTag && (noindex || nofollow)) {
        robotsTag.content = 'index, follow';
      }
    };
  }, [canonicalUrl, noindex, nofollow]);
}

/**
 * Hook to set page metadata (title, description, og tags)
 * Used in conjunction with useCanonicalUrl for complete SEO setup
 * 
 * @param {Object} metadata
 * @param {string} metadata.title - Page title
 * @param {string} metadata.description - Meta description
 * @param {string} metadata.ogImage - Open Graph image URL
 * @param {string} metadata.ogType - Open Graph type (default: "website")
 */
export function usePageMetadata(metadata = {}) {
  const {
    title,
    description,
    ogImage,
    ogType = 'website'
  } = metadata;
  
  useEffect(() => {
    const updateOrCreateMeta = (name, content, isProperty = false) => {
      if (!content) return;
      
      const attribute = isProperty ? 'property' : 'name';
      let metaTag = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute(attribute, name);
        document.head.appendChild(metaTag);
      }
      metaTag.content = content;
    };
    
    // Set title
    if (title) {
      document.title = title;
    }
    
    // Set meta description
    updateOrCreateMeta('description', description);
    
    // Set Open Graph tags
    updateOrCreateMeta('og:type', ogType, true);
    updateOrCreateMeta('og:title', title, true);
    updateOrCreateMeta('og:description', description, true);
    updateOrCreateMeta('og:image', ogImage, true);
    
    // Set Twitter Card tags
    updateOrCreateMeta('twitter:card', 'summary_large_image');
    updateOrCreateMeta('twitter:title', title);
    updateOrCreateMeta('twitter:description', description);
    updateOrCreateMeta('twitter:image', ogImage);
    
    // Cleanup
    return () => {
      document.title = 'YearWheel - Visualisera och planera ditt år med AI';
      updateOrCreateMeta('description', 'Skapa interaktiva årshjul för att planera projekt, kampanjer och aktiviteter. AI-assisterad planering, visuell översikt och smart organisering.');
    };
  }, [title, description, ogImage, ogType]);
}
