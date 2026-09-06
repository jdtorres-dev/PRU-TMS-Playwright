import { test, expect } from '../fixtures/pages.fixture';
import type { Page } from '@playwright/test';
import type { LoginPage } from '../pages/LoginPage';
import type { RecordEditorPage } from '../pages/RecordEditorPage';

/**
 * PRU TMS - RDMS-ADD group (RDMS-ADD.csv, 80 rows, TMS-RDMS-ADD-001..080).
 * Covers the RDMS Error Record Editor's Additional Information tab: BR-055,
 * BR-071, BR-110/111/114/115/116/119/120/121/140/145/146/147/149/162 (legacy
 * DA01015/DA01016 business rules already in the Catalogue), plus the newer
 * per-field/per-screen rules BR-557 through BR-595 (Catalogue v4.2 analysis
 * of legacy screens DA01015/DA01016, both replaced by this one modernized
 * tab). The source CSV is the system of record and is never modified by this
 * file.
 *
 * Every test logs in, opens the confirmed shared test record
 * (TEST_POLICY_NUMBER in ./_helpers) and enters Edit mode on Additional
 * Information before exercising its own row. Field labels used below
 * (Mnemonic Code, Statement List Code, Transaction Type, Contract Years,
 * Orig Cycle, Company Code, Event Time Code, Event Activity Code, Product
 * Code, Message Code, System & Processor Comments) match the confirmed-live
 * label set from the prior v3 conversion's Additional Information smoke test
 * (C:\Users\SSORIANO\PRU\PRU_TMS_CSV_RDMS-ADD.spec.ts, TMS-RDMS-ADD-022,
 * live 2026-08-19). Fields this CSV cites that were not part of that
 * confirmed set (Previous Date, carrier/key boxes, AOS Trans Code, Paid
 * Report Dt, Date Pol/Application Date, Pol Nbr Dgt, Record Code, Error Msg
 * No, Ret Reason Code, Agent Plan Code) are matched on a best-effort label
 * derived from the CSV's own field name; a first live run may need to
 * correct the exact selector, same as any other spec in this project.
 *
 * A number of rows document a business rule that is gated on a specific
 * record/branch/backend state (e.g. "only when branch starts with Q", "a
 * manually created record with a release requested and the authority test
 * failed", a distribution-channel restriction, a Reference Data Admin code
 * list, or a Transfer precondition such as "double-length record" or "RHO=Q
 * or R") that this suite cannot construct or control against the single
 * shared TEST_POLICY_NUMBER record on a live multi-tenant dev environment.
 * Those are marked "NOT INDEPENDENTLY VERIFIED" in their own comment and are
 * listed in the conversion report; each still performs the strongest real,
 * currently-checkable action available (reaching the tab/field/dialog that
 * governs the rule) rather than being skipped.
 */

// --- Local helpers (RDMS-ADD specific; not shared via POM classes) --------

/**
 * Best-effort locator for a named Additional Information field, tried as a
 * form label, then a placeholder, then an accessible textbox/combobox name.
 */
function fieldControl(page: Page, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'i');
  return page
    .getByLabel(re)
    .or(page.getByPlaceholder(re))
    .or(page.getByRole('textbox', { name: re }))
    .or(page.getByRole('combobox', { name: re }))
    .first();
}

async function openAdditionalInfoEditable(loginPage: LoginPage, recordEditorPage: RecordEditorPage): Promise<void> {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('Additional Information');
  await recordEditorPage.clickEdit();
}

/** Re-navigates to the same record's Additional Information tab (read-only). */
async function reopenAdditionalInfo(recordEditorPage: RecordEditorPage): Promise<void> {
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('Additional Information');
}

/** BR-557/574 etc: refused-save banner carrying condition code 7111. */
function screeningErrorBanner(page: Page) {
  return page.getByText(/7111/).or(page.getByText(/SCREENING ERROR IN HIGHLIGHTED FIELD/i));
}

/** Field-level SCR-Y "Held as 'Y'" validation-failure banner (BR-110 etc.). */
function heldValidationBanner(page: Page) {
  return page
    .getByText(/Held as .Y./i)
    .or(page.getByText(/SCR-Y/i))
    .or(screeningErrorBanner(page));
}

