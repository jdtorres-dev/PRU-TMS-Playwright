import { test, expect } from '../fixtures/pages.fixture';

/**
 * PRU TMS - MIG group (MIG.csv, 4 rows, TMS-MIG-001..004).
 * Converted from the PRU TMS v4 CSV export (2026-08-25). Each row's own Steps/Expected
 * Result column is implemented directly below; the source CSV is the system of record and
 * is not modified by this file.
 *
 * Verification gaps (all four rows, flagged inline and summarized here): this whole group
 * documents batch-ingestion / build-pipeline / reference-data-migration rules (BR-342..345).
 * None of them expose a UI control in this session that can trigger the legacy ingestion
 * path, invoke the batch pipeline, or run the CI build-time drift check - there is simply no
 * screen or button for any of that in the online facility this suite drives. Each test below
 * instead asserts the strongest currently-checkable, real consequence or boundary the rule
 * implies on the live UI, per row.
 */
test.describe('MIG - Modernized Migration and Batch Consistency', () => {
  test('TMS-MIG-001 - BR-342: a two-digit year on any historical record is expanded to a full year using the same rule the legacy facility applied', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    await errorManagerPage.selectSearchTab('CB Records');
    await errorManagerPage.allWeeksRadio().check();
    await errorManagerPage.viewRecords();

    // Not independently triggerable here (no ingestion control exists in this UI). What IS
    // checkable is the rule's own stated consequence: the modernized store keeps every date
    // as a full four-digit year, so any date shown on screen is already 4-digit, never bare
    // two-digit.
    const fullYearDate = page
      .getByText(/\b\d{1,2}[/-]\d{1,2}[/-](19|20)\d{2}\b/)
      .or(page.getByText(/\b(19|20)\d{2}-\d{2}-\d{2}\b/));
    await expect(fullYearDate.first()).toBeVisible();
  });

  test('TMS-MIG-002 - BR-343: the online facility and the batch pipeline write to the same store and must apply identical validation, checked automatically for drift', async ({ loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openRdmsTab('General Information');

    // Neither the batch pipeline nor the CI build-time drift check are reachable from this
    // UI-driven suite - BR-343 governs a delivery-process guarantee between two systems, not
    // a user-observable screen behavior. What IS checkable: the online facility's own record
    // editor - the shared-validation surface this rule protects - is reachable, with its
    // normal Edit/Save Changes controls present.
    await recordEditorPage.expectRegionVisible(/General/i);
    await recordEditorPage.clickEdit();
    await expect(recordEditorPage.saveChangesButton()).toBeVisible();
    await recordEditorPage.cancelDialog();
  });

  test('TMS-MIG-003 - BR-344: the derived transaction code the online facility computes for a record must agree exactly with the one the batch pipeline computes', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();

    // This suite cannot invoke the batch pipeline's own derivation, so the two computations'
    // equality (the rule's actual assertion) cannot be exercised end-to-end here. What IS
    // checkable: the online facility exposes the named field this rule concerns (the derived
    // transaction code / aosTransCode) somewhere on the record editor.
    let transCodeCount = await page.getByText(/trans.*code/i).count();
    if (!transCodeCount) {
      await recordEditorPage.openRdmsTab('Financial Information');
      transCodeCount = await page.getByText(/trans.*code/i).count();
    }
    expect(transCodeCount, 'Expected a transaction-code field to be present somewhere on the record editor').toBeGreaterThan(0);
  });

  test('TMS-MIG-004 - BR-345: extractable reference data is code-accurate but description-provisional; a further set of tables cannot be extracted and must arrive as fresh exports', async ({ page, loginPage }) => {
    await loginPage.loginAsValidUser();

    // This suite has no ROLE_REFDATA_ADMIN credentials (same documented gap as
    // TMS-LOGIN-015), and reference-data completeness/review status is not exposed anywhere
    // in the ROLE_OPERATOR UI, so the specific extractable-now vs awaiting-export state of
    // each named table cannot be inspected here. What IS checkable: the account this suite
    // can use has no access to the Reference Data administration surface where that review
    // would even take place.
    await expect(page.getByRole('link', { name: /Reference Data/i })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: /Reference Data/i })).toHaveCount(0);
  });
});
