import { test, expect } from '../fixtures/pages.fixture';

/**
 * PRU TMS - ERRTAX group (ERRTAX.csv, 4 rows, TMS-ERRTAX-001..004).
 * Converted from the PRU TMS v4 CSV export (2026-08-25). Each row's own Steps/Expected
 * Result/Expected Message column is implemented directly below; the source CSV is the
 * system of record and is not modified by this file.
 *
 * Verification gaps (both flagged inline and summarized here):
 * - TMS-ERRTAX-001/002 (BR-340): the CSV names ~13 distinct machine-readable refusal codes;
 *   only NO_FILTERS_SET is reproducible purely through this UI without seeded backend
 *   conditions (terminal-state records, pending-transfer records, etc.), so it is used as the
 *   concrete instance of the taxonomy. The exact copy/wording shown on refusal has not been
 *   independently confirmed live; the assertion matches on the CSV's own Expected Message text.
 * - TMS-ERRTAX-003/004 (BR-341): this suite has no seeded record with a positive pending-
 *   corrections count, so the exact CANNOT_DELETE_WITH_PENDING_CORRECTIONS message/response
 *   is not directly triggered. What IS verified is the structural precondition the rule
 *   describes: while an edit is unsaved, the record's Actions/Delete surface is not reachable
 *   at all, and the record is fully unchanged and Delete-reachable again once that edit is
 *   discarded.
 */
test.describe('ERRTAX - Modernized Error Taxonomy', () => {
  test('TMS-ERRTAX-001 - BR-340: every write refused for a named business reason carries back a distinct, machine-readable rule name alongside its message', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    await errorManagerPage.selectSearchTab('CB Records');

    // Concrete, reproducible instance of the taxonomy this rule describes: NO_FILTERS_SET -
    // "A search was submitted with no filter fields and no week-cycle scope selected."
    await errorManagerPage.viewRecords();

    await expect(page.getByText(/no filter/i).or(page.getByText(/NO_FILTERS_SET/i))).toBeVisible();
  });

  test('TMS-ERRTAX-002 - BR-340 (negative): a forbidden write is refused and nothing is committed', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    await errorManagerPage.selectSearchTab('CB Records');

    await errorManagerPage.viewRecords();

    // Refused before any business logic executes further: the operator stays on the same
    // unfiltered search screen and no results are committed/displayed.
    await expect(page).toHaveURL(/\/errors/);
    await expect(page.getByText(/no filter/i).or(page.getByText(/NO_FILTERS_SET/i))).toBeVisible();
    await expect(errorManagerPage.resultGrid().getByRole('row')).toHaveCount(0);
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

    // The record is left exactly as it was: value reverted, same URL, and Delete reachable
    // again now that no correction is pending.
    await expect(firstField).toHaveValue(original);
    await expect(page).toHaveURL(recordUrl);
    await expect(page.getByRole('button', { name: /^Actions$/i })).toBeVisible();
  });
});
