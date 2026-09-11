import { useEffect } from 'react';

export function useLanguageAlternates(alternateUrls) {
  const alternateKey = Object.entries(alternateUrls)
    .map(([language, url]) => `${language}:${url}`)
    .join('|');

  useEffect(() => {
    const links = Object.entries(alternateUrls).map(([language, url]) => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = language;
      link.href = url;
      link.dataset.yearwheelHreflang = 'true';
      document.head.appendChild(link);
      return link;
    });

    return () => {
      links.forEach((link) => link.remove());
    };
  }, [alternateKey]);
}