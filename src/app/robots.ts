import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://signo-tau.vercel.app';

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
