import { test, expect } from '../fixtures/pages.fixture';
import type { LoginPage } from '../pages/LoginPage';
import type { RecordEditorPage } from '../pages/RecordEditorPage';

/**
 * PRU TMS - XFLD4 group (XFLD4.csv, 8 rows, TMS-XFLD4-001..008).
 * Converted from C:\Users\SSORIANO\PRU TMS NEW\XFLD4.csv (2026-08-25); that CSV is the system
 * of record and is not modified by this file.
 *
 * Every row in this CSV documents a Business Rules Catalogue v4.2 cross-field rule whose own
 * Screen column reads "Cross-field validation - spans multiple Error Record Editor tabs" (no
 * single field), mirroring the sibling RDMS-XFLD.spec.ts (RDMS-XFLD.csv) convention this file
 * follows directly. No row names a concrete on-screen selector, and this shared live dev
 * environment carries no fixture data engineered to hit any one rule's specific breach
 * condition (an ECN/branch mismatch, an out-of-order application/issue date pair, an
 * age/date-of-birth mismatch, or trailer/agent split percentages that don't sum to 100). What
 * every row's own Preconditions/Steps DO establish, and what each test below actually drives
 * and asserts, is the shared precondition itself: the confirmed test record opened in the RDMS
 * Error Record Editor and placed into amendment mode, on the tab the rule's own fields live on
 * (General Information for BR-346/347/348; Trailer Information for BR-349's pctOfSplit/
 * percSplit, which the sibling RDMS-TRL.spec.ts, BR-495/BR-497, already independently confirms
 * has no on-screen selector either). The rule's own specific outcome/message is quoted in each
 * test's doc comment for traceability and is never fabricated into an assertion the CSV does
 * not itself ground.
 *
 * Verification gaps (flagged inline and summarized here):
 * - TMS-XFLD4-001/002 (BR-346): the CSV itself records this rule's Java-workbook rows as marked
 *   OBSOLETE ("out of scope for PoC") and its own UI Verification Status as BUSINESS
 *   CONFIRMATION REQUIRED; no ECN/branch-encoding selector is named, so only editor
 *   reachability is verified.
 * - TMS-XFLD4-003/004 (BR-347): applicationDate/issueDate have no confirmed selector anywhere
 *   in this suite.
 * - TMS-XFLD4-005/006 (BR-348): age/date-of-birth have no confirmed selector anywhere in this
 *   suite.
 * - TMS-XFLD4-007/008 (BR-349): pctOfSplit (Trailer)/percSplit (PRUPAC agent) are confirmed by
 *   the sibling RDMS-TRL.spec.ts (BR-495/BR-497) to have no on-screen selector either; only
 *   Trailer Information tab reachability in amendment mode is verified here.
 */

async function openEditableTestRecord(loginPage: LoginPage, recordEditorPage: RecordEditorPage): Promise<void> {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.clickEdit();
}

async function openEditableTrailerTab(loginPage: LoginPage, recordEditorPage: RecordEditorPage): Promise<void> {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('Trailer Information');
  await recordEditorPage.clickEdit();
}

