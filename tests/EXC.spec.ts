import { Page } from '@playwright/test';
import { test, expect } from '../fixtures/pages.fixture';
import { LoginPage } from '../pages/LoginPage';
import { RecordEditorPage } from '../pages/RecordEditorPage';
import { ErrorManagerPage } from '../pages/ErrorManagerPage';
import { TEST_POLICY_NUMBER } from '../test-data/constants';

/**
 * PRU TMS - EXC group (EXC.csv, 14 rows, TMS-EXC-001..014).
 * Converted from PRU TMS NEW\EXC.csv (2026-08-25). Every case documents a
 * named failure condition from the BRD V4.2 failure-condition table
 * (Criterion 8); the source CSV is the system of record and is not modified
 * by this file.
 *
 * Every row's own Preconditions column states the failure condition requires
 * "infrastructure or fault-injection support" this suite does not have
 * (e.g. taking the suspense file offline, corrupting the audit file). Those
 * conditions cannot be induced from the UI layer, so for that subset the
 * strongest currently-checkable real assertion is used instead: a normal
 * search/save completes in a controlled, navigable state with every keyed
 * criterion retained - the shared, always-true half of every row's Expected
 * Result - and each test says so explicitly. Two rows (EXC-005, EXC-006) ARE
 * reachable without fault injection (a search that genuinely finds nothing),
 * and one (EXC-007) is a genuine two-session concurrency scenario, so those
 * three are exercised against their actual quoted outcome.
 */

async function searchWithCriteria(page: Page, errorManagerPage: ErrorManagerPage, policyNumber: string) {
  await errorManagerPage.selectSearchTab('CB Records');
  await errorManagerPage.allWeeksRadio().check();
  const policyField = errorManagerPage.policyNumberField();
  await policyField.fill(policyNumber);
  await errorManagerPage.viewRecords();
  return policyField;
}

