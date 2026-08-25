import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ErrorManagerPage } from '../pages/ErrorManagerPage';
import { RecordEditorPage } from '../pages/RecordEditorPage';

/**
 * Extends the base Playwright test with one Page Object instance per screen, all bound to
 * the fixture-managed `page`. Tests that need a second/third browser context (concurrent-
 * session and locking scenarios) instantiate the same Page Object classes directly against
 * their own extra pages - see e.g. tests/ADD-TC.spec.ts or tests/E2E.spec.ts.
 *
 * Deliberately NOT wired to a storageState/auth.setup.ts project: a large share of this
 * suite (LOGIN.spec.ts, ERRTAX.spec.ts, several ADD-TC/E2E cases) exercises the sign-in
 * flow itself, unauthenticated redirects, or multiple independent concurrent sessions -
 * pre-authenticating via a shared storage state would change what those tests actually
 * verify. loginPage.loginAsValidUser() is the single reused entry point instead, so no test
 * repeats the raw login steps inline.
 */
type PageFixtures = {
  loginPage: LoginPage;
  errorManagerPage: ErrorManagerPage;
  recordEditorPage: RecordEditorPage;
};

export const test = base.extend<PageFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  errorManagerPage: async ({ page }, use) => {
    await use(new ErrorManagerPage(page));
  },
  recordEditorPage: async ({ page }, use) => {
    await use(new RecordEditorPage(page));
  },
});

export { expect };
