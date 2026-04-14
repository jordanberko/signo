import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { sendTradeEnquiryNotification } from '@/lib/email';

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

    // Validate required fields
    if (!business_name || !contact_name || !email || !business_type || !description || !budget_range) {
      return NextResponse.json(
        { error: 'Please fill in all required fields.' },
        { status: 400 },
      );
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address.' },
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
