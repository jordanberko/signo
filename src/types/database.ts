export type UserRole = 'buyer' | 'artist' | 'admin';

export type ArtworkCategory = 'original' | 'print' | 'digital';

export type ArtworkStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'sold' | 'paused';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'disputed'
  | 'refunded'
  | 'cancelled';

export type DisputeType = 'damaged' | 'not_as_described' | 'not_received' | 'other';

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_refund'
  | 'resolved_no_refund'
  | 'resolved_return';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  social_links: Record<string, string> | null;
  stripe_account_id: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Artwork {
  id: string;
  artist_id: string;
  title: string;
  description: string;
  category: ArtworkCategory;
  medium: string;
  style: string;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  price_aud: number;
  is_framed: boolean;
  status: ArtworkStatus;
  review_notes: string | null;
  ai_review_score: number | null;
  images: string[];
  tags: string[];
  shipping_weight_kg: number | null;
  digital_file_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  artist?: User;
}

export interface Order {
  id: string;
  buyer_id: string;
  artwork_id: string;
  artist_id: string;
  total_amount_aud: number;
  platform_fee_aud: number;
  artist_payout_aud: number;
  shipping_cost_aud: number | null;
  stripe_payment_intent_id: string | null;
  status: OrderStatus;
  shipping_tracking_number: string | null;
  shipping_carrier: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  inspection_deadline: string | null;
  payout_released_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  artwork?: Artwork;
  buyer?: User;
  artist?: User;
}

export interface Dispute {
  id: string;
  order_id: string;
  raised_by: string;
  type: DisputeType;
  description: string;
  evidence_images: string[];
  artist_packaging_photos: string[];
  status: DisputeStatus;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  buyer_id: string;
  artist_id: string;
  artwork_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  artwork_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}
