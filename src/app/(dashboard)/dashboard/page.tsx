'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import {
  Heart,
  ShoppingBag,
  Settings,
  ArrowRight,
  Palette,
  Search,
  Package,
  ImageIcon,
  Loader2,
} from 'lucide-react';
import ArtworkCard from '@/components/ui/ArtworkCard';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { formatPrice } from '@/lib/utils';

// ── Types ──

interface RecentOrder {
  id: string;
  artworkTitle: string;
  artworkImage: string | null;
  artistName: string;
  price: number;
  date: string;
  status: string;
}

// ── Helpers ──

function statusStyle(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-50 text-green-700';
    case 'shipped':
    case 'delivered':
      return 'bg-blue-50 text-blue-700';
    case 'paid':
      return 'bg-amber-50 text-amber-700';
    case 'disputed':
      return 'bg-red-50 text-red-700';
    case 'refunded':
    case 'cancelled':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-50 text-gray-600';
  }
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Component ──

function DashboardContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const { user } = useAuth();

  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [favourites, setFavourites] = useState<
    {
      id: string;
      title: string;
      price_aud: number;
      images: string[];
      medium: string | null;
      category: 'original' | 'print' | 'digital';
      artistName: string;
      artistId: string;
    }[]
  >([]);
  const [favouritesCount, setFavouritesCount] = useState(0);
  const isArtist = user?.role === 'artist';

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    // Safety timeout: show empty state after 5s no matter what
    const timer = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 5000);

    async function fetchOrders() {
      try {
        console.log('[Dashboard] Fetching orders from /api/orders');
        const res = await fetch('/api/orders', { signal: controller.signal });

        if (!res.ok) {
          console.error('[Dashboard] Orders API error:', res.status);
          return;
        }

        const data = await res.json();
        console.log('[Dashboard] Orders response:', data.orders?.length, 'orders');

        if (cancelled) return;

        const ordersList = data.orders || [];
        setTotalOrders(ordersList.length);

        setOrders(
          ordersList.slice(0, 5).map((o: Record<string, unknown>) => {
            const artwork = o.artworks as Record<string, unknown> | null;
            const artist = o.profiles as Record<string, string> | null;
            const images = (artwork?.images as string[]) || [];
            return {
              id: o.id as string,
              artworkTitle: (artwork?.title as string) || 'Unknown',
              artworkImage: images[0] || null,
              artistName: artist?.full_name || 'Unknown Artist',
              price: (o.total_amount_aud as number) || 0,
              date: new Date(o.created_at as string).toLocaleDateString(
                'en-AU',
                { day: 'numeric', month: 'short', year: 'numeric' }
              ),
              status: o.status as string,
            };
          })
        );
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[Dashboard] Orders fetch error:', err);
        }
      } finally {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      }
    }

    fetchOrders();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [user]);

  // Fetch favourites preview
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function fetchFavourites() {
      try {
        const res = await fetch('/api/favourites/list?sort=recent');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setFavouritesCount(data.count || 0);
        setFavourites((data.artworks || []).slice(0, 4));
      } catch {
        // Ignore
      }
    }

    fetchFavourites();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const firstName = user?.full_name?.split(' ')[0] || '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {error === 'unauthorized' && (
        <div className="mb-6 p-4 bg-error/5 border border-error/20 text-error text-sm rounded-xl animate-fade-in">
          You don&apos;t have permission to access that page. If you believe
          this is an error, please contact support.
        </div>
      )}

      {/* Welcome header */}
      <div className="mb-10">
        <h1 className="font-editorial text-3xl md:text-4xl font-medium">
          Welcome back{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-muted mt-2">
          Manage your orders, favourites, and account.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Link
          href="/browse"
          className="flex items-center gap-4 p-5 bg-white border border-border rounded-xl hover:border-accent/40 hover:shadow-sm transition-all duration-300 group"
        >
          <div className="w-10 h-10 bg-muted-bg rounded-full flex items-center justify-center group-hover:bg-accent-subtle transition-colors duration-300">
            <Search className="h-5 w-5 text-muted group-hover:text-accent-dark transition-colors duration-300" />
          </div>
          <div>
            <p className="font-medium text-sm">Browse Artwork</p>
            <p className="text-xs text-muted">Discover new pieces</p>
          </div>
        </Link>

        <Link
          href="/orders"
          className="flex items-center gap-4 p-5 bg-white border border-border rounded-xl hover:border-accent/40 hover:shadow-sm transition-all duration-300 group"
        >
          <div className="w-10 h-10 bg-muted-bg rounded-full flex items-center justify-center group-hover:bg-accent-subtle transition-colors duration-300">
            <ShoppingBag className="h-5 w-5 text-muted group-hover:text-accent-dark transition-colors duration-300" />
          </div>
          <div>
            <p className="font-medium text-sm">Orders</p>
            <p className="text-xs text-muted">
              {totalOrders} {totalOrders === 1 ? 'order' : 'orders'}
            </p>
          </div>
        </Link>

        <Link
          href="/favourites"
          className="flex items-center gap-4 p-5 bg-white border border-border rounded-xl hover:border-accent/40 hover:shadow-sm transition-all duration-300 group"
        >
          <div className="w-10 h-10 bg-muted-bg rounded-full flex items-center justify-center group-hover:bg-accent-subtle transition-colors duration-300">
            <Heart className="h-5 w-5 text-muted group-hover:text-accent-dark transition-colors duration-300" />
          </div>
          <div>
            <p className="font-medium text-sm">Favourites</p>
            <p className="text-xs text-muted">Saved artworks</p>
          </div>
        </Link>

        <Link
          href="/settings"
          className="flex items-center gap-4 p-5 bg-white border border-border rounded-xl hover:border-accent/40 hover:shadow-sm transition-all duration-300 group"
        >
          <div className="w-10 h-10 bg-muted-bg rounded-full flex items-center justify-center group-hover:bg-accent-subtle transition-colors duration-300">
            <Settings className="h-5 w-5 text-muted group-hover:text-accent-dark transition-colors duration-300" />
          </div>
          <div>
            <p className="font-medium text-sm">Settings</p>
            <p className="text-xs text-muted">Account &amp; preferences</p>
          </div>
        </Link>
      </div>

      {/* Artist CTA (if applicable) or Sell Art promo */}
      <div className="mb-10 p-8 bg-primary text-white rounded-2xl relative overflow-hidden texture-grain">
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Palette className="h-7 w-7 text-accent-dark" />
            </div>
            <div>
              {isArtist ? (
                <>
                  <p className="font-editorial text-xl font-medium">
                    Your artist dashboard
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Manage your listings, track earnings, and update your
                    storefront.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-editorial text-xl font-medium">
                    Want to sell your artwork?
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    $30/month, zero commission. Keep 100% of every sale.
                  </p>
                </>
              )}
            </div>
          </div>
          <Link
            href={isArtist ? '/artist/dashboard' : '/artist/onboarding'}
            className="group inline-flex items-center gap-2 px-6 py-3 bg-accent text-primary text-sm font-semibold rounded-full hover:bg-accent-light transition-colors whitespace-nowrap"
          >
            {isArtist ? 'Go to Artist Dashboard' : 'Start Selling'}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white border border-border rounded-xl overflow-hidden mb-10">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-editorial text-lg font-medium">
            Recent Orders
          </h2>
          {totalOrders > 5 && (
            <Link
              href="/orders"
              className="text-sm text-accent-dark font-medium hover:underline flex items-center gap-1"
            >
              View all orders <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="font-medium mb-1">
              You haven&apos;t purchased any artwork yet
            </p>
            <p className="text-sm text-muted mb-5">
              Discover original art from Australian artists.
            </p>
            <Link
              href="/browse"
              className="group inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-full hover:bg-accent transition-colors duration-300"
            >
              Start Exploring
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium tracking-wide uppercase text-muted border-b border-border bg-cream/50">
                    <th className="px-5 py-3.5">Artwork</th>
                    <th className="px-5 py-3.5">Artist</th>
                    <th className="px-5 py-3.5">Price</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border last:border-0 hover:bg-cream/30 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted-bg flex-shrink-0 overflow-hidden">
                            {order.artworkImage ? (
                              <Image
                                src={order.artworkImage}
                                alt={order.artworkTitle}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-border" />
                              </div>
                            )}
                          </div>
                          <span className="font-medium text-sm truncate max-w-[200px]">
                            {order.artworkTitle}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted">
                        {order.artistName}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium">
                        {formatPrice(order.price)}
                      </td>
                      <td className="px-5 py-4 text-sm text-muted">
                        {order.date}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle(order.status)}`}
                        >
                          {statusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-xs text-accent-dark font-medium hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-3.5 p-4 hover:bg-cream/30 transition-colors"
                >
                  <div className="w-14 h-14 rounded-xl bg-muted-bg flex-shrink-0 overflow-hidden">
                    {order.artworkImage ? (
                      <Image
                        src={order.artworkImage}
                        alt={order.artworkTitle}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-border" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {order.artworkTitle}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {order.artistName} &middot; {order.date}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-medium">
                        {formatPrice(order.price)}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusStyle(order.status)}`}
                      >
                        {statusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted flex-shrink-0" />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Favourites */}
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-editorial text-lg font-medium">Favourites</h2>
          {favouritesCount > 4 && (
            <Link
              href="/favourites"
              className="text-sm text-accent-dark font-medium hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {favourites.length === 0 ? (
          <div className="p-12 text-center">
            <Heart className="h-10 w-10 text-muted mx-auto mb-3" />
            <p className="font-medium mb-1">No saved artworks yet</p>
            <p className="text-sm text-muted mb-5">
              Save artworks you love by clicking the heart icon while browsing.
            </p>
            <Link
              href="/browse"
              className="group inline-flex items-center gap-2 text-accent-dark font-medium text-sm hover:underline"
            >
              Browse Artwork
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        ) : (
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {favourites.map((artwork) => (
                <ArtworkCard
                  key={artwork.id}
                  id={artwork.id}
                  title={artwork.title}
                  artistName={artwork.artistName}
                  artistId={artwork.artistId}
                  price={artwork.price_aud}
                  imageUrl={artwork.images?.[0] || ''}
                  medium={artwork.medium}
                  category={artwork.category}
                  initialFavourited
                  hideBadge
                />
              ))}
            </div>
            {favouritesCount > 0 && (
              <div className="text-center mt-5">
                <Link
                  href="/favourites"
                  className="group inline-flex items-center gap-2 text-accent-dark font-medium text-sm hover:underline"
                >
                  View all {favouritesCount} favourite{favouritesCount === 1 ? '' : 's'}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BuyerDashboardPage() {
  const { loading: authLoading } = useRequireAuth();
  if (authLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div style={{ width: 32, height: 32, border: '3px solid #E5E2DB', borderTopColor: '#2C2C2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style></div>;

  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
