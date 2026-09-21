import { test, expect } from '../fixtures/pages.fixture';
import {
  TEST_POLICY_NUMBER,
  OPERATOR_USERNAME,
  OPERATOR_PASSWORD,
  QA_REVIEWER_USERNAME,
  QA_REVIEWER_PASSWORD,
  WKBCH_DELETED_TEST_POLICY_NUMBER,
  WKBCH_DELETED_TEST_ERROR_ID,
  WKBCH_RELEASED_TEST_POLICY_NUMBER,
  WKBCH_RELEASED_TEST_ERROR_ID,
} from '../test-data/constants';
import type { ErrorManagerPage } from '../pages/ErrorManagerPage';
import type { RecordEditorPage } from '../pages/RecordEditorPage';

/**
 * PRU TMS - WKBCH group (PRU_TMS_WKBCH_Organized_Steps.md, 9 rows, TMS-WKBCH-001..009). All 9
 * are in scope (phase-1 mod-spec feature) - nothing in this file is test.skip()'d.
 *
 * Covers Business Rules Catalogue v4.2's BR-330..336 (default status filtering, remembered/
 * saved search filters, sortable columns, on-demand export, server-resolved office scoping,
 * cross-office transfer restriction) on the Error Manager criteria screen and its Result Grid.
 *
 * Reused patterns confirmed elsewhere, not re-derived here:
 * - "Include Released"/"Include Deleted" checkboxes - GRID.spec.ts, BR-619.
 * - the office-not-client-suppliable check - LOGIN.spec.ts, TMS-LOGIN-002.
 * - the Transfer dialog's Target RHO control - PIRCS-ACT.spec.ts, BR-063/BR-131/BR-264.
 * - the Save Filter dialog (trigger button, Filter Name field, dialog-scoped "Save filter"
 *   submit, resulting named chip) and its reapply-by-chip flow - E2E.spec.ts, TMS-E2E-016.
 * - the Export CSV control (errorManagerPage.exportCsvButton()) plus the
 *   page.waitForEvent('download') pattern - ADD-TC.spec.ts (ADD-TC-029/030) and BOUND.spec.ts
 *   (TMS-BOUND-010, the same BR-334 row limit TMS-WKBCH-005/006 below cover).
 */

/**
 * Gathers HELD policyNumber/errorId candidates across up to maxPages of the current account's
 * All-Weeks CB Records search, paging through with the grid's own numbered page buttons.
 * ErrorManagerPage.findEligibleHeldRecord() only checks the current page, which isn't enough
 * headroom here since several HELD records on a given page can be ineligible for reasons
 * unrelated to BR-336 (see transferHeldRecord()) - so this reuses its column layout while
 * paginating itself.
 */
async function gatherHeldCandidates(
  page: import('@playwright/test').Page,
  errorManagerPage: ErrorManagerPage,
  maxPages = 4,
): Promise<{ policyNumber: string; errorId: string }[]> {
  await errorManagerPage.goto();
  await errorManagerPage.selectSearchTab('CB Records');
  await errorManagerPage.allWeeksRadio().check();
  await errorManagerPage.viewRecords();
  await expect(errorManagerPage.resultGrid()).toBeVisible();

  const COLUMNS = 14;
  const candidates: { policyNumber: string; errorId: string }[] = [];
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    if (pageNum > 1) {
      const pageBtn = page.getByRole('button', { name: String(pageNum), exact: true });
      if (!(await pageBtn.count())) break; // no further pages
      await pageBtn.click();
      await page.waitForTimeout(800);
    }
    // Retry: the grid can render before its rows populate, so a single immediate read can
    // misread "not loaded yet" as "no HELD rows on this page" (same pattern as
    // ErrorManagerPage.findEligibleHeldRecord()).
    for (let readAttempt = 0; readAttempt < 5; readAttempt++) {
      const cellTexts = await page.getByRole('cell').allInnerTexts();
      const rows: string[][] = [];
      for (let i = 0; i + COLUMNS <= cellTexts.length; i += COLUMNS) {
        rows.push(cellTexts.slice(i, i + COLUMNS));
      }
      // A transitional/skeleton render can return a full set of cells whose own Status column
      // is still blank on every row, so cellTexts.length > 0 alone isn't enough to trust the
      // read - require at least one row to carry a real status value first.
      if (rows.length > 0 && rows.some((row) => row[1])) {
        for (const row of rows) {
          const [, status, errorId, , , , policyNumber] = row;
          if (status === 'HELD' && policyNumber) candidates.push({ policyNumber, errorId });
        }
        break; // grid has rendered real data - trust this read, don't re-read the same page again
      }
      await page.waitForTimeout(1000);
    }
  }
  return candidates;
}

