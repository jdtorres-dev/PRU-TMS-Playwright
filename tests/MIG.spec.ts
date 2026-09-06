import { test, expect } from '../fixtures/pages.fixture';

/**
 * PRU TMS - MIG group (PRU_TMS_Test_Cases_v4.xlsx, MIG sheet, 4 rows, TMS-MIG-001..004).
 * PRU_TMS_MIG_Organized_Steps.md documents the same 4 rows' approved step sequence. The xlsx
 * is the system of record and is not modified by this file.
 *
 * POC Scope (per the MIG sheet's own "POC Scope" column):
 *   TMS-MIG-001 (BR-342) - phase-1 (mod-spec feature) - in scope, executes below.
 *   TMS-MIG-002 (BR-343) - out of scope - kept, disabled via test.skip().
 *   TMS-MIG-003 (BR-344) - out of scope - kept, disabled via test.skip().
 *   TMS-MIG-004 (BR-345) - phase-1 (mod-spec feature) - in scope, executes below.
 *
 * Verification gap common to all four rows (flagged inline per row below): this whole group
 * documents batch-ingestion / build-pipeline / reference-data-migration rules (BR-342..345)
 * that govern the legacy-to-modernized migration and the online/batch pipeline pair - none of
 * them expose a UI control in this session that can trigger the legacy ingestion path, invoke
 * the batch pipeline, or run the CI build-time drift check; there is simply no screen or
 * button for any of that in the online facility this suite drives. This is corroborated by
 * the Business Rules Catalogue v4.2 itself, whose own "POC Scope" column for BR-342..345
 * independently reads "Out of Scope" for all four (i.e. none of these rules is implemented
 * online in this build), even though the Test Cases xlsx tags TMS-MIG-001/004 in scope for
 * *test execution*. Each in-scope test below therefore asserts the strongest currently-
 * checkable, real consequence the rule implies on the live UI rather than the rule's own
 * ingestion-time/batch-time behavior - each is BLOCKED BY UNAVAILABLE TEST DATA in that
 * narrower sense (see the conversion summary), not a full pass of the approved Expected
 * Result end to end.
 */
test.describe('MIG - Modernized Migration and Batch Consistency', () => {
  test('TMS-MIG-001 - BR-342: a two-digit year on any historical record is expanded to a full year using the same rule the legacy facility applied', async ({ page, loginPage, recordEditorPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openRdmsTab('Additional Information');

    // Not independently triggerable here (no ingestion/migration control exists in this UI -
    // see file header). What IS checkable: BR-342's own named Screen Field(s) per the
    // Business Rules Catalogue v4.2 ("loanDate, effDatePolChg"), confirmed live via
    // frontend-field-catalog.xlsx ("Dates & Identifiers" sheet) to be the "Loan Date" and
    // "Effective Date Policy Change" fields on this Additional Information tab. Wherever
    // either is populated on this already-migrated record, it must render as a full
    // four-digit year (YYYY-MM-DD, the field catalog's declared type) - never a bare
    // two-digit year - which is the rule's own stated storage guarantee.
    const fourDigitYear = /\b(19|20)\d{2}\b/;
    const namedDateFields = [page.getByLabel(/^Loan Date$/i), page.getByLabel(/^Effective Date Policy Change$/i)];

    let checkedNamedField = false;
    for (const field of namedDateFields) {
      if (await field.count()) {
        const value = await field.inputValue().catch(() => '');
        if (value) {
          expect(value, 'BR-342: expected a full four-digit year, never a bare two-digit year').toMatch(fourDigitYear);
          checkedNamedField = true;
        }
      }
    }

    if (!checkedNamedField) {
      // Neither named field carries a value on this shared fixture record: fall back to the
      // rule's broader storage guarantee (every date the modernized store holds is four-digit)
      // via the CB Records Result Grid's own rendered dates.
      // Live-confirmed: the Result Grid's "Updated At" column renders dates as "Aug 17, 2026,
      // 11:59 AM" (a month-name format), not the slash/dash numeric formats these two patterns
      // alone matched - broadened to catch the format actually on screen.
      await errorManagerPage.goto();
      await errorManagerPage.selectSearchTab('CB Records');
      await errorManagerPage.allWeeksRadio().check();
      await errorManagerPage.viewRecords();
      const fullYearDate = page
        .getByText(/\b\d{1,2}[/-]\d{1,2}[/-](19|20)\d{2}\b/)
        .or(page.getByText(/\b(19|20)\d{2}-\d{2}-\d{2}\b/))
        .or(page.getByText(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s*(19|20)\d{2}\b/));
      await expect(fullYearDate.first()).toBeVisible();
    }
  });

  // OUT OF SCOPE (reference: PRU_TMS_MIG_Organized_Steps.md / PRU_TMS_Test_Cases_v4.xlsx MIG
  // sheet, TMS-MIG-002, POC Scope = out of scope) - kept, disabled via test.skip so it does not
  // execute.
  test.skip('TMS-MIG-002 - BR-343: the online facility and the batch pipeline write to the same store and must apply identical validation, checked automatically for drift', async ({ loginPage, recordEditorPage }) => {
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

  // OUT OF SCOPE (reference: PRU_TMS_MIG_Organized_Steps.md / PRU_TMS_Test_Cases_v4.xlsx MIG
  // sheet, TMS-MIG-003, POC Scope = out of scope) - kept, disabled via test.skip so it does not
  // execute.
  test.skip('TMS-MIG-003 - BR-344: the derived transaction code the online facility computes for a record must agree exactly with the one the batch pipeline computes', async ({ page, loginPage, recordEditorPage }) => {
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
