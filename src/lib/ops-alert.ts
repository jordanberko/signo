/**
 * Fire-and-forget Discord alert for operational issues that would
 * otherwise surface days later (escrow transfer failures, webhook
 * race losses, etc).
 *
 * Reads DISCORD_OPS_WEBHOOK_URL from env at call time. If unset, logs
 * a warning and returns without throwing. Webhook fetch errors are
 * logged and swallowed — an alert failure must never compound the
 * original failure.
 */

export type OpsAlertLevel = 'warn' | 'error';

interface OpsAlertParams {
  title: string;
  description: string;
  context?: Record<string, string | number | null | undefined>;
  level?: OpsAlertLevel;
}

// Discord embed colors (decimal RGB)
const TERRACOTTA = 0xc45d3e; // matches --color-terracotta — error
const AMBER = 0xe0a64c; // warn

const WEBHOOK_TIMEOUT_MS = 3000;

export async function sendOpsAlert(params: OpsAlertParams): Promise<void> {
  const url = process.env.DISCORD_OPS_WEBHOOK_URL;
  if (!url) {
    console.warn(
      '[OpsAlert] DISCORD_OPS_WEBHOOK_URL not set; alert dropped:',
      params.title,
    );
    return;
  }

  const fields = Object.entries(params.context ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .slice(0, 25)
    .map(([name, value]) => ({
      name: name.slice(0, 256),
      value: String(value).slice(0, 1024),
      inline: true,
    }));

  const body = {
    embeds: [
      {
        title: `[SIGNO] ${params.title}`.slice(0, 256),
        description: params.description.slice(0, 4096),
        color: params.level === 'error' ? TERRACOTTA : AMBER,
        fields,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    if (!res.ok) {
      const responseText = await res.text().catch(() => '');
      console.error(
        '[OpsAlert] Discord webhook returned',
        res.status,
        responseText,
      );
    }
  } catch (err) {
    console.error(
      '[OpsAlert] Send failed:',
      err instanceof Error ? err.message : String(err),
    );
  }
}
