// Re-export all types from the canonical location.
// This file exists for backward compatibility — new code should
// import from '@/lib/types/database' instead.

export {
  type Database,
  type Profile,
  type ProfileInsert,
  type ProfileUpdate,
  type Artwork,
  type ArtworkInsert,
  type ArtworkUpdate,
  type Order,
  type OrderInsert,
  type OrderUpdate,
  type Dispute,
  type DisputeInsert,
  type DisputeUpdate,
  type Review,
  type ReviewInsert,
  type ReviewUpdate,
  type Message,
  type MessageInsert,
  type MessageUpdate,
  type User,
  type UserRole,
  type ArtworkCategory,
  type ArtworkStatus,
  type OrderStatus,
  type DisputeType,
  type DisputeStatus,
} from '@/lib/types/database';