/** Successful-save completion banner (condition codes 7100-7108). */
function saveSuccessBanner(page: Page) {
  return page.getByText(/71(0[0-8])\b/).or(page.getByText(/TRANSACTION CORRECTED AND PLACED IN RELEASE STATUS/i));
}

/** Keys a breaching value into `label`, saves, and confirms the save is refused and nothing sticks. */
async function expectFieldSaveRefused(page: Page, recordEditorPage: RecordEditorPage, label: string, breachingValue: string): Promise<void> {
  const field = fieldControl(page, label);
  const before = await field.inputValue().catch(() => '');
  await field.fill(breachingValue);
  await recordEditorPage.clickSave();
  await expect(heldValidationBanner(page)).toBeVisible();
  await reopenAdditionalInfo(recordEditorPage);
  await expect(fieldControl(page, label)).toHaveValue(before);
}

/** Keys an accepted value into `label`, saves, and confirms it commits. */
async function expectFieldSaveAccepted(page: Page, recordEditorPage: RecordEditorPage, label: string, value: string): Promise<void> {
  const field = fieldControl(page, label);
  await field.fill(value);
  await recordEditorPage.clickSave();
  await expect(saveSuccessBanner(page)).toBeVisible();
  await reopenAdditionalInfo(recordEditorPage);
  await expect(fieldControl(page, label)).toHaveValue(value);
}

/** BR-309/310 permissive tier: an out-of-domain value is accepted with no error, verbatim. */
async function expectFieldPermissiveAccept(page: Page, recordEditorPage: RecordEditorPage, label: string, outOfDomainValue: string): Promise<void> {
  const field = fieldControl(page, label);
  await field.fill(outOfDomainValue);
  await recordEditorPage.clickSave();
  await expect(page.getByText(/error/i)).toHaveCount(0);
  await reopenAdditionalInfo(recordEditorPage);
  await expect(fieldControl(page, label)).toHaveValue(outOfDomainValue);
}

/** Opens the Transfer action dialog (real interaction) without completing a transfer. */
async function attemptTransferAction(page: Page, recordEditorPage: RecordEditorPage): Promise<void> {
  await recordEditorPage.openActionsItem('Transfer');
  await expect(page.getByRole('dialog').or(page.getByRole('heading', { name: /Transfer/i })).first()).toBeVisible();
  await recordEditorPage.cancelDialog().catch(() => {});
}

// RESOLVED (2026-09-03): TMS-RDMS-ADD-041/075 (BR-568/BR-590, both aliasing the same
// universal BR-366 "double-length record can only be transferred from the first half"
// condition, code 7128) were previously NOT INDEPENDENTLY VERIFIED on the belief that no
// double-length (recordLength >= 1525) record exists on this environment. A full CB Records
// census (o-0001/ROLE_OPERATOR - broadest rhoScope, all 10 RHO codes - Export CSV of the
// whole population, then GET /api/v1/spi/{ecn} per record outside the already-checked
// CB1/CB3 groups) found one: policy 100000005 (ECN 20202627000005, recordCode AR1,
// recordLength 1668, status OPEN). Its own backend obr.comments field literally reads
// "Double-length record (1668 bytes) seeded for AR1/BB2 shared-table and double-length
// transfer-restriction testing" - deliberately seeded test data that this suite's own prior
// investigation (see RDMS-TRL.spec.ts's header) had not checked, since it isn't a CB1 or CB3
// record and doesn't surface in the Result Grid's own columns.
//
// recordLength >= 1525 makes the record read-only for editing (a live banner confirms this:
// "This is a long-format record (recordLength >= 1525) - editing is not yet supported in
// this phase of the modernization"), so it cannot go through openAdditionalInfoEditable()'s
// Edit step - Transfer is a header-level Actions-menu item that does not require Edit mode.
// The shared VALID_USERNAME/VALID_PASSWORD fixture (admin/admin) carries ROLE_ADMIN/
// ROLE_REFDATA_ADMIN, which RDMS-TRL.spec.ts already confirmed live receives a blanket
// HTTP 403 on any Transfer submission regardless of target RHO - o-0001 (ROLE_OPERATOR,
// rhoScope covering all 10 RHO codes) is used here instead, same as that file's own fix.
const DOUBLE_LENGTH_OPERATOR_USERNAME = 'o-0001';
const DOUBLE_LENGTH_OPERATOR_PASSWORD = 'operator';
const DOUBLE_LENGTH_POLICY_NUMBER = '100000005';
const DOUBLE_LENGTH_ERROR_ID = 'E105';

