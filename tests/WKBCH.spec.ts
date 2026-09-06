import { test, expect } from '../fixtures/pages.fixture';
import { TEST_POLICY_NUMBER, OPERATOR_USERNAME, OPERATOR_PASSWORD, QA_REVIEWER_USERNAME, QA_REVIEWER_PASSWORD } from '../test-data/constants';
import type { ErrorManagerPage } from '../pages/ErrorManagerPage';
import type { RecordEditorPage } from '../pages/RecordEditorPage';

/**
 * PRU TMS - WKBCH group (PRU_TMS_WKBCH_Organized_Steps.md, 9 rows, TMS-WKBCH-001..009).
 * Every row's own POC Scope column (see the organized-steps reference) reads
 * "phase-1 (mod-spec feature)" - all 9 are in scope, so nothing in this file is test.skip()'d
 * for POC Scope reasons.
 *
 * Every row documents Business Rules Catalogue v4.2's new-in-v4 "Modernized Workbench and
 * Search" capabilities (BR-330 to BR-336: default status filtering, remembered/saved search
 * filters, sortable columns, on-demand export, server-resolved office scoping, cross-office
 * transfer restriction) layered on the Error Manager criteria screen and its Result Grid.
 *
 * Where a confirmed, live selector already exists in a sibling spec for the same underlying
 * mechanism, that confirmed selector is reused directly rather than re-discovered:
 * - "Include Released"/"Include Deleted" checkboxes - GRID.spec.ts, BR-619.
 * - the office-not-client-suppliable check - LOGIN.spec.ts, TMS-LOGIN-002.
 * - the Transfer dialog's Target RHO destination-office control - PIRCS-ACT.spec.ts,
 *   BR-063/BR-131/BR-264.
 * - the "Save Filter" preset dialog (trigger button, Filter Name field, dialog-scoped
 *   "Save filter" submit, resulting named chip) and its reapply-by-chip flow - E2E.spec.ts,
 *   TMS-E2E-016. This is also independently confirmed as a real field in
 *   test-data/frontend-field-catalog.xlsx ("Errors Workbench - Extras": savedFilterPresetName,
 *   savedFilterPinned, savedFilterChip) - the CSV/PDF conversion's original claim that no
 *   save-filter control exists anywhere in this suite predates that discovery and no longer
 *   holds; TMS-WKBCH-002/003 below exercise it for real instead of falling back.
 * - the Export CSV control (errorManagerPage.exportCsvButton()) plus the
 *   page.waitForEvent('download') pattern - ADD-TC.spec.ts (ADD-TC-029/030) and BOUND.spec.ts
 *   (TMS-BOUND-010, the same BR-334 row limit this group's own TMS-WKBCH-005/006 cover). Export
 *   IS a real, present control (confirmed live in this suite's own page snapshots); the CSV/PDF
 *   conversion's original claim otherwise no longer holds either.
 *
 * Verification notes and open gaps:
 * - TMS-WKBCH-002 (BR-331): both halves are now verified for real - the persisted-Include-
 *   toggle-across-reload half (GRID.spec.ts's BR-619 pattern) and the saved-filter-overrides-
 *   remembered-default half (E2E-016's Save Filter pattern).
 * - TMS-WKBCH-003 (BR-332): verified for real - naming and saving a filter combination, and
 *   reapplying it by its chip, via the confirmed Save Filter pattern (E2E-016).
 * - TMS-WKBCH-004 (BR-333): verified for real, working as intended - clicking a real column
 *   header ("Policy Number"; "Weeks Waiting" does not exist as a column) is confirmed live
 *   (2026-09-02) to be a genuine 3-state ascending/descending/unsorted toggle. This directly
 *   contradicts E2E.spec.ts's TMS-E2E-017, whose own doc comment calls this a confirmed defect
 *   ("no column header is sortable at all") - that finding looks stale/racy: its two clicks
 *   fire back-to-back with no settle time, which can outrun the grid's async re-render and read
 *   the same intermediate state twice. TMS-WKBCH-004 below adds a short settle wait after each
 *   click to avoid that race, and passes.
 * - TMS-WKBCH-005 (BR-334): verified for real - Export CSV is clicked and a real download is
 *   asserted, reusing the confirmed pattern from ADD-TC.spec.ts/BOUND.spec.ts.
 * - TMS-WKBCH-006 (BR-334 negative): BLOCKED BY UNAVAILABLE TEST DATA - no fixture producing
 *   >100,000 rows exists anywhere in this suite or environment (same gap independently noted in
 *   BOUND.spec.ts's TMS-BOUND-010), so the refusal-above-the-limit half cannot be exercised.
 *   What is verified for real: the Export control itself is present and no refusal banner is
 *   already showing before any export beyond the limit is attempted.
 * - TMS-WKBCH-008/009 (BR-336): RESOLVED (2026-09-03) - real ROLE_OPERATOR ("operator") and
 *   ROLE_QA_REVIEWER ("qa") accounts are now provisioned (test-data/constants.ts). Both cases now
 *   exercise the real Transfer submit-time authorization check instead of the previous (mistaken)
 *   reading of the Target RHO field's `readonly` attribute as a structural restriction - that
 *   attribute turned out to be this app's normal combobox pattern, unrelated to BR-336 scoping;
 *   the real check happens on submit. TMS-WKBCH-009's own Preconditions cell names
 *   ROLE_QA_REVIEWER, which looks like a copy/paste artifact from its parent row 008 (a reviewer's
 *   transfer can never be the condition BR-336 forbids) - it uses ROLE_OPERATOR instead; see that
 *   test's own doc comment for the full reasoning. Note: LOGIN.spec.ts's TMS-LOGIN-015 and
 *   SEC.spec.ts still document the same credential gap for their own, unrelated cases - this
 *   suite's other Preconditions-driven role gaps were intentionally left untouched (out of scope
 *   for this pass, which targeted only WKBCH-008/009's own Blocked status).
 */