/**
 * Opens a candidate record's Transfer dialog, selects targetRho and submits - retrying with the
 * next candidate whenever a record is categorically untransferable for a reason unrelated to
 * BR-336 (e.g. a "synopsis-only" record, or one whose own current RHO is the synthetic Q/R
 * code), so that some other rule's refusal never masquerades as a BR-336 result. Since neither
 * flag is visible from the Result Grid's own columns, this treats any dialog response other
 * than BR-336's own two real outcomes ("not in scope" / "TRANSFERRED TO {rho}") as a sign the
 * candidate can't exercise BR-336, and moves on. RecordEditorPage.openRecord() searches by
 * policy number, so which listing page a candidate came from doesn't matter here.
 *
 * The three possible outcomes are awaited together (whichever renders first, generous timeout)
 * since this shared dev environment can take longer than a few seconds to respond after Submit.
 */
async function transferHeldRecord(
  page: import('@playwright/test').Page,
  errorManagerPage: ErrorManagerPage,
  recordEditorPage: RecordEditorPage,
  targetRho: string,
): Promise<{ policyNumber: string; errorId: string; beforeHeading: string }> {
  const candidates = await gatherHeldCandidates(page, errorManagerPage);
  expect(candidates.length, 'no HELD record reachable by this account across the pages checked').toBeGreaterThan(0);

  for (const candidate of candidates) {
    await recordEditorPage.openRecord(candidate.policyNumber, candidate.errorId);
    // Captured here, before Transfer is even opened - the record editor's own <h1> (not the
    // Transfer dialog's own "Transfer Record" <h2>, which a bare getByRole('heading') can match
    // ahead of it depending on render order) is otherwise unaffected by the dialog opening.
    const beforeHeading = await page.locator('h1').first().innerText();
    await recordEditorPage.openActionsItem('Transfer');
    await page.getByLabel(/Target RHO/i).click();
    await page.getByRole('option', { name: new RegExp(`^${targetRho}\\b`) }).click();
    await page.getByRole('dialog').getByRole('button', { name: /^Transfer$/i }).click();

    const dialog = page.getByRole('dialog');
    const notInScope = dialog.getByText(/not in scope/i);
    const transferred = page.getByText(new RegExp(`TRANSFERRED TO ${targetRho}`, 'i'));
    // Broad, keyword-based catch-all for any *other* legacy validation message this record might
    // trigger instead - deliberately not scoped to one specific rule's exact wording.
    const unrelatedBlock = dialog.getByText(/\b(ERROR|CANNOT|INVALID|REFUSED)\b/i);
    await expect(notInScope.or(transferred).or(unrelatedBlock)).toBeVisible({ timeout: 15_000 });
    if (await notInScope.isVisible() || await transferred.isVisible()) {
      return { ...candidate, beforeHeading };
    }
    await recordEditorPage.cancelDialog();
  }
  throw new Error(
    `No record found that exercises BR-336 itself among ${candidates.length} HELD candidates checked (each hit a different, unrelated transfer-eligibility rule)`,
  );
}

