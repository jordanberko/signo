import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendListingsPaused, sendGracePeriodReminder } from '@/lib/email';

/**
 * GET|POST /api/cron/expire-grace-periods
 *
 * 1. Pauses profiles whose grace period has expired (pending_activation + deadline passed).
 * 2. Sends reminder emails to profiles approaching their deadline (~4 days remaining).
 *
 * Protected by CRON_SECRET. Vercel Cron calls GET daily at 02:00 UTC;
 * POST is kept as an ops-accessible alias so `curl -X POST` still
 * works during incidents.
 */
async function handler(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  let paused = 0;
  let reminded = 0;
  let failed = 0;

  try {
    // ── 1. Expire: grace period has passed ──
    const { data: expiredProfiles, error: expiredErr } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('subscription_status', 'pending_activation')
      .lt('grace_period_deadline', now.toISOString());

    if (expiredErr) {
      console.error('[Cron] expire-grace-periods: failed to query expired profiles:', expiredErr);
      throw expiredErr;
    }

    for (const profile of expiredProfiles ?? []) {
      try {
        await supabase
          .from('profiles')
          .update({ subscription_status: 'paused' })
          .eq('id', profile.id);

        if (profile.email) {
          await sendListingsPaused({
            email: profile.email,
            artistName: profile.full_name || '',
          });
        }

        paused++;
      } catch (err) {
        console.error(`[Cron] expire-grace-periods: failed to pause profile ${profile.id}:`, err);
        failed++;
      }
    }

    // ── 2. Remind: 3–5 days remaining (roughly 4 days out) ──
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const { data: reminderProfiles, error: reminderErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, grace_period_deadline')
      .eq('subscription_status', 'pending_activation')
      .gte('grace_period_deadline', threeDaysFromNow.toISOString())
      .lte('grace_period_deadline', fiveDaysFromNow.toISOString());

    if (reminderErr) {
      console.error('[Cron] expire-grace-periods: failed to query reminder profiles:', reminderErr);
      throw reminderErr;
    }

    for (const profile of reminderProfiles ?? []) {
      try {
        if (profile.email && profile.grace_period_deadline) {
          const deadline = new Date(profile.grace_period_deadline);
          const daysRemaining = Math.ceil(
            (deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          );

          await sendGracePeriodReminder({
            email: profile.email,
            artistName: profile.full_name || '',
            daysRemaining,
          });

          reminded++;
        }
      } catch (err) {
        console.error(`[Cron] expire-grace-periods: failed to remind profile ${profile.id}:`, err);
        failed++;
      }
    }

    console.log(
      `[Cron] expire-grace-periods complete: ${paused} paused, ${reminded} reminded, ${failed} failed`
    );

    return NextResponse.json({ paused, reminded, failed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Cron] expire-grace-periods error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handler(request);
}

export async function POST(request: Request) {
  return handler(request);
}