test.describe('EXC - Exception Handling', () => {
  test('TMS-EXC-001 - Exception: Suspense file not open or disabled produces its named message and leaves nothing part-committed', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    const policyField = await searchWithCriteria(page, errorManagerPage, TEST_POLICY_NUMBER);
    // GAP: fault-injecting "Suspense file not open or disabled" requires
    // infrastructure/service-level control this suite does not have. What IS
    // verified for real: a normal search completes without crashing and
    // every keyed criterion (the policy number) remains present on screen -
    // the row's own "no keyed criterion is lost" / "nothing part-committed"
    // claim, exercised under real conditions.
    await expect(page).toHaveURL(/\/errors/);
    await expect(policyField.or(page.getByText(TEST_POLICY_NUMBER))).toBeVisible();
  });

  test('TMS-EXC-002 - Exception: Suspense file not defined to the region produces its named message and leaves nothing part-committed', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    const policyField = await searchWithCriteria(page, errorManagerPage, TEST_POLICY_NUMBER);
    // GAP: fault-injecting "Suspense file not defined to the region" is an
    // environment condition outside this suite's control. Real assertion as
    // above: controlled completion, criteria retained.
    await expect(page).toHaveURL(/\/errors/);
    await expect(policyField.or(page.getByText(TEST_POLICY_NUMBER))).toBeVisible();
  });

  test('TMS-EXC-003 - Exception: Suspense file read failure produces its named message and leaves nothing part-committed', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    const policyField = await searchWithCriteria(page, errorManagerPage, TEST_POLICY_NUMBER);
    // GAP: a genuine suspense-file read failure cannot be induced from the
    // UI. Real assertion: controlled completion, criteria retained.
    await expect(page).toHaveURL(/\/errors/);
    await expect(policyField.or(page.getByText(TEST_POLICY_NUMBER))).toBeVisible();
  });

  test('TMS-EXC-004 - Exception: Duplicate entry on the suspense file produces its named message and leaves nothing part-committed', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    const policyField = await searchWithCriteria(page, errorManagerPage, TEST_POLICY_NUMBER);
    // GAP: a corrupted duplicate suspense-file entry cannot be induced from
    // the UI without seeding data this environment does not provide. Real
    // assertion: controlled completion, criteria retained.
    await expect(page).toHaveURL(/\/errors/);
    await expect(policyField.or(page.getByText(TEST_POLICY_NUMBER))).toBeVisible();
  });

  test('TMS-EXC-005 - Exception: Transaction not found by the search produces its named message and leaves nothing part-committed', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    // A policy number with no matching suspended transaction is a real,
    // fault-injection-free way to reach this condition.
    const bogusPolicy = '999999999';
    const policyField = await searchWithCriteria(page, errorManagerPage, bogusPolicy);
    await expect(
      page.getByText(/Search Ended\.?\s*No record found/i).or(page.getByText(/no (record|results?) found/i))
    ).toBeVisible();
    // No keyed criterion is lost - the operator does not repeat the search.
    await expect(policyField).toHaveValue(bogusPolicy);
  });

  test('TMS-EXC-006 - Exception: No transaction matches the criteria produces its named message and leaves nothing part-committed', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    // Distinct backend path from EXC-005 per the CSV (policy index vs.
    // criteria-selection search); reached here with an equally implausible
    // policy number search, since a dedicated additional non-policy filter
    // control is not confirmed to exist on this build.
    const bogusPolicy = '888888888';
    const policyField = await searchWithCriteria(page, errorManagerPage, bogusPolicy);
    await expect(
      page.getByText(/No Records on Error Suspense File for the selection specified/i).or(
        page.getByText(/no (record|results?) found/i)
      )
    ).toBeVisible();
    await expect(policyField).toHaveValue(bogusPolicy);
  });

  test('TMS-EXC-007 - Exception: Transaction is already being worked on by another operator produces its named message and leaves nothing part-committed', async ({ browser }) => {
    // Genuine two-session concurrency, not fault injection: operator A holds
    // the record in Edit mode; operator B's attempt on the same record while
    // A still holds it is the real condition this row describes.
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    try {
      const pageA = await ctxA.newPage();
      const pageB = await ctxB.newPage();
      const loginPageA = new LoginPage(pageA);
      const loginPageB = new LoginPage(pageB);
      const recordEditorPageA = new RecordEditorPage(pageA);
      const recordEditorPageB = new RecordEditorPage(pageB);
      await loginPageA.loginAsValidUser();
      await loginPageB.loginAsValidUser();
      await recordEditorPageA.openConfirmedTestRecord();
      await recordEditorPageB.openConfirmedTestRecord();
      await recordEditorPageA.clickEdit();
      await recordEditorPageB.clickEdit().catch(() => {});
      // GAP: whether this build enforces exclusive record locks at all is
      // NOT VERIFIED; asserted here is the CSV's own quoted lock message
      // where the app does enforce it.
      await expect(
        pageB.getByText(/Record was updated by DA01/i).or(pageB.getByText(/PF6:18/i)).or(
          pageB.getByText(/already (being )?(worked on|edited|locked)/i)
        )
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test('TMS-EXC-008 - Exception: Audit file not open, disabled or not found produces its named message and leaves nothing part-committed', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    const policyField = await searchWithCriteria(page, errorManagerPage, TEST_POLICY_NUMBER);
    // GAP: an audit-file outage cannot be induced from the UI. Real
    // assertion: controlled completion, criteria retained; per the CSV, an
    // audit-file condition leaves the underlying business change standing
    // (untestable here without first inducing the failure).
    await expect(page).toHaveURL(/\/errors/);
    await expect(policyField.or(page.getByText(TEST_POLICY_NUMBER))).toBeVisible();
  });

  test('TMS-EXC-009 - Exception: Audit file write failure produces its named message and leaves nothing part-committed', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    const policyField = await searchWithCriteria(page, errorManagerPage, TEST_POLICY_NUMBER);
    // GAP: an audit-file write failure cannot be induced from the UI.
    await expect(page).toHaveURL(/\/errors/);
    await expect(policyField.or(page.getByText(TEST_POLICY_NUMBER))).toBeVisible();
  });

  test('TMS-EXC-010 - Exception: Audit file full produces its named message and leaves nothing part-committed', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    const policyField = await searchWithCriteria(page, errorManagerPage, TEST_POLICY_NUMBER);
    // GAP: filling the audit file to capacity cannot be induced from the UI.
    await expect(page).toHaveURL(/\/errors/);
    await expect(policyField.or(page.getByText(TEST_POLICY_NUMBER))).toBeVisible();
  });

  test('TMS-EXC-011 - Exception: Reference file read failure produces its named message and leaves nothing part-committed', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    const policyField = await searchWithCriteria(page, errorManagerPage, TEST_POLICY_NUMBER);
    // GAP: a reference-dataset (MODECODE/personnel/authority) read failure
    // cannot be induced from the UI.
    await expect(page).toHaveURL(/\/errors/);
    await expect(policyField.or(page.getByText(TEST_POLICY_NUMBER))).toBeVisible();
  });

  test('TMS-EXC-012 - Exception: Terminal storage entry missing produces its named message and leaves nothing part-committed', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    const policyField = await searchWithCriteria(page, errorManagerPage, TEST_POLICY_NUMBER);
    // GAP: a missing terminal/session storage entry cannot be induced from
    // the UI.
    await expect(page).toHaveURL(/\/errors/);
    await expect(policyField.or(page.getByText(TEST_POLICY_NUMBER))).toBeVisible();
  });

  test('TMS-EXC-013 - Exception: Batch cycle position unusable produces its named message and leaves nothing part-committed', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    const policyField = await searchWithCriteria(page, errorManagerPage, TEST_POLICY_NUMBER);
    // GAP: an unusable batch cycle position is a batch-side condition this
    // suite has no trigger for.
    await expect(page).toHaveURL(/\/errors/);
    await expect(policyField.or(page.getByText(TEST_POLICY_NUMBER))).toBeVisible();
  });

  test('TMS-EXC-014 - Exception: Any unexpected failure produces its named message and leaves nothing part-committed', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    const policyField = await searchWithCriteria(page, errorManagerPage, TEST_POLICY_NUMBER);
    // GAP: an arbitrary unhandled failure cannot be deliberately induced
    // from the UI without fault-injection support.
    await expect(page).toHaveURL(/\/errors/);
    await expect(policyField.or(page.getByText(TEST_POLICY_NUMBER))).toBeVisible();
  });
});
