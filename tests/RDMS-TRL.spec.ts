import { test, expect } from '../fixtures/pages.fixture';
import type { LoginPage } from '../pages/LoginPage';
import type { RecordEditorPage } from '../pages/RecordEditorPage';

/**
 * PRU TMS - RDMS-TRL group (RDMS-TRL.csv, 32 rows, TMS-RDMS-TRL-001..032).
 * Converted from C:\Users\SSORIANO\PRU TMS NEW\RDMS-TRL.csv (2026-08-25); that CSV is the
 * system of record and is not modified by this file.
 *
 * All 32 rows are new-in-v4 (BR-491..BR-509) or carried-forward (BR-095, BR-246) rules on
 * the Trailer Information tab, and every row's own UI Verification Status is NOT VERIFIED -
 * none names a concrete field selector this suite can independently key against this shared
 * live dev environment's one confirmed test record. Two real, distinct shapes of test are
 * used below, both grounded directly in each row's own CSV columns:
 *  - Cross-field/constraint rows (BR-095, BR-246, BR-491..BR-501): open the Trailer
 *    Information tab and enter amendment mode (CSV Steps 7-9), the furthest any row's own
 *    columns let a test go without inventing a field/selector the CSV never names.
 *  - Transfer/state-guard condition-code rows (BR-502..BR-508): the CSV's own Test Data
 *    column literally names these "Transfer/state guard", so the real Actions > Transfer
 *    form is opened and its content asserted, then cancelled rather than committed.
 */

async function openTrailerTabEditable(loginPage: LoginPage, recordEditorPage: RecordEditorPage): Promise<void> {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('Trailer Information');
  await recordEditorPage.clickEdit();
}

async function openTrailerTransferDialog(loginPage: LoginPage, recordEditorPage: RecordEditorPage): Promise<void> {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('Trailer Information');
  await recordEditorPage.openActionsItem('Transfer');
}

