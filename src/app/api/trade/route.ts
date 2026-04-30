import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { sendTradeEnquiryNotification } from '@/lib/email';

// See the same constant in `src/app/api/contact/route.ts` for rationale.
// Defined inline (no shared util) per scope discipline; mirror this in
// the trade page client-side regex.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

/**
 * POST /api/trade
 *
 * Saves a trade enquiry to the trade_enquiries table and notifies admin.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 requests per 15 minutes per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { success } = rateLimit(`trade:${ip}`, { max: 5, windowMs: 15 * 60_000 });
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { business_name, contact_name, email, phone, business_type, description, budget_range } = body;

    // Field-level validation. Returns 400 with both `error` (banner
    // summary) and `errors` (field map for inline UI), matching the
    // shape used by the artworks route.
    const errors: Record<string, string> = {};
    if (!business_name || (typeof business_name === 'string' && !business_name.trim())) {
      errors.business_name = 'Business name is required.';
    }
    if (!contact_name || (typeof contact_name === 'string' && !contact_name.trim())) {
      errors.contact_name = 'Contact name is required.';
    }
    if (!email || (typeof email === 'string' && !email.trim())) {
      errors.email = 'Email is required.';
    } else if (typeof email === 'string' && !EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!business_type || (typeof business_type === 'string' && !business_type.trim())) {
      errors.business_type = 'Please select an industry.';
    }
    if (!description || (typeof description === 'string' && !description.trim())) {
      errors.description = 'Brief description is required.';
    }
    if (!budget_range || (typeof budget_range === 'string' && !budget_range.trim())) {
      errors.budget_range = 'Please select a budget range.';
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          error: 'Please check the highlighted fields below.',
          errors,
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.from('trade_enquiries').insert({
      business_name,
      contact_name,
      email,
      phone: phone || null,
      business_type,
      description,
      budget_range,
    });

    if (error) {
      console.error('[API /trade] Insert error:', error.message);
      return NextResponse.json(
        { error: 'Failed to submit enquiry. Please try again.' },
        { status: 500 },
      );
    }

    // Send admin notification (non-blocking — failures are logged, not thrown)
    sendTradeEnquiryNotification({
      businessName: business_name,
      contactName: contact_name,
      email,
      phone: phone || undefined,
      businessType: business_type,
      description,
      budgetRange: budget_range,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API /trade] Exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
