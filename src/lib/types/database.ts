// ============================================================
// Supabase Database Type Definitions
// Generated from supabase/migrations/001_initial_schema.sql
// ============================================================

// ---- Enum union types ----

export type UserRole = 'buyer' | 'artist' | 'admin';

export type SubscriptionStatus =
  | 'trial'
  | 'pending_activation'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'cancelled';

export type ArtworkCategory = 'original' | 'print' | 'digital';

export type ArtworkStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'reserved'
  | 'sold'
  | 'paused';

export type AvailabilityStatus = 'available' | 'coming_soon' | 'enquire_only';

export type Surface = 'canvas' | 'linen' | 'paper' | 'board' | 'wood' | 'metal' | 'glass' | 'fabric' | 'other';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'disputed'
  | 'refunded'
  | 'cancelled';

export type DisputeType =
  | 'damaged'
  | 'not_as_described'
  | 'not_received'
  | 'other';

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved_refund'
  | 'resolved_no_refund'
  | 'resolved_return';

// ---- Full Database type for createClient<Database>() ----

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: UserRole;
          avatar_url: string | null;
          bio: string | null;
          location: string | null;
          social_links: Record<string, string>;
          stripe_account_id: string | null;
          stripe_customer_id: string | null;
          subscription_status: SubscriptionStatus;
          grace_period_deadline: string | null;
          first_sale_completed_at: string | null;
          is_verified: boolean;
          onboarding_completed: boolean;
          accepts_commissions: boolean;
          state: string | null;
          featured_artworks: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          bio?: string | null;
          location?: string | null;
          social_links?: Record<string, string>;
          stripe_account_id?: string | null;
          stripe_customer_id?: string | null;
          subscription_status?: SubscriptionStatus;
          grace_period_deadline?: string | null;
          first_sale_completed_at?: string | null;
          is_verified?: boolean;
          onboarding_completed?: boolean;
          accepts_commissions?: boolean;
          state?: string | null;
          featured_artworks?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          bio?: string | null;
          location?: string | null;
          social_links?: Record<string, string>;
          stripe_account_id?: string | null;
          stripe_customer_id?: string | null;
          subscription_status?: SubscriptionStatus;
          grace_period_deadline?: string | null;
          first_sale_completed_at?: string | null;
          is_verified?: boolean;
          onboarding_completed?: boolean;
          accepts_commissions?: boolean;
          state?: string | null;
          featured_artworks?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      artworks: {
        Row: {
          id: string;
          artist_id: string;
          title: string;
          description: string | null;
          category: ArtworkCategory | null;
          medium: string | null;
          style: string | null;
          width_cm: number | null;
          height_cm: number | null;
          depth_cm: number | null;
          price_aud: number;
          is_framed: boolean;
          is_featured: boolean;
          status: ArtworkStatus;
          review_notes: string | null;
          ai_review_score: number | null;
          images: string[];
          tags: string[];
          shipping_weight_kg: number | null;
          digital_file_url: string | null;
          colors: string[];
          surface: string | null;
          ready_to_hang: boolean;
          availability: AvailabilityStatus;
          available_from: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          artist_id: string;
          title: string;
          description?: string | null;
          category?: ArtworkCategory | null;
          medium?: string | null;
          style?: string | null;
          width_cm?: number | null;
          height_cm?: number | null;
          depth_cm?: number | null;
          price_aud: number;
          is_framed?: boolean;
          is_featured?: boolean;
          status?: ArtworkStatus;
          review_notes?: string | null;
          ai_review_score?: number | null;
          images?: string[];
          tags?: string[];
          shipping_weight_kg?: number | null;
          digital_file_url?: string | null;
          colors?: string[];
          surface?: string | null;
          ready_to_hang?: boolean;
          availability?: AvailabilityStatus;
          available_from?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          artist_id?: string;
          title?: string;
          description?: string | null;
          category?: ArtworkCategory | null;
          medium?: string | null;
          style?: string | null;
          width_cm?: number | null;
          height_cm?: number | null;
          depth_cm?: number | null;
          price_aud?: number;
          is_framed?: boolean;
          is_featured?: boolean;
          status?: ArtworkStatus;
          review_notes?: string | null;
          ai_review_score?: number | null;
          images?: string[];
          tags?: string[];
          shipping_weight_kg?: number | null;
          digital_file_url?: string | null;
          colors?: string[];
          surface?: string | null;
          ready_to_hang?: boolean;
          availability?: AvailabilityStatus;
          available_from?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'artworks_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      orders: {
        Row: {
          id: string;
          buyer_id: string;
          artwork_id: string;
          artist_id: string;
          total_amount_aud: number | null;
          platform_fee_aud: number | null;
          artist_payout_aud: number | null;
          shipping_cost_aud: number | null;
          stripe_payment_intent_id: string | null;
          status: OrderStatus;
          shipping_tracking_number: string | null;
          shipping_carrier: string | null;
          shipped_at: string | null;
          delivered_at: string | null;
          inspection_deadline: string | null;
          payout_released_at: string | null;
          shipping_address: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          artwork_id: string;
          artist_id: string;
          total_amount_aud?: number | null;
          platform_fee_aud?: number | null;
          artist_payout_aud?: number | null;
          shipping_cost_aud?: number | null;
          stripe_payment_intent_id?: string | null;
          status?: OrderStatus;
          shipping_tracking_number?: string | null;
          shipping_carrier?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          inspection_deadline?: string | null;
          payout_released_at?: string | null;
          shipping_address?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          artwork_id?: string;
          artist_id?: string;
          total_amount_aud?: number | null;
          platform_fee_aud?: number | null;
          artist_payout_aud?: number | null;
          shipping_cost_aud?: number | null;
          stripe_payment_intent_id?: string | null;
          status?: OrderStatus;
          shipping_tracking_number?: string | null;
          shipping_carrier?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          inspection_deadline?: string | null;
          payout_released_at?: string | null;
          shipping_address?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_artwork_id_fkey';
            columns: ['artwork_id'];
            isOneToOne: false;
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      disputes: {
        Row: {
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
        };
        Insert: {
          id?: string;
          order_id: string;
          raised_by: string;
          type: DisputeType;
          description: string;
          evidence_images?: string[];
          artist_packaging_photos?: string[];
          status?: DisputeStatus;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          raised_by?: string;
          type?: DisputeType;
          description?: string;
          evidence_images?: string[];
          artist_packaging_photos?: string[];
          status?: DisputeStatus;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'disputes_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'disputes_raised_by_fkey';
            columns: ['raised_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      reviews: {
        Row: {
          id: string;
          order_id: string;
          buyer_id: string;
          artist_id: string;
          artwork_id: string;
          rating: number;
          comment: string | null;
          artist_response: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          buyer_id: string;
          artist_id: string;
          artwork_id: string;
          rating: number;
          comment?: string | null;
          artist_response?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          buyer_id?: string;
          artist_id?: string;
          artwork_id?: string;
          rating?: number;
          comment?: string | null;
          artist_response?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: true;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_artwork_id_fkey';
            columns: ['artwork_id'];
            isOneToOne: false;
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };

      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          receiver_id: string;
          artwork_id: string | null;
          content: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          receiver_id: string;
          artwork_id?: string | null;
          content: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          receiver_id?: string;
          artwork_id?: string | null;
          content?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_receiver_id_fkey';
            columns: ['receiver_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_artwork_id_fkey';
            columns: ['artwork_id'];
            isOneToOne: false;
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };

      follows: {
        Row: {
          id: string;
          follower_id: string;
          followed_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          followed_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          followed_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['follower_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_followed_id_fkey';
            columns: ['followed_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      artwork_notifications: {
        Row: {
          id: string;
          artwork_id: string;
          email: string;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          artwork_id: string;
          email: string;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          artwork_id?: string;
          email?: string;
          user_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'artwork_notifications_artwork_id_fkey';
            columns: ['artwork_id'];
            isOneToOne: false;
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'artwork_notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      trade_enquiries: {
        Row: {
          id: string;
          business_name: string;
          contact_name: string;
          email: string;
          phone: string | null;
          business_type: string | null;
          description: string | null;
          budget_range: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_name: string;
          contact_name: string;
          email: string;
          phone?: string | null;
          business_type?: string | null;
          description?: string | null;
          budget_range?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string;
          contact_name?: string;
          email?: string;
          phone?: string | null;
          business_type?: string | null;
          description?: string | null;
          budget_range?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      studio_posts: {
        Row: {
          id: string;
          artist_id: string;
          image_url: string;
          caption: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          artist_id: string;
          image_url: string;
          caption?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          artist_id?: string;
          image_url?: string;
          caption?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'studio_posts_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      collections: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          slug: string;
          cover_image_url: string | null;
          curator_note: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          slug: string;
          cover_image_url?: string | null;
          curator_note?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          slug?: string;
          cover_image_url?: string | null;
          curator_note?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      collection_artworks: {
        Row: {
          id: string;
          collection_id: string;
          artwork_id: string;
          position: number;
        };
        Insert: {
          id?: string;
          collection_id: string;
          artwork_id: string;
          position?: number;
        };
        Update: {
          id?: string;
          collection_id?: string;
          artwork_id?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'collection_artworks_collection_id_fkey';
            columns: ['collection_id'];
            isOneToOne: false;
            referencedRelation: 'collections';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'collection_artworks_artwork_id_fkey';
            columns: ['artwork_id'];
            isOneToOne: false;
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };

      profile_views: {
        Row: {
          id: string;
          profile_id: string;
          viewer_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          viewer_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          viewer_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_views_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_views_viewer_id_fkey';
            columns: ['viewer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      artwork_impressions: {
        Row: {
          id: string;
          artwork_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          artwork_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          artwork_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'artwork_impressions_artwork_id_fkey';
            columns: ['artwork_id'];
            isOneToOne: false;
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ---- Convenience type aliases ----

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Artwork = Database['public']['Tables']['artworks']['Row'];
export type ArtworkInsert = Database['public']['Tables']['artworks']['Insert'];
export type ArtworkUpdate = Database['public']['Tables']['artworks']['Update'];

export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderInsert = Database['public']['Tables']['orders']['Insert'];
export type OrderUpdate = Database['public']['Tables']['orders']['Update'];

export type Dispute = Database['public']['Tables']['disputes']['Row'];
export type DisputeInsert = Database['public']['Tables']['disputes']['Insert'];
export type DisputeUpdate = Database['public']['Tables']['disputes']['Update'];

export type Review = Database['public']['Tables']['reviews']['Row'];
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert'];
export type ReviewUpdate = Database['public']['Tables']['reviews']['Update'];

export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];

export type Follow = Database['public']['Tables']['follows']['Row'];
export type FollowInsert = Database['public']['Tables']['follows']['Insert'];
export type FollowUpdate = Database['public']['Tables']['follows']['Update'];

export type ArtworkNotification = Database['public']['Tables']['artwork_notifications']['Row'];
export type ArtworkNotificationInsert = Database['public']['Tables']['artwork_notifications']['Insert'];
export type ArtworkNotificationUpdate = Database['public']['Tables']['artwork_notifications']['Update'];

export type TradeEnquiry = Database['public']['Tables']['trade_enquiries']['Row'];
export type TradeEnquiryInsert = Database['public']['Tables']['trade_enquiries']['Insert'];
export type TradeEnquiryUpdate = Database['public']['Tables']['trade_enquiries']['Update'];

export type StudioPost = Database['public']['Tables']['studio_posts']['Row'];
export type StudioPostInsert = Database['public']['Tables']['studio_posts']['Insert'];
export type StudioPostUpdate = Database['public']['Tables']['studio_posts']['Update'];

export type Collection = Database['public']['Tables']['collections']['Row'];
export type CollectionInsert = Database['public']['Tables']['collections']['Insert'];
export type CollectionUpdate = Database['public']['Tables']['collections']['Update'];

export type CollectionArtwork = Database['public']['Tables']['collection_artworks']['Row'];
export type CollectionArtworkInsert = Database['public']['Tables']['collection_artworks']['Insert'];
export type CollectionArtworkUpdate = Database['public']['Tables']['collection_artworks']['Update'];

export type ProfileView = Database['public']['Tables']['profile_views']['Row'];
export type ProfileViewInsert = Database['public']['Tables']['profile_views']['Insert'];
export type ProfileViewUpdate = Database['public']['Tables']['profile_views']['Update'];

export type ArtworkImpression = Database['public']['Tables']['artwork_impressions']['Row'];
export type ArtworkImpressionInsert = Database['public']['Tables']['artwork_impressions']['Insert'];
export type ArtworkImpressionUpdate = Database['public']['Tables']['artwork_impressions']['Update'];

// Backward-compatible alias — older code imports "User"
export type User = Profile;
