import { Page } from '@playwright/test';

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH'];

/**
 * Intercepts every state-changing request (POST/PUT/PATCH) and aborts it with the given
 * reason, letting everything else (GET, static assets) through untouched. Used to simulate
 * a network interruption / dependency outage safely, without ever reaching the live shared
 * dev environment's backend.
 */
export async function abortMutatingRequests(page: Page, reason = 'failed'): Promise<void> {
  await page.route('**/*', async (route) => {
    const req = route.request();
    if (MUTATING_METHODS.includes(req.method())) {
      await route.abort(reason);
    } else {
      await route.continue();
    }
  });
}

/**
 * Intercepts every state-changing request (POST/PUT/PATCH) and fulfills it with a synthetic
 * server error, to exercise the client's handling of a genuine 5xx without risking the
 * shared live fixture record.
 */
export async function fulfillMutatingRequestsWithServerError(page: Page, status = 500): Promise<void> {
  await page.route('**/*', async (route) => {
    const req = route.request();
    if (MUTATING_METHODS.includes(req.method())) {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Intercepts every state-changing request and records its URL instead of letting it reach
 * the server - used to prove a double-click/double-submit is de-duplicated to at most one
 * attempted request without actually finalizing a shared fixture record.
 */
export function interceptAndAbortMutatingRequests(page: Page): { urls: string[] } {
  const record = { urls: [] as string[] };
  page.route('**/*', async (route) => {
    const req = route.request();
    if (MUTATING_METHODS.includes(req.method())) {
      record.urls.push(req.url());
      await route.abort();
    } else {
      await route.continue();
    }
  });
  return record;
}

export { MUTATING_METHODS };