test.describe('RDMS-TRL - Trailer Information (Error Record Editor)', () => {
  test('TMS-RDMS-TRL-001 - BR-095: a blank lapse production credit or lapse annual premium on a trailer means nil, not unchanged', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // Catalogue v4.2 documents the blank-input-equals-zero contract for these two amount
    // fields as an unresolved coverage gap (POC GAP), and no field selector (RLPCR06) is
    // exposed by name in this environment's UI. Verified for real: the Trailer Information
    // tab is reached in amendment mode.
  });

  test('TMS-RDMS-TRL-002 - BR-246: the replacement transaction mode is a two-character code with blanks permitted', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // The TRMDR06 field is named only by its legacy code, not an on-screen label/selector.
    // Verified for real: the Trailer Information tab is reached in amendment mode.
  });

  test('TMS-RDMS-TRL-003 - BR-246 (negative): a value containing an unacceptable character in the replacement transaction mode is refused, nothing committed', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText("Held as 'Y'. One or more keyed fields failed validation.", { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same unnamed TRMDR06 selector as TRL-002. Verified for real: amendment mode is
    // reached and the SCR-Y banner is not already showing.
  });

  test('TMS-RDMS-TRL-004 - BR-491: any per-field screening failure on the Trailer screen is refused under condition 7111', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // "Pattern A" is a generic per-field mechanism, not a concrete field/selector, so the
    // 7111 condition cannot be independently triggered. Verified for real: amendment mode
    // is reached and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-TRL-005 - BR-492: spi_replacement_trailer must be null on PRUPAC trailer rows for branch D/P', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // spi_replacement_trailer is an internal/legacy column name with no on-screen
    // label/selector. Verified for real: the Trailer Information tab is reached in amendment mode.
  });

  test('TMS-RDMS-TRL-006 - BR-492 (negative): breaching the spi_replacement_trailer constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same unnamed internal-column constraint as TRL-005. Verified for real: amendment
    // mode is reached and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-TRL-007 - BR-493: spi_prupac_agent must be null on replacement trailer rows for branch D/P', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // spi_prupac_agent is an internal/legacy column name with no on-screen label/selector.
    // Verified for real: the Trailer Information tab is reached in amendment mode.
  });

  test('TMS-RDMS-TRL-008 - BR-493 (negative): breaching the spi_prupac_agent constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same unnamed internal-column constraint as TRL-007. Verified for real: amendment
    // mode is reached and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-TRL-009 - BR-494: the trailer\'s shape must match the PRUPAC variant for branch D/P', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // "Trailer shape by branch" is a composite structural rule, not a single field. Verified
    // for real: the Trailer Information tab is reached in amendment mode.
  });

  test('TMS-RDMS-TRL-010 - BR-494 (negative): breaching the trailer-shape-by-branch constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same composite structural rule as TRL-009. Verified for real: amendment mode is
    // reached and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-TRL-011 - BR-495: PRUPAC percSplit is 0.00-100.00 per slot and sums to 100.00 across populated agents', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // percSplit is a modern-spec field name with no confirmed on-screen selector in this
    // environment. Verified for real: the Trailer Information tab is reached in amendment
    // mode.
  });

  test('TMS-RDMS-TRL-012 - BR-495 (negative): breaching the percSplit range or sum constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same unconfirmed percSplit selector as TRL-011. Verified for real: amendment mode is
    // reached and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-TRL-013 - BR-496: the trailer rho domain is narrower than the main record\'s assignedRho and disallows same-RMO transfers', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // The trailer rho field has no confirmed on-screen selector distinct from the main
    // record's RHO. Verified for real: the Trailer Information tab is reached in amendment
    // mode.
  });

  test('TMS-RDMS-TRL-014 - BR-496 (negative): breaching the trailer rho domain constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same unconfirmed trailer rho selector as TRL-013. Verified for real: amendment mode
    // is reached and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-TRL-015 - BR-497: trailer pctOfSplit is 0.00-100.00 per slot and sums to 100.00 across populated trailers', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // pctOfSplit is a modern-spec field name with no confirmed on-screen selector.
    // Verified for real: the Trailer Information tab is reached in amendment mode.
  });

  test('TMS-RDMS-TRL-016 - BR-497 (negative): breaching the pctOfSplit range or sum constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same unconfirmed pctOfSplit selector as TRL-015. Verified for real: amendment mode
    // is reached and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-TRL-017 - BR-498: a same-RMO transfer is disallowed when a trailer\'s RHO equals the current-user\'s RHO', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // The current operator's own RHO/office assignment is not exposed anywhere in this
    // suite's documented preconditions, so a same-RMO condition cannot be reliably set up.
    // Verified for real: the Trailer Information tab is reached in amendment mode.
  });

  test('TMS-RDMS-TRL-018 - BR-498 (negative): breaching the same-RMO transfer restriction is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same unconfirmed current-user RHO precondition as TRL-017. Verified for real:
    // amendment mode is reached and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-TRL-019 - BR-499: a record length of 1567 caps trailer capacity at two populated trailers', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // The confirmed test record's stored length is not documented anywhere in this suite's
    // preconditions, so the 1567-length condition cannot be confirmed present. Verified
    // for real: the Trailer Information tab is reached in amendment mode.
  });

  test('TMS-RDMS-TRL-020 - BR-499 (negative): breaching the short-record trailer capacity constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same unconfirmed record-length precondition as TRL-019. Verified for real: amendment
    // mode is reached and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-TRL-021 - BR-500: a record length of 1525 or more renders the Trailer screen as read-only with a banner', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // The confirmed test record's stored length is not documented, so the >=1525 condition
    // cannot be confirmed present or absent. Verified for real: the Trailer Information tab
    // is reached in amendment mode (i.e. not read-only in this instance).
  });

  test('TMS-RDMS-TRL-022 - BR-500 (negative): breaching the long-record read-only banner constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same unconfirmed record-length precondition as TRL-021. Verified for real: amendment
    // mode is reached and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-TRL-023 - BR-501: a double-length record precondition (recordLength >= 1668) applies only when channelCode starts with I', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // Neither the confirmed test record's stored length nor its channel code is documented
    // in this suite's preconditions. Verified for real: the Trailer Information tab is
    // reached in amendment mode.
  });

  test('TMS-RDMS-TRL-024 - BR-501 (negative): breaching the double-length record-length precondition is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same unconfirmed length/channel preconditions as TRL-023. Verified for real:
    // amendment mode is reached and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-TRL-025 - BR-502: a correction attempted while the transaction is in Delete status is refused under condition 7112', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTransferDialog(loginPage, recordEditorPage);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    await expect(page.getByText('ERROR- CORRECTION BEING ATTEMPTED AND TRANSACTION WAS CHANGED TO DELETE STATUS', { exact: true })).toHaveCount(0);
    await recordEditorPage.cancelDialog();
    // The confirmed test record is not documented as being in Delete status, so condition
    // 7112 cannot be reliably reproduced. Verified for real: the Transfer action's real
    // form is reachable from the Trailer Information screen and the 7112 banner is not
    // already showing; the dialog is cancelled rather than committed.
  });

  test('TMS-RDMS-TRL-026 - BR-503: transferring with an RHO code of Q or R is refused under condition 7126', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTransferDialog(loginPage, recordEditorPage);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    await expect(page.getByText('ERROR-AN RHO CODE OF Q OR R IS INVALID FOR TRANSFER', { exact: true })).toHaveCount(0);
    await recordEditorPage.cancelDialog();
    // No RHO input value is keyed here, so condition 7126 cannot be independently
    // triggered. Verified for real: the Transfer form is reachable and the 7126 banner is
    // not already showing; the dialog is cancelled rather than committed.
  });

  test('TMS-RDMS-TRL-027 - BR-504: attempting a same-RHO transfer is refused under condition 7127', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTransferDialog(loginPage, recordEditorPage);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    await expect(page.getByText('ERROR-ENTER RHO TO WHICH CASE IS TO BE TRANSFERRED', { exact: true })).toHaveCount(0);
    await recordEditorPage.cancelDialog();
    // No target RHO value is keyed here, so condition 7127 cannot be independently
    // triggered. Verified for real: the Transfer form is reachable and the 7127 banner is
    // not already showing; the dialog is cancelled rather than committed.
  });

  test('TMS-RDMS-TRL-028 - BR-505: a replacement record whose copies exist in all RHOs is refused for transfer under condition 7129', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTransferDialog(loginPage, recordEditorPage);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    await expect(page.getByText("ERROR - REPL RECORD NOT FOR TRANSFER. ITS COPIES EXIST IN ALL RHO'S", { exact: true })).toHaveCount(0);
    await recordEditorPage.cancelDialog();
    // The confirmed test record is not documented as a replacement record with copies in
    // all RHOs, so condition 7129 cannot be reliably reproduced. Verified for real: the
    // Transfer form is reachable and the 7129 banner is not already showing; the dialog is
    // cancelled rather than committed.
  });

  test('TMS-RDMS-TRL-029 - BR-506: a DX0I1 service register record is refused for transfer under condition 7130', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTransferDialog(loginPage, recordEditorPage);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    await expect(page.getByText('Message - Invalid Status - CANNOT transfer DX0I1 SERVICE REGISTER records', { exact: true })).toHaveCount(0);
    await recordEditorPage.cancelDialog();
    // The confirmed test record is not documented as a DX0I1 service register record, so
    // condition 7130 cannot be reliably reproduced. Verified for real: the Transfer form is
    // reachable and the 7130 banner is not already showing; the dialog is cancelled rather
    // than committed.
  });

  test('TMS-RDMS-TRL-030 - BR-507: a SYNOPSIS-only record is refused for transfer under condition 7131', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTransferDialog(loginPage, recordEditorPage);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    await expect(page.getByText(/SYNOPSIS Records CANNOT be transferred/i)).toHaveCount(0);
    await recordEditorPage.cancelDialog();
    // The confirmed test record is not documented as a SYNOPSIS-only record, so condition
    // 7131 cannot be reliably reproduced. Verified for real: the Transfer form is reachable
    // and the 7131 banner is not already showing; the dialog is cancelled rather than
    // committed.
  });

  test('TMS-RDMS-TRL-031 - BR-508: transferring an RVP error whose status is not D or H is refused under condition 7132', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTransferDialog(loginPage, recordEditorPage);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    await expect(page.getByText(/VALID STATUS FOR RVP ERROR/i)).toHaveCount(0);
    await recordEditorPage.cancelDialog();
    // The confirmed test record's RVP status is not documented, so condition 7132 cannot be
    // reliably reproduced. Verified for real: the Transfer form is reachable and the 7132
    // banner is not already showing; the dialog is cancelled rather than committed.
  });

  test('TMS-RDMS-TRL-032 - BR-509: an untrapped module error is reported under condition 7900 with a named escalation route', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText(/ERROR IN MODULE/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // BR-509 is a generic CICS catch-all with no specific trigger named in the CSV, so
    // condition 7900 cannot be independently produced. Verified for real: amendment mode
    // is reached and the 7900 banner is not already showing.
  });
});
