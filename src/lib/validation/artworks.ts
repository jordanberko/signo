/**
 * Shared validation for the artwork create/update routes.
 *
 * Extracted from `src/app/api/artworks/route.ts` (PR #16) so the edit
 * route (`src/app/api/artworks/[id]/route.ts`) can apply the same rules
 * and the same field-level error response shape. Behaviour is intended
 * to be identical to the inline original — same rules, same messages,
 * same returned-map shape.
 */

export const VALID_CATEGORIES = ['original', 'print', 'digital'] as const;
export const VALID_STATUSES = ['draft', 'pending_review'] as const;
export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 2000;

export type ValidationErrors = Record<string, string>;

/**
 * Field-level validator. Returns a map of fieldName → message.
 * Empty object = valid. Required-when-pending-review fields kick in
 * only when the client is asking to submit for review; drafts can
 * be saved with whatever the user has typed so far.
 */
export function validateArtworkBody(body: unknown): ValidationErrors {
  const errors: ValidationErrors = {};
  const data =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>)
      : {};

  // ── Always-checked rules (apply to drafts too) ──

  if (
    data.category != null &&
    !(VALID_CATEGORIES as readonly string[]).includes(String(data.category))
  ) {
    errors.category = 'Invalid category.';
  }

  if (data.price_aud != null && data.price_aud !== '') {
    const n = Number(data.price_aud);
    if (!Number.isFinite(n)) {
      errors.price_aud = 'Price must be a number.';
    } else if (n < 0) {
      errors.price_aud = 'Price must be positive.';
    }
  }

  if (typeof data.title === 'string' && data.title.length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or less.`;
  }

  if (
    typeof data.description === 'string' &&
    data.description.length > DESCRIPTION_MAX
  ) {
    errors.description = `Description must be ${DESCRIPTION_MAX} characters or less.`;
  }

  // ── Required-for-pending_review rules ──

  const status = data.status === 'pending_review' ? 'pending_review' : 'draft';
  if (status === 'pending_review') {
    if (typeof data.title !== 'string' || !data.title.trim()) {
      errors.title = 'Title is required.';
    }
    if (typeof data.description !== 'string' || !data.description.trim()) {
      errors.description = 'Description is required.';
    }
    if (!Array.isArray(data.images) || data.images.length < 1) {
      errors.images = 'At least one image is required.';
    }
    const price = Number(data.price_aud);
    if (!Number.isFinite(price) || price < 1) {
      errors.price_aud = 'Price must be at least $1.';
    }
    // Mirror the client form's required fields so server and client
    // agree on what "ready for review" means.
    if (typeof data.medium !== 'string' || !data.medium.trim()) {
      errors.medium = 'Medium is required.';
    }
    if (typeof data.style !== 'string' || !data.style.trim()) {
      errors.style = 'Style is required.';
    }
  }

  return errors;
}