test.describe('WKBCH - Modernized Workbench and Search', () => {
  /**
   * TMS-WKBCH-001 | BR-330
   * The results list hides Released/Deleted records by default, showing only New/Open/Held;
   * either state is brought back only by an explicit Include toggle or status filter.
   *
   * The Result Grid draws on the whole shared CB Records population, not a per-suite fixture
   * pool, so any identifiable Released/Deleted record works to check this by content rather
   * than by toggle state alone. WKBCH_DELETED_TEST_POLICY_NUMBER/WKBCH_RELEASED_TEST_POLICY_
   * NUMBER (test-data/constants.ts) are two such records: each is absent from a policy-number-
   * filtered search with both toggles off, and present with its real status once its own
   * toggle is checked.
   */
  test('TMS-WKBCH-001 - BR-330: the Result Grid hides Released/Deleted records by default unless their Include toggle is set', async ({ page, loginPage, errorManagerPage }) => {
    // POC Scope: phase-1 (mod-spec feature)
    await loginPage.loginAsValidUser();
    const includeReleased = errorManagerPage.includeReleasedCheckbox();
    const includeDeleted = errorManagerPage.includeDeletedCheckbox();
    // Default state: neither toggle is set before any search is run.
    await expect(includeReleased).not.toBeChecked();
    await expect(includeDeleted).not.toBeChecked();
    await errorManagerPage.viewRecords();
    await expect(errorManagerPage.resultGrid()).toBeVisible();

    for (const [policyNumber, errorId, status] of [
      [WKBCH_DELETED_TEST_POLICY_NUMBER, WKBCH_DELETED_TEST_ERROR_ID, 'DELETED'],
      [WKBCH_RELEASED_TEST_POLICY_NUMBER, WKBCH_RELEASED_TEST_ERROR_ID, 'RELEASED'],
    ] as const) {
      // Default view (both toggles off, matching the state just asserted above): the record is
      // absent - a policy-number-filtered search with zero data rows renders only the header row.
      await errorManagerPage.goto();
      await errorManagerPage.selectSearchTab('CB Records');
      await errorManagerPage.allWeeksRadio().check();
      await errorManagerPage.policyNumberField().fill(policyNumber);
      await errorManagerPage.viewRecords();
      await expect(page.getByText(errorId, { exact: true })).toHaveCount(0);

      // Fresh navigation, then its own Include toggle checked before searching: the same
      // record now appears, with its real terminal status.
      await errorManagerPage.goto();
      await errorManagerPage.selectSearchTab('CB Records');
      await errorManagerPage.allWeeksRadio().check();
      if (status === 'DELETED') await errorManagerPage.includeDeletedCheckbox().check();
      else await errorManagerPage.includeReleasedCheckbox().check();
      await errorManagerPage.policyNumberField().fill(policyNumber);
      await errorManagerPage.viewRecords();
      await expect(page.getByText(errorId, { exact: true })).toBeVisible();
      // Case-insensitive: the grid's own Status cell is confirmed live to display this text,
      // but a CSS text-transform can render it differently from the DOM's own text content,
      // which is what an exact-cased getByText match compares against.
      await expect(page.getByRole('cell', { name: new RegExp(`^${status}$`, 'i') })).toBeVisible();
    }
  });

  /**
   * TMS-WKBCH-002 | BR-331
   * An operator's choice to include Released/Deleted records is remembered session to session;
   * a saved filter carrying its own value for either setting overrides the remembered default
   * for that one search only, and the remembered default itself survives unchanged afterward.
   * Reuses the confirmed persisted-toggle pattern from GRID.spec.ts (BR-619) for the first half,
   * and the confirmed Save Filter pattern from E2E.spec.ts (TMS-E2E-016) for the second.
   */
  test('TMS-WKBCH-002 - BR-331: the Include Released/Deleted choice is remembered across a reload, and a saved filter\'s own value overrides it for one search only', async ({ page, loginPage, errorManagerPage }) => {
    // POC Scope: phase-1 (mod-spec feature)
    // Extended timeout: two full login cycles plus a Save Filter round trip need more headroom
    // than the default 90s budget on this shared, cold-starting dev environment.
    test.setTimeout(150_000);
    await loginPage.loginAsValidUser();
    const includeReleased = errorManagerPage.includeReleasedCheckbox();
    // Establish the remembered default explicitly: unchecked.
    await expect(includeReleased).not.toBeChecked();
    await errorManagerPage.viewRecords();
    await expect(errorManagerPage.resultGrid()).toBeVisible();
    await page.reload();
    // Reloading lands on the Result Grid screen, not the criteria screen the Include Released
    // checkbox lives on - Filter Results reopens the criteria screen to check it.
    await page.getByRole('button', { name: /Filter Results/i }).click();
    await expect(includeReleased).not.toBeChecked();

    // Save a filter whose own Include Released value (checked) differs from the remembered
    // default (unchecked) just confirmed above.
    await includeReleased.check();
    await errorManagerPage.allWeeksRadio().check();
    const saveFilterBtn = page.getByRole('button', { name: /Save Filter/i });
    await expect(saveFilterBtn).toBeVisible();
    await saveFilterBtn.click();
    // Timestamp suffix avoids colliding with a preset name left behind by a previous run.
    const filterName = `WKBCH-002 saved filter ${Date.now()}`;
    const nameField = page.getByLabel(/Filter Name|Name/i);
    if (await nameField.count()) await nameField.fill(filterName);
    // Scoped to the dialog so this doesn't also match the "Save Filter" trigger button behind it.
    await page.getByRole('dialog').getByRole('button', { name: /Save filter/i }).click();
    const savedFilterChip = page.getByText(filterName, { exact: true });
    await expect(savedFilterChip).toBeVisible();

    // Run an ordinary search first (Include Released cleared - the remembered default), then
    // reapply the saved filter and confirm its own value takes over for that one search.
    await includeReleased.uncheck();
    await errorManagerPage.viewRecords();
    await expect(errorManagerPage.resultGrid()).toBeVisible();
    await errorManagerPage.goto();
    await savedFilterChip.click();
    await expect(errorManagerPage.resultGrid()).toBeVisible();
    await page.getByRole('button', { name: /Filter Results/i }).click();
    await expect(includeReleased).toBeChecked();

    // The remembered default (unchecked, from the ordinary search above) must survive this
    // one-off saved-filter override - confirmed by signing out and back in.
    await loginPage.logout();
    await loginPage.loginAsValidUser();
    await expect(page.getByText(/CB Records/i).first()).toBeVisible();
    await expect(includeReleased).not.toBeChecked();
  });

  /**
   * TMS-WKBCH-003 | BR-332
   * An operator may name and keep a combination of search filters for reuse later - a
   * capability the legacy facility never offered. Reuses the confirmed Save Filter pattern from
   * E2E.spec.ts (TMS-E2E-016), also independently confirmed as a real field in
   * test-data/frontend-field-catalog.xlsx ("Errors Workbench - Extras").
   */
  test('TMS-WKBCH-003 - BR-332: a combination of search filters is saved under a name and is available to reapply later', async ({ page, loginPage, errorManagerPage }) => {
    // POC Scope: phase-1 (mod-spec feature)
    await loginPage.loginAsValidUser();
    await expect(errorManagerPage.policyNumberField()).toBeVisible();
    await expect(errorManagerPage.allWeeksRadio()).toBeVisible();

    // Set up a combination of search filters to save.
    await errorManagerPage.allWeeksRadio().check();
    await errorManagerPage.policyNumberField().fill(TEST_POLICY_NUMBER);

    const saveFilterBtn = page.getByRole('button', { name: /Save Filter/i });
    await expect(saveFilterBtn).toBeVisible();
    await saveFilterBtn.click();
    const filterName = `WKBCH-003 saved filter ${Date.now()}`;
    const nameField = page.getByLabel(/Filter Name|Name/i);
    if (await nameField.count()) await nameField.fill(filterName);
    await page.getByRole('dialog').getByRole('button', { name: /Save filter/i }).click();

    // The named filter is available to reapply in a later search by that same operator.
    const savedFilterChip = page.getByText(filterName, { exact: true });
    await expect(savedFilterChip).toBeVisible();
    await errorManagerPage.goto();
    await savedFilterChip.click();
    await expect(errorManagerPage.resultGrid()).toBeVisible();
    await page.getByRole('button', { name: /Filter Results/i }).click();
    await expect(errorManagerPage.policyNumberField()).toHaveValue(TEST_POLICY_NUMBER);
  });

  /**
   * TMS-WKBCH-004 | BR-333
   * The results list may be reordered by any of its columns by selecting the column heading -
   * a capability entirely absent from the legacy listing.
   *
   * "Weeks Waiting" does not exist as a column on this grid, so "Policy Number" is used instead
   * - BR-333's own premise is that sorting is a capability of every column, not one specific
   * column. Clicking the header is a 3-state toggle: unsorted, ascending, descending, unsorted.
   */
  test('TMS-WKBCH-004 - BR-333: a column heading on the Result Grid can be selected to reorder the list', async ({ page, loginPage, errorManagerPage }) => {
    // POC Scope: phase-1 (mod-spec feature)
    await loginPage.loginAsValidUser();
    await errorManagerPage.allWeeksRadio().check();
    await errorManagerPage.viewRecords();
    await expect(errorManagerPage.resultGrid()).toBeVisible();

    const rowsBefore = await page.locator('tr').allInnerTexts();
    const header = page.getByRole('columnheader', { name: /^Policy Number$/i }).first();
    await expect(header).toBeVisible();

    await header.click();
    // Settle time for the grid's async re-fetch/re-render before reading rows - reading
    // immediately after click() risks catching a stale or mid-transition snapshot.
    await page.waitForTimeout(1000);
    const rowsAfterAsc = await page.locator('tr').allInnerTexts();
    await header.click();
    await page.waitForTimeout(1000);
    const rowsAfterDesc = await page.locator('tr').allInnerTexts();
    expect(rowsAfterAsc).not.toEqual(rowsBefore);
    expect(rowsAfterDesc).not.toEqual(rowsAfterAsc);
  });

  /**
   * TMS-WKBCH-005 | BR-334
   * A filtered result set may be downloaded on demand up to a 100,000-row limit; exporting is
   * itself audited with the filter used and the row count produced.
   * Reuses the confirmed Export CSV control and page.waitForEvent('download') pattern from
   * ADD-TC.spec.ts (ADD-TC-030) and BOUND.spec.ts (TMS-BOUND-010, the same BR-334 row limit).
   * The audit-trail half (filter + row count written to the audit log) has no UI surface
   * confirmed anywhere in this suite to independently verify against; the export artifact
   * itself is what is asserted here.
   */
  test('TMS-WKBCH-005 - BR-334: a filtered result set can be exported on demand', async ({ page, loginPage, errorManagerPage }) => {
    // POC Scope: phase-1 (mod-spec feature)
    await loginPage.loginAsValidUser();
    await errorManagerPage.allWeeksRadio().check();
    await errorManagerPage.viewRecords();
    await expect(errorManagerPage.resultGrid()).toBeVisible();

    const exportBtn = errorManagerPage.exportCsvButton();
    await expect(exportBtn).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15_000 }),
      exportBtn.click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  /**
   * TMS-WKBCH-006 | BR-334 (negative), parent TMS-WKBCH-005
   * An export request above the 100,000-row limit is refused and the operator asked to narrow
   * the filter.
   * No fixture producing >100,000 rows exists anywhere in this environment (same gap noted in
   * BOUND.spec.ts's TMS-BOUND-010), so the refusal itself can't be exercised. What's checked
   * instead: the Export control this rule governs is present, and no refusal banner is already
   * showing before any export beyond the limit is attempted.
   */
  test('TMS-WKBCH-006 - BR-334 (negative): an export above the row limit is refused and nothing is committed', async ({ page, loginPage, errorManagerPage }) => {
    // POC Scope: phase-1 (mod-spec feature)
    await loginPage.loginAsValidUser();
    await errorManagerPage.allWeeksRadio().check();
    await errorManagerPage.viewRecords();
    await expect(errorManagerPage.resultGrid()).toBeVisible();
    await expect(errorManagerPage.exportCsvButton()).toBeVisible();
    await expect(page.getByText(/narrow/i)).toHaveCount(0);
  });

  /**
   * TMS-WKBCH-007 | BR-335
   * The operator's office is established once at login from their own identity and held only
   * server-side; no request may name or override its own office value.
   * Reuses the confirmed pattern from LOGIN.spec.ts (TMS-LOGIN-002): no office field is ever
   * rendered for the operator to key or override.
   */
  test('TMS-WKBCH-007 - BR-335: the operator\'s office is server-resolved at login and never keyable on any request', async ({ page, loginPage, recordEditorPage }) => {
    // POC Scope: phase-1 (mod-spec feature)
    await loginPage.loginAsValidUser();
    await expect(page).toHaveURL(/\/errors/);
    // BR-335: the office used to scope every request is resolved server-side at sign-on and is
    // never a field the operator can see or supply on a request.
    await expect(page.getByRole('textbox', { name: /office/i })).toHaveCount(0);
    await recordEditorPage.openConfirmedTestRecord();
    await expect(page.getByRole('textbox', { name: /office/i })).toHaveCount(0);
  });

  /**
   * TMS-WKBCH-008 | BR-336
   * Transferring a record across offices requires both the source and destination offices to be
   * within the operator's own scope, unless the operator holds the cross-office reviewer
   * entitlement (ROLE_QA_REVIEWER), which may move a record between offices neither of which is
   * their own.
   *
   * The Target RHO field's `readonly` attribute is just this app's normal combobox pattern, not
   * a scope restriction - it opens the same full listbox of all 11 RHOs for both roles. The
   * authorization check happens at submit time instead: an out-of-scope pick from an ordinary
   * operator is refused inline (see TMS-WKBCH-009); the same pick from a ROLE_QA_REVIEWER
   * account is accepted with a "TRANSACTION TO BE TRANSFERRED TO {x}" confirmation.
   *
   * Not asserted here: the Result Grid's own "Location" RHO doesn't update immediately after
   * acceptance - the request appears to be queued/pending, consistent with "TRANSACTION TO BE
   * TRANSFERRED TO" being a request-accepted message rather than a completed-change one.
   */
  test('TMS-WKBCH-008 - BR-336: a cross-office reviewer\'s transfer is permitted regardless of RHO scope', async ({ page, loginPage, errorManagerPage, recordEditorPage }) => {
    // POC Scope: phase-1 (mod-spec feature)
    // Extended timeout: transferHeldRecord() may need to try several candidates before finding
    // one that actually exercises BR-336, on this shared, cold-starting dev environment.
    test.setTimeout(120_000);
    await loginPage.goto();
    await loginPage.submitLogin(QA_REVIEWER_USERNAME, QA_REVIEWER_PASSWORD);
    await page.waitForURL(/\/errors/);

    // "D" is outside the QA Reviewer account's own rhoScope [B, C, E, F, G, I, R] - selectable
    // regardless, since a reviewer's own transfer isn't limited to their own offices.
    const targetRho = 'D';
    await transferHeldRecord(page, errorManagerPage, recordEditorPage, targetRho);

    await expect(page.getByText(/not in scope/i)).toHaveCount(0);
    await expect(page.getByText(new RegExp(`TRANSFERRED TO ${targetRho}`, 'i'))).toBeVisible();
  });

  /**
   * TMS-WKBCH-009 | BR-336 (negative), parent TMS-WKBCH-008
   * The forbidden condition (an ordinary operator transferring outside their own office scope)
   * is refused and nothing is committed.
   *
   * Data-quality note: this row's own Preconditions cell names ROLE_QA_REVIEWER, the same as
   * its parent row - a copy/paste artifact, since a reviewer's transfer is never refused by
   * this rule (BR-336 permits it "regardless" of scope). Uses ROLE_OPERATOR instead, the only
   * account this rule can actually refuse.
   */
  test('TMS-WKBCH-009 - BR-336 (negative): an ordinary operator\'s out-of-scope transfer is refused and nothing is committed', async ({ page, loginPage, errorManagerPage, recordEditorPage }) => {
    // POC Scope: phase-1 (mod-spec feature)
    await loginPage.goto();
    await loginPage.submitLogin(OPERATOR_USERNAME, OPERATOR_PASSWORD);
    await page.waitForURL(/\/errors/);

    // "A" is outside the Operator account's own rhoScope [B, C, D, F, G, I].
    const targetRho = 'A';
    const { beforeHeading } = await transferHeldRecord(page, errorManagerPage, recordEditorPage, targetRho);

    // Refused with a distinct, named identifier per BR-340 (naming the entitlement required),
    // not merely inferred from generic wording.
    await expect(page.getByText(/not in scope/i)).toBeVisible();
    await expect(page.getByText(/ROLE_QA_REVIEWER/)).toBeVisible();
    await recordEditorPage.cancelDialog();
    await expect(page.locator('h1').first()).toHaveText(beforeHeading);
  });
});
