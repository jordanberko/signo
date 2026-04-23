import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/urls';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = appUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/artist/dashboard',
          '/artist/orders',
          '/artist/earnings',
          '/artist/artworks',
          '/artist/onboarding',
          '/artist/settings/',
          '/dashboard',
          '/settings',
          '/messages',
          '/orders',
          '/favourites',
          '/checkout/',
          '/admin/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
