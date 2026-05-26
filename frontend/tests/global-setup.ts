/**
 * Playwright Global Setup
 * Runs once before all E2E tests.
 * Creates the test HR user via the dev-only backend endpoint.
 */

import { request } from '@playwright/test';

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:10000';

export default async function globalSetup() {
  const api = await request.newContext({ baseURL: BACKEND_URL });

  try {
    const res = await api.post('/api/test-setup/hr-user');
    if (res.ok()) {
      const body = await res.json();
      console.log(`\n[E2E Setup] ✅ Test HR user ready: ${body.email} (${body.role})`);
    } else {
      const text = await res.text();
      console.warn(`\n[E2E Setup] ⚠️  Backend returned ${res.status()} — ${text}`);
      console.warn('[E2E Setup] Pipeline tests may fail if the HR user does not exist.');
    }
  } catch (err) {
    console.warn(`\n[E2E Setup] ⚠️  Could not reach backend at ${BACKEND_URL}: ${err}`);
    console.warn('[E2E Setup] Pipeline tests may fail if the HR user does not exist.');
    // Do NOT throw — let the tests run and fail descriptively on their own.
  } finally {
    await api.dispose();
  }
}
