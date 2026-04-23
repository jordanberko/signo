import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appUrl } from '@/lib/urls';

// Snapshot + restore the three env vars appUrl() reads so tests don't
// leak state into one another or into the wider test run.
const ENV_KEYS = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_VERCEL_URL',
  'VERCEL_URL',
] as const;

describe('appUrl', () => {
  const snapshot: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      snapshot[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k];
    }
  });

  it('prefers NEXT_PUBLIC_APP_URL when set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://signoart.com.au';
    process.env.VERCEL_URL = 'should-be-ignored.vercel.app';
    expect(appUrl()).toBe('https://signoart.com.au');
  });

  it('strips a trailing slash from NEXT_PUBLIC_APP_URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://signoart.com.au/';
    expect(appUrl()).toBe('https://signoart.com.au');
  });

  it('falls back to NEXT_PUBLIC_VERCEL_URL when override is unset', () => {
    process.env.NEXT_PUBLIC_VERCEL_URL = 'signo-git-branch.vercel.app';
    expect(appUrl()).toBe('https://signo-git-branch.vercel.app');
  });

  it('falls back to VERCEL_URL when the NEXT_PUBLIC_ alias is absent', () => {
    process.env.VERCEL_URL = 'signo-preview-xyz.vercel.app';
    expect(appUrl()).toBe('https://signo-preview-xyz.vercel.app');
  });

  it('defaults to http://localhost:3000 when nothing is set', () => {
    expect(appUrl()).toBe('http://localhost:3000');
  });

  it('treats a whitespace-only override as unset', () => {
    process.env.NEXT_PUBLIC_APP_URL = '   ';
    expect(appUrl()).toBe('http://localhost:3000');
  });
});
