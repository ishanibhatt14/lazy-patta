// Reusable two-user harness for behavioural RLS tests against a *running* local
// Supabase instance (`pnpm supabase:start`). It provisions two confirmed users
// via the service role, signs each in through the anon key to obtain a
// user-scoped client, and exposes anon + service clients alongside them.
//
// Future room / private-hand policies should reuse `createTwoUserHarness` rather
// than re-implementing user provisioning, so cross-user denial tests stay
// uniform across the schema.

import { randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Local `supabase start` prints fixed demo keys; they are the same on every
// machine and are safe to hard-code as defaults (overridable via env for CI or
// a hosted test project). They are NOT production secrets.
const DEFAULT_URL = 'http://127.0.0.1:54321';
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';
const DEFAULT_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxNzk5NTM1NjAwfQ.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export const SUPABASE_URL = process.env.SUPABASE_URL ?? DEFAULT_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? DEFAULT_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? DEFAULT_SERVICE_ROLE_KEY;

const NO_SESSION = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** A client keyed with the anon (public) key and no user session. */
export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, NO_SESSION);
}

/** A client keyed with the service role key. Bypasses RLS — server-side only. */
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, NO_SESSION);
}

/**
 * Throw (rather than skip) if the local stack is not reachable, so `test:rls`
 * fails loudly instead of silently passing when no instance is running.
 */
export async function assertSupabaseReachable(): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: ANON_KEY },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Supabase auth health check returned HTTP ${res.status}`);
    }
  } catch (cause) {
    throw new Error(
      `Local Supabase is not reachable at ${SUPABASE_URL}. Run \`pnpm supabase:start\` first.`,
      { cause },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export interface TestUser {
  readonly id: string;
  readonly email: string;
  readonly password: string;
  /** A client authenticated as this user (RLS applies as this uid). */
  readonly client: SupabaseClient;
}

export interface TwoUserHarness {
  /** Service-role client (bypasses RLS) for setup/inspection only. */
  readonly admin: SupabaseClient;
  /** Anonymous client (anon key, no session). */
  readonly anon: SupabaseClient;
  readonly userA: TestUser;
  readonly userB: TestUser;
  /** Remove both provisioned users (cascades their rows). */
  readonly cleanup: () => Promise<void>;
}

async function provisionUser(admin: SupabaseClient, tag: string): Promise<TestUser> {
  const email = `rls-${tag}-${randomUUID()}@example.test`;
  const password = `Pw-${randomUUID()}`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Failed to create test user ${tag}: ${error?.message ?? 'no user returned'}`);
  }

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`Failed to sign in test user ${tag}: ${signInError.message}`);
  }

  return { id: data.user.id, email, password, client };
}

/**
 * Provision two independent, signed-in users plus anon + service clients.
 * Always pair with `await harness.cleanup()` in an `afterAll`.
 */
export async function createTwoUserHarness(): Promise<TwoUserHarness> {
  const admin = serviceClient();
  const userA = await provisionUser(admin, 'a');
  const userB = await provisionUser(admin, 'b');

  return {
    admin,
    anon: anonClient(),
    userA,
    userB,
    cleanup: async () => {
      await admin.auth.admin.deleteUser(userA.id).catch(() => undefined);
      await admin.auth.admin.deleteUser(userB.id).catch(() => undefined);
    },
  };
}
