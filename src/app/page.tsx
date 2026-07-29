import HomeClient from './HomeClient';
import { getFeaturedArtworks } from '@/lib/featured-artworks';

/**
 * Homepage — server component.
 *
 * The artwork grid is fetched here so it ships in the initial HTML:
 * previously the page rendered empty, hydrated, then fetched
 * /api/artworks/featured, so images didn't start downloading until
 * several hundred ms after paint. Rendering server-side lets the
 * browser discover (and preload) the first row of images immediately.
 *
 * ISR: the featured set changes rarely, so serve from cache and
 * refresh in the background every 5 minutes.
 */
export const revalidate = 300;

export default async function HomePage() {
  const featured = await getFeaturedArtworks(12);
  return <HomeClient featured={featured} />;
}