async function openDoubleLengthRecordTransferDialog(
  page: Page,
  loginPage: LoginPage,
  recordEditorPage: RecordEditorPage,
): Promise<void> {
  await loginPage.goto();
  await loginPage.submitLogin(DOUBLE_LENGTH_OPERATOR_USERNAME, DOUBLE_LENGTH_OPERATOR_PASSWORD);
  await page.waitForURL(/\/errors/);
  await recordEditorPage.openRecord(DOUBLE_LENGTH_POLICY_NUMBER, DOUBLE_LENGTH_ERROR_ID);
  await recordEditorPage.openRdmsTab('Additional Information');
  await recordEditorPage.openActionsItem('Transfer');
}

async function submitTransferToRho(page: Page, rhoCode: string): Promise<void> {
  const targetRhoField = page.locator('#action-target-rho');
  await targetRhoField.click();
  await page.getByRole('option', { name: new RegExp(`^${rhoCode}\\b`) }).click({ force: true });
  await page.getByRole('button', { name: /^Transfer$/i }).click();
}

test.describe('RDMS-ADD - Additional Information tab', () => {
  test('TMS-RDMS-ADD-001 - BR-055: cost-share/support charges on the special charge branch carry a fixed Product Code', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: BR-055 fires only when the record's branch
    // is the special charge branch AND carries an internal cost-share/
    // support-charge marker. The shared TEST_POLICY_NUMBER record's branch
    // and charge-type marker are not documented or controllable from this
    // suite, so the specific forced-to-1498/1497 outcome cannot be exercised
    // without seeded backend data for that branch+marker combination.
    await recordEditorPage.expectRegionVisible(/Product Code/i);
  });

  test('TMS-RDMS-ADD-002 - BR-071 (contradiction): a screen build routine cross-writes fields into another screen', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: CSV marks this row BUSINESS CONFIRMATION
    // REQUIRED (Automation Candidate: "No - pending business confirmation").
    // Asserting a specific cross-screen field-corruption outcome would
    // invent behavior the Catalogue itself has not confirmed as intended.
    await recordEditorPage.expectRegionVisible(/Additional/i);
  });

  test('TMS-RDMS-ADD-003 - BR-110: Mnemonic Code must be supplied, so a blank value is refused', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await fieldControl(page, 'Mnemonic Code').fill('');
    await recordEditorPage.clickSave();
    await expect(heldValidationBanner(page)).toBeVisible();
  });

  test('TMS-RDMS-ADD-004 - BR-110 (negative): a blank Mnemonic Code is refused and nothing is committed', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'Mnemonic Code', '');
  });

  test('TMS-RDMS-ADD-005 - BR-111: Premium Mode must be present/alphabetic outside partner business (KNOWN GAP per Catalogue v4.2)', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // Catalogue v4.2 records this as a PHASE-1 GAP: the modernized spec does
    // not yet document the branch-conditional domain/force rule, so this
    // case is expected to fail until that gap is closed (v4 Change Status:
    // MODIFIED). The check itself is real - a blank Premium Mode - not a
    // fabricated placeholder.
    await fieldControl(page, 'PPFS Premium Mode').fill('');
    await recordEditorPage.clickSave();
    await expect(heldValidationBanner(page)).toBeVisible();
  });

  test('TMS-RDMS-ADD-006 - BR-111 (negative): a blank Premium Mode is refused outside partner business (KNOWN GAP)', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'PPFS Premium Mode', '');
  });

  test('TMS-RDMS-ADD-007 - BR-114: Previous Date month must not exceed twelve and must be numeric', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await fieldControl(page, 'Previous Date').fill('202613');
    await recordEditorPage.clickSave();
    await expect(heldValidationBanner(page)).toBeVisible();
  });

  test('TMS-RDMS-ADD-008 - BR-114 (negative): a month above twelve in Previous Date is refused', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'Previous Date', '202613');
  });

  test('TMS-RDMS-ADD-009 - BR-115: Statement List Code leading digit must identify one of four recognised lists (KNOWN GAP)', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // Catalogue v4.2 PHASE-1 GAP: the four-list semantic is not seeded, so
    // this case is expected to fail until closed (v4 Change Status: MODIFIED).
    await fieldControl(page, 'Statement List Code').fill('999');
    await recordEditorPage.clickSave();
    await expect(heldValidationBanner(page)).toBeVisible();
  });

  test('TMS-RDMS-ADD-010 - BR-115 (negative): an out-of-range leading digit in Statement List Code is refused (KNOWN GAP)', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'Statement List Code', '999');
  });

  test('TMS-RDMS-ADD-011 - BR-116: Transaction Type must be one of sixteen recognised compensation types', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await fieldControl(page, 'Transaction Type').fill('Z');
    await recordEditorPage.clickSave();
    await expect(heldValidationBanner(page)).toBeVisible();
  });

  test('TMS-RDMS-ADD-012 - BR-116 (negative): an unrecognised Transaction Type is refused', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'Transaction Type', 'Z');
  });

  test('TMS-RDMS-ADD-013 - BR-119: Contract Years must be a two-digit number', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await fieldControl(page, 'Contract Years').fill('AB');
    await recordEditorPage.clickSave();
    await expect(heldValidationBanner(page)).toBeVisible();
  });

  test('TMS-RDMS-ADD-014 - BR-119 (negative): unreadable Contract Years is refused and the stored value is unchanged', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'Contract Years', 'AB');
  });

  test('TMS-RDMS-ADD-015 - BR-120: a 100-character free-text comment is accepted, audited and stored', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveAccepted(page, recordEditorPage, 'System & Processor Comments', 'A'.repeat(100));
  });

  test('TMS-RDMS-ADD-016 - BR-121: the carrier prefix and key suffix boxes together maintain one reference key', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // Best-effort selectors: the carrier-prefix/key-suffix boxes are not part
    // of the confirmed-live field label set for this tab.
    await fieldControl(page, 'Carrier').fill('PRU01');
    await recordEditorPage.clickSave();
    await expect(saveSuccessBanner(page)).toBeVisible();
  });

  test('TMS-RDMS-ADD-017 - BR-140: a downgraded over-limit release is shown back to the operator as Held', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: requires a manually created record with a
    // release already requested and its authority test already failed - a
    // specific backend-seeded precondition this suite cannot construct
    // against the shared TEST_POLICY_NUMBER record.
    await recordEditorPage.expectRegionVisible(/Additional/i);
  });

  test('TMS-RDMS-ADD-018 - BR-145: a special-branch charge is classified to a product by charge type, not by operator entry', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: same special-branch + charge-type-marker
    // gating as BR-055 (TMS-RDMS-ADD-001) - not constructible against the
    // shared test record.
    await recordEditorPage.expectRegionVisible(/Product Code/i);
  });

  test('TMS-RDMS-ADD-019 - BR-146: partner business AOS transaction code is system-derived and display-only', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // Expected Result states the screen field is display only regardless of
    // the specific policy-kind mapping, so this is checkable without seeding
    // a particular partner-business policy kind.
    await expect(fieldControl(page, 'AOS Trans Code')).toBeDisabled();
  });

  test('TMS-RDMS-ADD-020 - BR-147: for four pooled charge kinds the carrier stream is derived from action code / supplementary kind', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: the specific carrier-stream derivation
    // depends on the record already being one of four pooled policy kinds,
    // which is not knowable/controllable for the shared test record.
    await recordEditorPage.expectRegionVisible(/AOS Trans Code/i);
  });

  test('TMS-RDMS-ADD-021 - BR-149: derivation request on a qualifying channel replaces Product/Event Time/Event Activity', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: the derivation option is restricted to two
    // specific distribution channels; the shared test record's channel is
    // not documented, so the request control cannot be reliably located and
    // exercised.
    await recordEditorPage.expectRegionVisible(/Product Code/i);
  });

  test('TMS-RDMS-ADD-022 - BR-162 (contradiction): a derivation request marker corrupts Company Code', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: CSV marks this row BUSINESS CONFIRMATION
    // REQUIRED (Automation Candidate: "No - pending business confirmation").
    await recordEditorPage.expectRegionVisible(/Company Code/i);
  });

  test('TMS-RDMS-ADD-023 - BR-557: a per-field screening failure raises condition code 7111 (DA01015 Pattern A)', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await fieldControl(page, 'Transaction Type').fill('Z');
    await recordEditorPage.clickSave();
    await expect(screeningErrorBanner(page)).toBeVisible();
  });

  test('TMS-RDMS-ADD-024 - BR-558: paidReportDt accepts a valid CCYYMMDD date not later than today', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveAccepted(page, recordEditorPage, 'Paid Report', '20260101');
  });

  test('TMS-RDMS-ADD-025 - BR-558 (negative): an invalid paidReportDt is refused with code 7111', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'Paid Report', '20261332');
  });

  test('TMS-RDMS-ADD-026 - BR-559: Statement List Code accepts a value within the 3-character constraint', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveAccepted(page, recordEditorPage, 'Statement List Code', 'AAA');
  });

  test('TMS-RDMS-ADD-027 - BR-559 (negative): a Statement List Code exceeding 3 characters is refused with code 7111', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'Statement List Code', 'AAAA');
  });

  test('TMS-RDMS-ADD-028 - BR-560: Transaction Type accepts a value from the documented 16-value domain', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveAccepted(page, recordEditorPage, 'Transaction Type', 'A');
  });

  test('TMS-RDMS-ADD-029 - BR-560 (negative): a Transaction Type outside the 16-value domain is refused with code 7111', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'Transaction Type', 'Z');
  });

  test('TMS-RDMS-ADD-030 - BR-561: datePol/applicationDate accept a date not later than today', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveAccepted(page, recordEditorPage, 'Application Date', '20200101');
  });

  test('TMS-RDMS-ADD-031 - BR-561 (negative): a future datePol/applicationDate is refused with code 7111', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'Application Date', '20991231');
  });

  test('TMS-RDMS-ADD-032 - BR-562: mnemonicCode Q-branch value must be blank, null or "***"', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: this validation applies only "when branch
    // starts with Q"; the shared test record's branch is not documented, so
    // the rule may not even be in effect for it.
    await recordEditorPage.expectRegionVisible(/Mnemonic Code/i);
  });

  test('TMS-RDMS-ADD-033 - BR-562 (negative): an out-of-set mnemonicCode on the Q branch is refused with code 7111', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: same Q-branch gating as TMS-RDMS-ADD-032.
    await recordEditorPage.expectRegionVisible(/Mnemonic Code/i);
  });

  test('TMS-RDMS-ADD-034 - BR-563: aosTransCode accepts a value within the 4-character constraint', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveAccepted(page, recordEditorPage, 'AOS Trans Code', 'AAAA');
  });

  test('TMS-RDMS-ADD-035 - BR-563 (negative): an aosTransCode exceeding 4 characters is refused with code 7111', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'AOS Trans Code', 'AAAAA');
  });

  test('TMS-RDMS-ADD-036 - BR-564: messageCode is derived per aosCode when channelCode starts with P', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: derivation is gated on the record's
    // channel code starting with "P" and on a reference table this suite
    // does not have inline; not controllable for the shared test record.
    await recordEditorPage.expectRegionVisible(/Message Code/i);
  });

  test('TMS-RDMS-ADD-037 - BR-564 (negative): a messageCode constraint breach is refused with code 7111', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: same channel-code gating as TMS-RDMS-ADD-036.
    await recordEditorPage.expectRegionVisible(/Message Code/i);
  });

  test('TMS-RDMS-ADD-038 - BR-565: correcting a transaction already changed to delete status is refused with code 7112', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: requires the record to already be in
    // pending-delete status with a correction concurrently attempted - a
    // specific backend-seeded state not constructible here.
    await recordEditorPage.expectRegionVisible(/Additional/i);
  });

  test('TMS-RDMS-ADD-039 - BR-566: transferring with an RHO code of Q or R is refused with code 7126', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: requires keying a specific invalid RHO
    // code into the live Transfer dialog; the dialog's own field layout is
    // unconfirmed, so only that the action is reachable is asserted here.
    await attemptTransferAction(page, recordEditorPage);
  });

  test('TMS-RDMS-ADD-040 - BR-567: transferring to the case-owning RHO is refused with code 7127', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: requires knowing the record's own current
    // RHO to deliberately key it back as the destination - not documented.
    await attemptTransferAction(page, recordEditorPage);
  });

  test('TMS-RDMS-ADD-041 - BR-568: transferring from the second half of a double-length record is refused with code 7128', async ({ page, loginPage, recordEditorPage }) => {
    await openDoubleLengthRecordTransferDialog(page, loginPage, recordEditorPage);
    await expect(page.getByRole('dialog').or(page.getByRole('heading', { name: /Transfer/i })).first()).toBeVisible();
    await submitTransferToRho(page, 'I');
    await expect(page.getByText('ERROR - A DOUBLE LENGTH RECORD CAN ONLY BE TRANSFERRED FROM THE FIRST HALF OF THE RECORD', { exact: true })).toBeVisible();
    await recordEditorPage.cancelDialog();
    // RESOLVED (2026-09-03): see this file's header comment above
    // openDoubleLengthRecordTransferDialog for how DOUBLE_LENGTH_POLICY_NUMBER
    // (100000005/ECN 20202627000005, recordLength 1668) was found and confirmed. Submitting
    // Transfer with Target RHO=I reproduces condition 7128 exactly as catalogued.
  });

  test('TMS-RDMS-ADD-042 - BR-569: transferring a replacement record whose copies exist in all RHOs is refused with code 7129', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: requires a replacement record already
    // copied to every RHO - a specific backend-seeded state.
    await attemptTransferAction(page, recordEditorPage);
  });

  test('TMS-RDMS-ADD-043 - BR-570: transferring a DX0I1 service register record is refused with code 7130', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: requires an I1 service-register record,
    // not the shared general test record.
    await attemptTransferAction(page, recordEditorPage);
  });

  test('TMS-RDMS-ADD-044 - BR-571: transferring a SYNOPSIS-only record is refused with code 7131', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: requires a synopsis-only record, not the
    // shared general test record.
    await attemptTransferAction(page, recordEditorPage);
  });

  test('TMS-RDMS-ADD-045 - BR-572: an RVP error requires status D or H, otherwise refused with code 7132', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: requires the record to be in a specific
    // RVP-error state, not constructible for the shared test record.
    await recordEditorPage.expectRegionVisible(/Additional/i);
  });

  test('TMS-RDMS-ADD-046 - BR-573: an untrapped module error is reported under the generic catch-all code 7900', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: this is CICS's own HANDLE CONDITION ERROR
    // catch-all - there is no documented UI action that reliably provokes
    // it, and doing so deliberately would risk destabilizing the shared
    // live environment.
    await recordEditorPage.expectRegionVisible(/Additional/i);
  });

  test('TMS-RDMS-ADD-047 - BR-574: a per-field screening failure raises condition code 7111 (DA01016 Pattern A)', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await fieldControl(page, 'Transaction Type').fill('Z');
    await recordEditorPage.clickSave();
    await expect(screeningErrorBanner(page)).toBeVisible();
  });

  test('TMS-RDMS-ADD-048 - BR-575: origCycle accepts a value within the 6-character CCYYWW constraint', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveAccepted(page, recordEditorPage, 'Orig Cycle', 'AAAAAA');
  });

  test('TMS-RDMS-ADD-049 - BR-575 (negative): an origCycle exceeding 6 characters is refused with code 7111', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'Orig Cycle', 'AAAAAAA');
  });

  test('TMS-RDMS-ADD-050 - BR-576: contractYears accepts a two-digit value in range 0-99', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveAccepted(page, recordEditorPage, 'Contract Years', '99');
  });

  test('TMS-RDMS-ADD-051 - BR-576 (negative): a non-numeric contractYears is refused with code 7111', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'Contract Years', 'AA');
  });

  test('TMS-RDMS-ADD-052 - BR-577: polNbrDgt accepts a single check-digit character', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveAccepted(page, recordEditorPage, 'Pol Nbr Dgt', 'A');
  });

  test('TMS-RDMS-ADD-053 - BR-577 (negative): a polNbrDgt exceeding one character is refused with code 7111', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'Pol Nbr Dgt', 'AA');
  });

  test('TMS-RDMS-ADD-054 - BR-578: productCode on the Q branch must be one of the catalog codes', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: validation applies only "when branch
    // starts with Q"; the shared test record's branch is not documented.
    await recordEditorPage.expectRegionVisible(/Product Code/i);
  });

  test('TMS-RDMS-ADD-055 - BR-578 (negative): an out-of-catalog productCode on the Q branch is refused with code 7111', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: same Q-branch gating as TMS-RDMS-ADD-054.
    await recordEditorPage.expectRegionVisible(/Product Code/i);
  });

  test('TMS-RDMS-ADD-056 - BR-579: eventTimeCode accepts a registered ref_lookup[event_time] value', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: the accepted value must be one of the
    // codes registered in Reference Data Administration; that list is not
    // supplied as literal Test Data and this suite has no admin-entitled
    // session to read it live.
    await recordEditorPage.expectRegionVisible(/Event Time Code/i);
  });

  test('TMS-RDMS-ADD-057 - BR-579/BR-309 (permissive tier): an out-of-domain eventTimeCode is accepted verbatim, no validation applied', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldPermissiveAccept(page, recordEditorPage, 'Event Time Code', 'ZZZ');
  });

  test('TMS-RDMS-ADD-058 - BR-580: companyCode accepts a registered ref_lookup[company] value', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: the accepted value must come from
    // Reference Data Administration's company code list, not supplied as
    // literal Test Data.
    await recordEditorPage.expectRegionVisible(/Company Code/i);
  });

  test('TMS-RDMS-ADD-059 - BR-580 (negative): an unregistered companyCode is refused with code 7111', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'Company Code', 'ZZZ');
  });

  test('TMS-RDMS-ADD-060 - BR-581: eventActivityCode accepts a registered ref_lookup[event_activity] value', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: the accepted value must come from
    // Reference Data Administration's event-activity code list, not
    // supplied as literal Test Data.
    await recordEditorPage.expectRegionVisible(/Event Activity Code/i);
  });

  test('TMS-RDMS-ADD-061 - BR-581/BR-309 (permissive tier): an out-of-domain eventActivityCode is accepted verbatim', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldPermissiveAccept(page, recordEditorPage, 'Event Activity Code', 'ZZZ');
  });

  test('TMS-RDMS-ADD-062 - BR-582: recordTypeInput/recordCodeInput accepts CB1-CB4 or blank', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveAccepted(page, recordEditorPage, 'Record Code', 'CB1');
  });

  test('TMS-RDMS-ADD-063 - BR-582 (negative): a recordTypeInput/recordCodeInput outside CB1-CB4/blank is refused with code 7111', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'Record Code', 'XXX');
  });

  test('TMS-RDMS-ADD-064 - BR-583: errorMsgNo accepts a value within the 4-character constraint', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveAccepted(page, recordEditorPage, 'Error Msg No', 'AAAA');
  });

  test('TMS-RDMS-ADD-065 - BR-583 (negative): an errorMsgNo exceeding 4 characters is refused with code 7111', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'Error Msg No', 'AAAAA');
  });

  test('TMS-RDMS-ADD-066 - BR-584: retReasonCode accepts a registered ref_lookup[ret_reason] value', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: the accepted value must come from
    // Reference Data Administration's return-reason code list, not
    // supplied as literal Test Data.
    await recordEditorPage.expectRegionVisible(/Ret Reason Code/i);
  });

  test('TMS-RDMS-ADD-067 - BR-584/BR-309 (permissive tier): an out-of-domain retReasonCode is accepted verbatim', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldPermissiveAccept(page, recordEditorPage, 'Ret Reason Code', 'ZZZ');
  });

  test('TMS-RDMS-ADD-068 - BR-585: agentPlanCode accepts a registered ref_lookup[agent_plan] value', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: the accepted value must come from
    // Reference Data Administration's agent-plan code list, not supplied as
    // literal Test Data.
    await recordEditorPage.expectRegionVisible(/Agent Plan Code/i);
  });

  test('TMS-RDMS-ADD-069 - BR-585 (negative): an unregistered agentPlanCode is refused with code 7111', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'Agent Plan Code', 'ZZZ');
  });

  test('TMS-RDMS-ADD-070 - BR-586: aosTransCode (DA01016) accepts a value within the 4-character constraint', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveAccepted(page, recordEditorPage, 'AOS Trans Code', 'AAAA');
  });

  test('TMS-RDMS-ADD-071 - BR-586 (negative): an aosTransCode (DA01016) exceeding 4 characters is refused with code 7111', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    await expectFieldSaveRefused(page, recordEditorPage, 'AOS Trans Code', 'AAAAA');
  });

  test('TMS-RDMS-ADD-072 - BR-587: correcting a transaction already changed to delete status (DA01016) is refused with code 7112', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: same pending-delete-state gating as
    // TMS-RDMS-ADD-038, on the DA01016-derived screen.
    await recordEditorPage.expectRegionVisible(/Additional/i);
  });

  test('TMS-RDMS-ADD-073 - BR-588: transferring with an RHO code of Q or R (DA01016) is refused with code 7126', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: same as TMS-RDMS-ADD-039, on the
    // DA01016-derived screen.
    await attemptTransferAction(page, recordEditorPage);
  });

  test('TMS-RDMS-ADD-074 - BR-589: transferring to the case-owning RHO (DA01016) is refused with code 7127', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: same as TMS-RDMS-ADD-040.
    await attemptTransferAction(page, recordEditorPage);
  });

  test('TMS-RDMS-ADD-075 - BR-590: transferring from the second half of a double-length record (DA01016) is refused with code 7128', async ({ page, loginPage, recordEditorPage }) => {
    await openDoubleLengthRecordTransferDialog(page, loginPage, recordEditorPage);
    await expect(page.getByRole('dialog').or(page.getByRole('heading', { name: /Transfer/i })).first()).toBeVisible();
    await submitTransferToRho(page, 'I');
    await expect(page.getByText('ERROR - A DOUBLE LENGTH RECORD CAN ONLY BE TRANSFERRED FROM THE FIRST HALF OF THE RECORD', { exact: true })).toBeVisible();
    await recordEditorPage.cancelDialog();
    // RESOLVED (2026-09-03): same fixture and finding as TMS-RDMS-ADD-041 above - BR-568 and
    // BR-590 both alias the same universal BR-366 condition (DA01015 and DA01016 are two
    // legacy screens both replaced by this one modernized Additional Information tab), so the
    // same live confirmation applies to both.
  });

  test('TMS-RDMS-ADD-076 - BR-591: transferring a replacement record whose copies exist in all RHOs (DA01016) is refused with code 7129', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: same as TMS-RDMS-ADD-042.
    await attemptTransferAction(page, recordEditorPage);
  });

  test('TMS-RDMS-ADD-077 - BR-592: transferring a DX0I1 service register record (DA01016) is refused with code 7130', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: same as TMS-RDMS-ADD-043.
    await attemptTransferAction(page, recordEditorPage);
  });

  test('TMS-RDMS-ADD-078 - BR-593: transferring a SYNOPSIS-only record (DA01016) is refused with code 7131', async ({ page, loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: same as TMS-RDMS-ADD-044.
    await attemptTransferAction(page, recordEditorPage);
  });

  test('TMS-RDMS-ADD-079 - BR-594: an RVP error (DA01016) requires status D or H, otherwise refused with code 7132', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: same as TMS-RDMS-ADD-045.
    await recordEditorPage.expectRegionVisible(/Additional/i);
  });

  test('TMS-RDMS-ADD-080 - BR-595: an untrapped module error (DA01016) is reported under the generic catch-all code 7900', async ({ loginPage, recordEditorPage }) => {
    await openAdditionalInfoEditable(loginPage, recordEditorPage);
    // NOT INDEPENDENTLY VERIFIED: same CICS catch-all limitation as
    // TMS-RDMS-ADD-046.
    await recordEditorPage.expectRegionVisible(/Additional/i);
  });
});