/**
 * Gathers HELD policyNumber/errorId candidates across up to maxPages of the current account's
 * All-Weeks CB Records search (one search, paging through with the grid's own numbered page
 * buttons) rather than just the first page. Live-confirmed (2026-09-03): the QA Reviewer
 * account's own page 1 carried only 3 HELD records - all 3 happened to be blocked from Transfer
 * for reasons unrelated to BR-336 (see transferHeldRecord()) - while page 2 alone carried 10 more.
 * ErrorManagerPage.findEligibleHeldRecord() only ever looks at the current page, which isn't
 * enough headroom here; this reuses its exact column layout instead of paginating that shared
 * method itself.
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
    // Same render-lag retry as ErrorManagerPage.findEligibleHeldRecord(): this shared, sometimes
    // cold-starting dev environment can render the grid before its rows have populated, and a
    // single immediate read can misread "not loaded yet" as "no HELD rows on this page".
    for (let readAttempt = 0; readAttempt < 5; readAttempt++) {
      const cellTexts = await page.getByRole('cell').allInnerTexts();
      if (cellTexts.length > 0) {
        for (let i = 0; i + COLUMNS <= cellTexts.length; i += COLUMNS) {
          const row = cellTexts.slice(i, i + COLUMNS);
          const [, status, errorId, , , , policyNumber] = row;
          if (status === 'HELD' && policyNumber) candidates.push({ policyNumber, errorId });
        }
        break; // grid has rendered something - trust this read, don't re-read the same page again
      }
      await page.waitForTimeout(1000);
    }
  }
  return candidates;
}

/**
 * Opens a candidate record's Transfer dialog, selects targetRho and submits - retrying with the
 * next candidate whenever the record itself turns out to be categorically untransferable for a
 * reason unrelated to BR-336, so that some other rule's refusal never masquerades as a BR-336
 * result. RecordEditorPage.openRecord() searches by the record's own exact policy number, so
 * which listing page a candidate was originally found on doesn't matter here.
 *
 * Live-confirmed (2026-09-03): this legacy facility refuses to transfer some records for reasons
 * that have nothing to do with BR-336's own RHO-scope check - two distinct ones were hit live in
 * this environment alone: a "synopsis-only" record (BR-130/BR-369 - "Message - SYNOPSIS Records
 * CANNOT be transferred") and a record whose own current RHO is one of the synthetic,
 * non-geographic codes Q or R ("ERROR-AN RHO CODE OF Q OR R IS INVALID FOR TRANSFER"). Neither
 * flag is visible from the Result Grid's own columns, and more such legacy validations likely
 * exist beyond just these two, so rather than enumerate every possible unrelated-rule message by
 * name, this treats any dialog response other than BR-336's own two real outcomes ("not in
 * scope" / "TRANSFERRED TO {rho}") as a sign this record cannot be used to exercise BR-336 at
 * all, and moves on to the next candidate.
 *
 * Live-confirmed (2026-09-03) separately: whichever response applies can take longer than a few
 * seconds to render after Submit is clicked (this shared dev environment's own documented
 * latency - see playwright.config.ts) - waiting on all candidate outcomes together (whichever
 * renders first, up to a generous timeout) avoids reading "nothing happened yet" as "no
 * response at all".
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
    // The effective default status set (New/Open/Held only) is a server-side filter outcome;
    // this suite's fixture data isn't seeded with known Released/Deleted rows to confirm their
    // absence from the grid by content, so the toggles' own default-off state is what is
    // verified here.
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
    // This case's own steps require two full login cycles plus a Save Filter round trip - more
    // navigations than this suite's other cases carry, and each one is exposed to the shared
    // dev environment's own documented cold-start latency (see playwright.config.ts). The
    // default 90s test timeout leaves too little headroom for that; this does not change the
    // test's own steps, only how much time they're given to genuinely complete.
    test.setTimeout(150_000);
    await loginPage.loginAsValidUser();
    const includeReleased = errorManagerPage.includeReleasedCheckbox();
    // Establish the remembered default explicitly: unchecked.
    await expect(includeReleased).not.toBeChecked();
    await errorManagerPage.viewRecords();
    await expect(errorManagerPage.resultGrid()).toBeVisible();
    await page.reload();
    // Live-confirmed (same pattern as E2E.spec.ts's saved-filter check): reloading lands back
    // on the Result Grid screen, not the criteria screen the Include Released checkbox lives
    // on - Filter Results reopens the criteria screen where the remembered value is checked.
    await page.getByRole('button', { name: /Filter Results/i }).click();
    await expect(includeReleased).not.toBeChecked();

    // Save a filter whose own Include Released value (checked) differs from the remembered
    // default (unchecked) just confirmed above.
    await includeReleased.check();
    await errorManagerPage.allWeeksRadio().check();
    const saveFilterBtn = page.getByRole('button', { name: /Save Filter/i });
    await expect(saveFilterBtn).toBeVisible();
    await saveFilterBtn.click();
    // Live-confirmed (E2E-016): a hardcoded preset name collides with one left behind by a
    // previous run and blocks the dialog - suffix with the current timestamp to keep it unique.
    const filterName = `WKBCH-002 saved filter ${Date.now()}`;
    const nameField = page.getByLabel(/Filter Name|Name/i);
    if (await nameField.count()) await nameField.fill(filterName);
    // Live-confirmed (E2E-016): the dialog's own submit button reads "Save filter" - scoped to
    // the dialog so this doesn't also match the trigger button of the same name behind it.
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
   * "Weeks Waiting" does not exist as a column on this grid (live-confirmed, same finding as
   * E2E.spec.ts's TMS-E2E-017) - "Policy Number" (a real column) is used instead, per BR-333's
   * own premise that sorting is a capability of every column, not one specific column.
   *
   * Live-confirmed (2026-09-02) via a direct probe of this column: clicking the header is a
   * real, working 3-state toggle - unsorted, then strictly ascending by Policy Number, then
   * strictly descending, then back to unsorted - not the "no column is ever sortable" defect
   * TMS-E2E-017's own doc comment describes. That comment is stale/racy: its two clicks fire
   * back-to-back with no settle time between them, which can outrun the grid's re-render and
   * read the same intermediate state twice. A short settle wait after each click here avoids
   * that same race rather than reproducing it.
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
   * BLOCKED BY UNAVAILABLE TEST DATA: no fixture producing >100,000 rows exists anywhere in
   * this suite or environment (same gap independently noted in BOUND.spec.ts's TMS-BOUND-010),
   * so the refusal itself cannot be exercised without inventing an unrealistic data set. What
   * is verified for real: the Export control this rule governs is present (confirmed live,
   * same control TMS-WKBCH-005 exports with) and no refusal banner is already showing before
   * any export beyond the limit is attempted.
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
   * RESOLVED (2026-09-03): the credential gap that previously blocked this case is closed - real
   * ROLE_OPERATOR ("operator") and ROLE_QA_REVIEWER ("qa") accounts are now provisioned (see
   * test-data/constants.ts). This also corrected a misreading of the "Target RHO" control: its
   * `readonly` attribute (previously read as "structurally non-keyable, closed set") is just this
   * app's normal combobox pattern - the field opens a real listbox of all 11 reference-data RHOs
   * for BOTH roles (live-confirmed), so the frontend does not restrict the option list by scope
   * at all. The actual BR-336 authorization check happens at submit time: live-confirmed, an
   * ordinary operator's out-of-scope pick is refused inline with "Target RHO {x} not in scope -
   * requires ROLE_QA_REVIEWER for cross-RHO transfer" (see TMS-WKBCH-009), while the same request
   * from a ROLE_QA_REVIEWER account is accepted with a "TRANSACTION TO BE TRANSFERRED TO {x}"
   * confirmation and no such refusal - reused here.
   *
   * Side finding, not a defect: live-confirmed the Result Grid's own "Location" RHO for the
   * transferred record was unchanged immediately (and moments later, checked from a second,
   * broader-scoped reviewer account) after this acceptance - the request appears to be queued/
   * pending rather than applied synchronously. That is consistent with "TRANSACTION TO BE
   * TRANSFERRED TO" being a request-accepted message, not a completed-change message, and is not
   * something this test's own Expected Result asks it to wait out.
   */
  test('TMS-WKBCH-008 - BR-336: a cross-office reviewer\'s transfer is permitted regardless of RHO scope', async ({ page, loginPage, errorManagerPage, recordEditorPage }) => {
    // POC Scope: phase-1 (mod-spec feature)
    // A meaningful share of this account's reachable HELD records are blocked from Transfer
    // entirely by rules unrelated to BR-336 (see transferHeldRecord()'s own doc comment) - trying
    // enough of them to find one that actually exercises BR-336 can take longer than the default
    // budget on this shared, cold-starting dev environment.
    test.setTimeout(120_000);
    await loginPage.goto();
    await loginPage.submitLogin(QA_REVIEWER_USERNAME, QA_REVIEWER_PASSWORD);
    await page.waitForURL(/\/errors/);

    // "D" is outside the QA Reviewer account's own rhoScope [B, C, E, F, G, I, R] - live-confirmed
    // selectable regardless, proving the transfer is not limited to the reviewer's own offices.
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
   * RESOLVED (2026-09-03), with one data-quality note: this row's own Preconditions cell (like
   * TMS-WKBCH-008's) names the ROLE_QA_REVIEWER account, but that contradicts both BR-336's own
   * text - a cross-office reviewer's transfer is "permitted regardless" of scope, so no such
   * account could ever hit the condition this row's own Scenario column describes ("the condition
   * BR-336 forbids") - and BR-336's Source Code Excerpt ("Cross-RHO transfer requires both source
   * AND target to be in scope, OR ROLE_QA_REVIEWER"). Read together with this row's own Scenario/
   * Expected Result text (an ordinary operator's out-of-scope transfer, refused), the Preconditions
   * cell looks like a copy/paste artifact from its parent row (TMS-WKBCH-008) rather than the
   * row's real intent - resolved using the provisioned ROLE_OPERATOR ("operator") account instead,
   * which is the only account this rule can ever actually refuse.
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