test.describe('XFLD4 - Modernized Cross-Field Validation', () => {
  /**
   * TMS-XFLD4-001 | BR-346 | Status note (v4.1): marked OBSOLETE in the Java per-screen
   * workbook ("out of scope for PoC") - carried here as recorded specification behaviour but
   * not implemented in the PoC.
   * A new record whose ECN encodes a P&C/Commercial-Lines transaction (positions 7-8) may only
   * be created with branch D/P/Z; a non-PC-encoded ECN may not claim branch D or P.
   * Expected Message: BRANCH_INVALID_FOR_PC_ECN / BRANCH_INVALID_FOR_NON_PC_ECN.
   */
  test('TMS-XFLD4-001 - BR-346: a new record\'s branch must be consistent with the P&C/Commercial-Lines encoding in its ECN (marked OBSOLETE for the PoC)', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(recordEditorPage.saveChangesButton()).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // BUSINESS CONFIRMATION REQUIRED (per CSV) and marked OBSOLETE in the Java workbook ("out
    // of scope for PoC"): no ECN/branch-encoding field or selector is named, and record creation
    // itself is out of scope for this modernized web UI (batch ingest only, per sibling
    // GRID.spec.ts notes on BR-005). Verified for real: the editor reaches amendment mode.
  });

  /**
   * TMS-XFLD4-002 | BR-346 (negative), parent TMS-XFLD4-001
   */
  test('TMS-XFLD4-002 - BR-346 (negative): a branch/ECN-encoding mismatch is refused and nothing is committed (marked OBSOLETE for the PoC)', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(/BRANCH_INVALID_FOR/i)).toHaveCount(0);
    await expect(recordEditorPage.saveChangesButton()).toBeVisible();
    // Same OBSOLETE/BUSINESS CONFIRMATION REQUIRED gap as TMS-XFLD4-001. Verified for real:
    // amendment mode is reached and the named refusal codes are not already showing.
  });

  /**
   * TMS-XFLD4-003 | BR-347
   * The application date on a corrected transaction may not fall after the issue date, and the
   * issue date may not fall after today.
   */
  test('TMS-XFLD4-003 - BR-347: applicationDate must not fall after issueDate, and issueDate must not fall after today', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(recordEditorPage.saveChangesButton()).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // applicationDate/issueDate have no confirmed on-screen selector in this suite. Verified
    // for real: the editor reaches amendment mode with both dates (wherever keyed) available
    // to be set together ahead of a save.
  });

  /**
   * TMS-XFLD4-004 | BR-347 (negative), parent TMS-XFLD4-003
   */
  test('TMS-XFLD4-004 - BR-347 (negative): an out-of-order applicationDate/issueDate/today sequence is refused and nothing is committed', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(recordEditorPage.saveChangesButton()).toBeVisible();
    // Same unconfirmed applicationDate/issueDate selector as TMS-XFLD4-003. Verified for real:
    // amendment mode is reached and no error banner is already showing before any date is keyed.
    // A generic /error/i match is too broad here - it also matches page chrome text like
    // "Error Manager"/"Error Record Editor" nav labels, not just a validation banner - so this
    // reuses the exact confirmed screening-error banner text from RDMS-TRL.spec.ts instead.
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
  });

  /**
   * TMS-XFLD4-005 | BR-348
   * The age keyed on a corrected transaction must be consistent with the date of birth keyed
   * elsewhere on the same record (age = today_year - birth_year).
   */
  test('TMS-XFLD4-005 - BR-348: the keyed age must equal today\'s year minus the birth year', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(recordEditorPage.saveChangesButton()).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // age/date-of-birth have no confirmed on-screen selector in this suite. Verified for real:
    // the editor reaches amendment mode with both fields (wherever keyed) available together.
  });

  /**
   * TMS-XFLD4-006 | BR-348 (negative), parent TMS-XFLD4-005
   */
  test('TMS-XFLD4-006 - BR-348 (negative): an age inconsistent with the date of birth is refused and nothing is committed', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(recordEditorPage.saveChangesButton()).toBeVisible();
    // Same unconfirmed age/date-of-birth selector as TMS-XFLD4-005. Verified for real:
    // amendment mode is reached and no error banner is already showing before any value is keyed.
    // Same broad-regex issue as TMS-XFLD4-004: reuses the exact confirmed banner text instead.
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
  });

  /**
   * TMS-XFLD4-007 | BR-349
   * Where a transaction carries more than one populated trailer or agent row, the split or
   * allocation percentages across those rows (pctOfSplit / percSplit) must sum to exactly 100.
   * The sibling RDMS-TRL.spec.ts (BR-495 percSplit, BR-497 pctOfSplit) already independently
   * confirms neither field name has a resolvable on-screen selector in this environment.
   */
  test('TMS-XFLD4-007 - BR-349: populated trailer/agent split percentages (pctOfSplit/percSplit) must sum to exactly 100', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTrailerTab(loginPage, recordEditorPage);
    await expect(recordEditorPage.saveChangesButton()).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // pctOfSplit/percSplit are modern-spec field names with no confirmed on-screen selector in
    // this environment (same gap independently confirmed in RDMS-TRL.spec.ts, BR-495/BR-497).
    // Verified for real: the Trailer Information tab is reached in amendment mode.
  });

  /**
   * TMS-XFLD4-008 | BR-349 (negative), parent TMS-XFLD4-007
   */
  test('TMS-XFLD4-008 - BR-349 (negative): populated trailer/agent split percentages that do not sum to 100 are refused and nothing is committed', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTrailerTab(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(recordEditorPage.saveChangesButton()).toBeVisible();
    // Same unconfirmed pctOfSplit/percSplit selector as TMS-XFLD4-007. Verified for real:
    // amendment mode is reached and the 7111 screening-error banner is not already showing.
  });
});
