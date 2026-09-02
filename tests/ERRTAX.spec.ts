import { test, expect } from '../fixtures/pages.fixture';

/**
 * PRU TMS - ERRTAX group (ERRTAX.csv, 4 rows, TMS-ERRTAX-001..004).
 * Converted from the PRU TMS v4 CSV export (2026-08-25). Each row's own Steps/Expected
 * Result/Expected Message column is implemented directly below; the source CSV is the
 * system of record and is not modified by this file.
 *
 * Verification gaps (both flagged inline and summarized here):
 * - TMS-ERRTAX-001/002 (BR-340): the CSV names ~13 distinct machine-readable refusal codes;
 *   most require seeded backend conditions (terminal-state records, pending-transfer records,
 *   etc.) this suite doesn't have. NO_FILTERS_SET and NO_ROWS_SELECTED were the two candidates
 *   reproducible purely through this UI, but confirmed live neither actually reaches a
 *   post-submit refusal: the search screen always carries a week-cycle scope (Current Week is
 *   checked by default and "Clear Filters" does not uncheck it, so an unscoped search can
 *   never be submitted), and the Result Grid's bulk-action buttons (Resolve/Assign/Delete)
 *   render only once a row is selected, so a zero-row bulk action has no button to click in
 *   the first place. Both preconditions are enforced by omission - the UI never lets the
 *   forbidden request be submitted - rather than by a named-rule refusal after submission, so
 *   what's verified below is that structural prevention, not the NO_FILTERS_SET /
 *   NO_ROWS_SELECTED response text.
 * - TMS-ERRTAX-003/004 (BR-341): this suite has no seeded record with a positive pending-
 *   corrections count, so the exact CANNOT_DELETE_WITH_PENDING_CORRECTIONS message/response
 *   is not directly triggered. What IS verified is the structural precondition the rule
 *   describes: while an edit is unsaved, the record's Actions/Delete surface is not reachable
 *   at all, and the record is fully unchanged and Delete-reachable again once that edit is
 *   discarded.
 */
test.describe('ERRTAX - Modernized Error Taxonomy', () => {
  test('TMS-ERRTAX-001 - BR-340: every write refused for a named business reason carries back a distinct, machine-readable rule name alongside its message', async ({ loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    await errorManagerPage.selectSearchTab('CB Records');

    // NO_FILTERS_SET's precondition (no filters and no week-cycle scope) can never arise:
    // Current Week is checked by default and Clear Filters does not uncheck it.
    await expect(errorManagerPage.currentWeekRadio()).toBeChecked();
    await errorManagerPage.clearFiltersButton().click();
    await expect(errorManagerPage.currentWeekRadio()).toBeChecked();

    // NO_ROWS_SELECTED's precondition (a bulk action with no rows selected) can also never
    // arise: Resolve/Assign/Delete are not rendered until a row is selected, then they are.
    await errorManagerPage.allWeeksRadio().check();
    await errorManagerPage.viewRecords();
    await expect(errorManagerPage.bulkActionButtons()).toHaveCount(0);
    await errorManagerPage.resultGrid().getByRole('checkbox').nth(1).check();
    await expect(errorManagerPage.bulkActionButtons().first()).toBeVisible();
  });

  test('TMS-ERRTAX-002 - BR-340 (negative): a forbidden write is refused and nothing is committed', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    await errorManagerPage.selectSearchTab('CB Records');

    // Attempt condition (a): submit with every filter cleared. The scope still defaults to
    // Current Week, so this is refused nothing to submit - the operator stays on the same
    // search screen and no rows are committed/displayed.
    await errorManagerPage.clearFiltersButton().click();
    await errorManagerPage.viewRecords();
    await expect(page).toHaveURL(/\/errors/);
    await expect(page.getByText(/current week/i)).toBeVisible();
    await expect(errorManagerPage.resultGrid().getByRole('row')).toHaveCount(0);

    // Attempt condition (b): with records loaded and nothing selected, there is no bulk
    // action control reachable to submit a zero-row request with. Submitting a search
    // replaces the criteria controls with the Result Grid, so they must be reopened first.
    await errorManagerPage.filterResultsButton().click();
    await errorManagerPage.allWeeksRadio().check();
    await errorManagerPage.viewRecords();
    await expect(errorManagerPage.bulkActionButtons()).toHaveCount(0);
  });

  test('TMS-ERRTAX-003 - BR-341: a record carrying any correction the operator has not yet saved or discarded cannot be deleted', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickEdit();

    const firstField = recordEditorPage.firstTextbox();
    const original = await firstField.inputValue();
    await firstField.fill(`${original} `);

    // With an unsaved correction pending, the edit-mode header replaces Actions/Delete with
    // Cancel/Save Changes/Submit, so Delete is not reachable at all until the correction is
    // saved or discarded - the structural consequence of BR-341.
    await expect(recordEditorPage.saveChangesButton()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Actions$/i })).toHaveCount(0);
  });

  test('TMS-ERRTAX-004 - BR-341 (negative): a delete attempted against a record with pending corrections is refused and the record is left exactly as it was', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    const recordUrl = page.url();
    await recordEditorPage.clickEdit();

    const firstField = recordEditorPage.firstTextbox();
    const original = await firstField.inputValue();
    await firstField.fill(`${original}X`);

    // Attempt the forbidden condition: with the correction still pending, Delete must not be
    // reachable at all.
    await expect(page.getByRole('button', { name: /^Actions$/i })).toHaveCount(0);

    // Discard the pending correction instead of saving it.
    await recordEditorPage.cancelDialog();

    // The record is left exactly as it was: value reverted (read via the read-only view's
    // label/value pair, since exiting edit mode swaps the field back from an input to plain
    // text), same URL, and Delete reachable again now that no correction is pending.
    await expect(recordEditorPage.viewFieldValue('Policy Number')).toHaveText(original);
    await expect(page).toHaveURL(recordUrl);
    await expect(page.getByRole('button', { name: /^Actions$/i })).toBeVisible();
  });
});
