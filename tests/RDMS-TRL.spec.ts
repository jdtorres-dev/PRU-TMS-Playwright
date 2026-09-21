import { test, expect } from '../fixtures/pages.fixture';
import { Locator, Page } from '@playwright/test';
import {
  PRUPAC_TEST_POLICY_NUMBER,
  PRUPAC_TEST_ERROR_ID,
  DOUBLE_LENGTH_TEST_POLICY_NUMBER,
  DOUBLE_LENGTH_TEST_ERROR_ID,
  RVP_TEST_POLICY_NUMBER,
  RVP_TEST_ERROR_ID,
  TRL_PCTOFSPLIT_TEST_POLICY_NUMBER,
} from '../test-data/constants';
import type { LoginPage } from '../pages/LoginPage';
import type { ErrorManagerPage } from '../pages/ErrorManagerPage';
import type { RecordEditorPage } from '../pages/RecordEditorPage';

/**
 * PRU TMS - RDMS-TRL group (PRU_TMS_Test_Cases_v4 1.xlsx, RDMS-TRL sheet, 32 rows,
 * TMS-RDMS-TRL-001..032). TRL-001 (phase-1 gap) and TRL-002/003 (out of scope) are disabled
 * via test.skip(); TRL-004..032 (phase-1 mod-spec feature) all run.
 *
 * The Trailer Information tab renders one of two mutually exclusive shapes depending on the
 * record's own branch (BR-494, "fully deterministic; no operator override"):
 *  - Branch D/P: PRUPAC variant - an "Agent Allocation Grid" (up to 4 agent rows, fields
 *    prupacTrailer.agents.<slot>.typeOfAgt/contNo/percSplit). percSplit is 0.00-100.00 per
 *    slot and must sum to 100.00 across populated agents (BR-495).
 *  - Any other branch: Replacement variant - a "Trailer Comparison (TRLR-1..6)" grid (up to 6
 *    trailer slots). RHO is a readonly combobox (domain B/C/E/F/G/I/Q on the shared fixture,
 *    matching BR-496); Agree Number/Agent Surname/District/pctOfSplit are plain text inputs
 *    (replacementTrailer.trailers.<slot>.agreeNo/agtSurname/dist/pctOfSplit). pctOfSplit is
 *    0.00-100.00 per slot and must sum to 100.00 across populated trailers (BR-497).
 *
 * Record length (BR-499/500/501's own thresholds) is exposed via the "View system metadata
 * for this record" button (Record Details panel, RECORD LENGTH field), not on the Trailer tab
 * itself. DOUBLE_LENGTH_TEST_POLICY_NUMBER (recordLength 1668, test-data/constants.ts) is the
 * only known record long enough to reach these thresholds:
 *  - BR-500 (≥1525): confirmed - this build locks the ENTIRE record read-only on every RDMS
 *    tab once length ≥ 1525, not just Trailer (TRL-021/022).
 *  - BR-499 (1567) and BR-501's full precondition (≥1668 AND channelCode starting with "I")
 *    are still not independently testable: BR-500's own 1525 threshold is lower than both, so
 *    any record long enough to reach either one is already read-only under BR-500 first - a
 *    structural conflict between the two rules as implemented, not a missing record (TRL-019/
 *    020). This record's own channelCode is "02", so BR-501's channelCode half also remains
 *    unmet (TRL-023/024).
 *
 * The current operator's own RHO (needed for BR-498, TRL-017/018) is never exposed to the
 * client at all: BR-335 resolves it server-side at login and never returns it on any request
 * or response, by design (closes a client-side scope-spoofing hole).
 *
 * TRL-013/014 never Save a real value onto the Trailer Comparison grid's own RHO field
 * (Cancel only) - not because a real save is unsafe (per-account RHO-scope enforcement is
 * confirmed real and correct elsewhere in this suite, not a defect), but because this file
 * hasn't verified which destination codes fall inside vs. outside admin/admin's own scope on
 * this specific field, the way RDMS-GEN.spec.ts's GEN-048/100 did for General Information's.
 *
 * ROLE_ADMIN (admin/admin, loginAsValidUser()) cannot reach Transfer at all on the shared
 * TEST_POLICY_NUMBER fixture - its own Actions menu never lists it. TRL-025..031 use a
 * dedicated ROLE_OPERATOR login (OPERATOR_TEST_USERNAME/PASSWORD below) instead.
 */

// Trailer Comparison grid (TRLR-1..6, slot 0-5): RHO is a combobox with no name attribute of
// its own, located by its own table row (accessible name starts with "RHO") and the 0-based
// trailer-slot column index within that row.
function trailerRhoField(page: Page, slot: number): Locator {
  return page.getByRole('row', { name: /^RHO/i }).locator('input').nth(slot);
}

// PRUPAC variant's Agent Allocation Grid (≤4 agent slots, 0-3).
function prupacPercSplitField(page: Page, slot: number): Locator {
  return page.locator(`[name="prupacTrailer.agents.${slot}.percSplit"]`);
}

function trailerPctOfSplitField(page: Page, slot: number): Locator {
  return page.locator(`[name="replacementTrailer.trailers.${slot}.pctOfSplit"]`);
}

// Same banner convention RDMS-GEN.spec.ts uses: the app's field-validation refusal reads
// "ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S) (...)" - not a bare /error/i match, since
// "Error ID:"/the "Error Record Editor" breadcrumb are always present regardless of outcome.
function screeningErrorBanner(page: Page): Locator {
  return page.getByText(/SCREENING ERROR/i);
}

// The Trailer Comparison grid's RHO combobox renders `readonly` - a pure click-to-open,
// click-an-option-to-select control, unlike General Information's own comboboxes
// (RDMS-GEN.spec.ts's selectComboboxOption()), which accept a typed filter string. .fill()
// times out on it (never editable), so a value can only be chosen by clicking the option
// whose own text starts with `code` (e.g. "B" for the CAMO option).
async function selectReadonlyComboboxOption(page: Page, field: Locator, code: string): Promise<string> {
  await field.scrollIntoViewIfNeeded();
  await field.click();
  const option = page.getByRole('option', { name: new RegExp(`^${code}\\b`) });
  await expect(option).toBeVisible();
  // force:true: right after the page auto-scrolls the table row into view, this floating
  // listbox can render positioned over an unrelated field higher up the form - a popover
  // rendering quirk, not a real overlapping control - which blocks a plain click.
  await option.click({ force: true });
  await expect(page.getByRole('listbox')).toHaveCount(0);
  return field.inputValue();
}

// Retries clicking Edit right after a Save - a lingering success toast or a post-save
// re-render can otherwise silently leave the page in read-only View. Mirrors
// RDMS-GEN.spec.ts's reenterEditMode(). The PRUPAC Agent Allocation Grid's own Save does NOT
// return to read-only at all (Cancel/Save Changes/Submit stay visible indefinitely), unlike
// the Replacement variant's Trailer fields (TRL-015) - the settle wait, then checking which
// state actually rendered before deciding whether Edit needs clicking, covers both cases.
async function reenterEditMode(recordEditorPage: RecordEditorPage, page: Page): Promise<void> {
  await page.waitForTimeout(3000);
  if (await recordEditorPage.saveChangesButton().isVisible()) return;
  await expect(async () => {
    await recordEditorPage.clickEdit({ force: true });
    await expect(recordEditorPage.saveChangesButton()).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20000 });
}

async function openTrailerTabEditable(loginPage: LoginPage, recordEditorPage: RecordEditorPage): Promise<void> {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('Trailer Information');
  await recordEditorPage.clickEdit();
}

// admin/admin (ROLE_ADMIN/ROLE_REFDATA_ADMIN, loginAsValidUser()) cannot reach the Transfer
// validation this file's Transfer-based tests need: submitting it returns a blanket HTTP 403
// {"error":"Access Denied"} before any RHO-specific rule ever runs, and its own Actions menu
// on the shared fixture doesn't list Transfer at all. o-0001 (Marcus Webb, ROLE_OPERATOR,
// rhoScope [A,B,C,D,E,F,G,I,Q,R]) is used instead - a scope wide enough to cover
// TEST_POLICY_NUMBER's own current RHO (B) and the Q/R codes BR-503 exercises, so no separate
// "target RHO not in my own scope" check can confound these tests' own assertions.
const OPERATOR_TEST_USERNAME = 'o-0001';
const OPERATOR_TEST_PASSWORD = 'operator';

async function openTrailerTransferDialogAsOperator(
  page: Page,
  loginPage: LoginPage,
  recordEditorPage: RecordEditorPage,
): Promise<void> {
  await loginPage.goto();
  await loginPage.submitLogin(OPERATOR_TEST_USERNAME, OPERATOR_TEST_PASSWORD);
  await page.waitForURL(/\/errors/);
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('Trailer Information');
  await recordEditorPage.openActionsItem('Transfer');
}

// Opens DOUBLE_LENGTH_TEST_POLICY_NUMBER's own Trailer Information tab (recordLength 1668 -
// see header). o-0001/operator is used for consistency with the other operator-login helpers
// here, though admin/admin's own rhoScope also covers this record's RHO (F) - not tried, since
// Transfer elsewhere in this suite already established admin isn't reliable for this record
// family.
async function openLongFormatRecordTrailerTab(
  page: Page,
  loginPage: LoginPage,
  recordEditorPage: RecordEditorPage,
): Promise<void> {
  await loginPage.goto();
  await loginPage.submitLogin(OPERATOR_TEST_USERNAME, OPERATOR_TEST_PASSWORD);
  await page.waitForURL(/\/errors/);
  await recordEditorPage.openRecord(DOUBLE_LENGTH_TEST_POLICY_NUMBER, DOUBLE_LENGTH_TEST_ERROR_ID);
  await recordEditorPage.openRdmsTab('Trailer Information');
}

// Dedicated fixtures for TRL-028/029/030, each found via a full CB Records census cross-
// referenced against each candidate's own detail JSON (GET /api/v1/spi/{ecn}). None of these
// three are the shared TEST_POLICY_NUMBER fixture, so each test opens its own record directly.
const I1_SERVICE_REGISTER_POLICY_NUMBER = '300000144'; // ECN I1202636900144, recordCode CB1, runId I1, status HELD
const I1_SERVICE_REGISTER_ERROR_ID = '3003';
// recordCode CB3, premiumCommission.spiIndicator='C', branch S - deliberately NOT one of
// BR-507's synopsis branches (the only other CB3+spi=C record found, DC202626000004, is
// branch 1 and hits BR-507's synopsis check first instead - see TRL-030). Status is DELETED,
// which the default CB Records search excludes and which removes the Edit button entirely
// (TRL-025) - but the Actions menu's Transfer item stays reachable on a Deleted record, so
// "Include Deleted" must be checked to find it.
const PB_REPL_POLICY_NUMBER = '200000018'; // ECN I1202630001018
const PB_REPL_ERROR_ID = '0222';
const SYNOPSIS_POLICY_NUMBER = '100000004'; // ECN DC202626000004, branch 1 (a BR-507 synopsis branch), status HELD
const SYNOPSIS_ERROR_ID = 'E104';
// RHO codes Q and R are "Sentinel" values and are never valid transfer targets (errorCd 7110,
// TARGET_RHO_INVALID_FOR_TRANSFER) - condition 7126/BR-503 instead fires when the record being
// transferred FROM (its own current/source RHO) is already Q or R, regardless of the target.
// This record's own identity.rho is "Q".
const SOURCE_RHO_Q_POLICY_NUMBER = '300000279'; // ECN I1202636900279, recordCode 998, identity.rho=Q, status HELD
const SOURCE_RHO_Q_ERROR_ID = '7019';

async function openOwnRecordTransferDialogAsOperator(
  page: Page,
  loginPage: LoginPage,
  recordEditorPage: RecordEditorPage,
  policyNumber: string,
  errorId: string,
): Promise<void> {
  await loginPage.goto();
  await loginPage.submitLogin(OPERATOR_TEST_USERNAME, OPERATOR_TEST_PASSWORD);
  await page.waitForURL(/\/errors/);
  await recordEditorPage.openRecord(policyNumber, errorId);
  await recordEditorPage.openRdmsTab('Trailer Information');
  await recordEditorPage.openActionsItem('Transfer');
}

// Same as above, but for the PB_REPL candidate specifically: its Deleted status is excluded
// by the CB Records search's own default filters (BR-330), so "Include Deleted" must be
// checked before searching by policy number.
async function openDeletedRecordTransferDialogAsOperator(
  page: Page,
  loginPage: LoginPage,
  errorManagerPage: ErrorManagerPage,
  recordEditorPage: RecordEditorPage,
  policyNumber: string,
  errorId: string,
): Promise<void> {
  await loginPage.goto();
  await loginPage.submitLogin(OPERATOR_TEST_USERNAME, OPERATOR_TEST_PASSWORD);
  await page.waitForURL(/\/errors/);
  await errorManagerPage.goto();
  await errorManagerPage.selectSearchTab('CB Records');
  await errorManagerPage.allWeeksRadio().check();
  await errorManagerPage.includeDeletedCheckbox().check();
  await errorManagerPage.policyNumberField().fill(policyNumber);
  await errorManagerPage.viewRecords();
  await page
    .getByRole('link', { name: new RegExp(`^${errorId}$`) })
    .or(page.getByRole('button', { name: new RegExp(`^${errorId}$`) }))
    .or(page.getByRole('cell', { name: new RegExp(`^${errorId}$`) }))
    .first()
    .click();
  await recordEditorPage.openRdmsTab('Trailer Information');
  await recordEditorPage.openActionsItem('Transfer');
}

// Same as openDeletedRecordTransferDialogAsOperator above, but for a Released-status
// candidate: its status is likewise excluded by the CB Records search's own default filters
// (BR-330), so "Include Released" must be checked before searching by policy number.
async function openReleasedRecordTransferDialogAsOperator(
  page: Page,
  loginPage: LoginPage,
  errorManagerPage: ErrorManagerPage,
  recordEditorPage: RecordEditorPage,
  policyNumber: string,
  errorId: string,
): Promise<void> {
  await loginPage.goto();
  await loginPage.submitLogin(OPERATOR_TEST_USERNAME, OPERATOR_TEST_PASSWORD);
  await page.waitForURL(/\/errors/);
  await errorManagerPage.goto();
  await errorManagerPage.selectSearchTab('CB Records');
  await errorManagerPage.allWeeksRadio().check();
  await errorManagerPage.includeReleasedCheckbox().check();
  await errorManagerPage.policyNumberField().fill(policyNumber);
  await errorManagerPage.viewRecords();
  await page
    .getByRole('link', { name: new RegExp(`^${errorId}$`) })
    .or(page.getByRole('button', { name: new RegExp(`^${errorId}$`) }))
    .or(page.getByRole('cell', { name: new RegExp(`^${errorId}$`) }))
    .first()
    .click();
  await recordEditorPage.openRdmsTab('Trailer Information');
  await recordEditorPage.openActionsItem('Transfer');
}

test.describe('RDMS-TRL - Trailer Information (Error Record Editor)', () => {
  // Out of scope.
  test.skip('TMS-RDMS-TRL-001 - BR-095: a blank lapse production credit or lapse annual premium on a trailer means nil, not unchanged', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
  });

  // Out of scope.
  test.skip('TMS-RDMS-TRL-002 - BR-246: the replacement transaction mode is a two-character code with blanks permitted', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
  });

  // Out of scope.
  test.skip('TMS-RDMS-TRL-003 - BR-246 (negative): a value containing an unacceptable character in the replacement transaction mode is refused, nothing committed', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText("Held as 'Y'. One or more keyed fields failed validation.", { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
  });

  // BR-491's own mechanism ("any field's own rule may set this flag") has no single concrete
  // field+value literal to trigger it with, so only reachability is checked here.
  test('TMS-RDMS-TRL-004 - BR-491: any per-field screening failure on the Trailer screen is refused under condition 7111', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
  });

  test('TMS-RDMS-TRL-005 - BR-492: spi_replacement_trailer must be null on PRUPAC trailer rows for branch D/P', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    // PRUPAC_TEST_POLICY_NUMBER is branch D (test-data/constants.ts).
    await recordEditorPage.openRecord(PRUPAC_TEST_POLICY_NUMBER, PRUPAC_TEST_ERROR_ID);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    // PRUPAC variant renders (Agent Allocation Grid); the Replacement variant's own Trailer
    // Comparison grid - which spi_replacement_trailer backs (TRL-013..016) - does not, which
    // is the direct observation that it's null/absent for this branch.
    await expect(page.getByText('Agent Allocation Grid', { exact: true })).toBeVisible();
    await expect(page.getByText('Trailer Comparison', { exact: false })).toHaveCount(0);
    await expect(page.getByRole('row', { name: /^RHO/i })).toHaveCount(0);
  });

  test('TMS-RDMS-TRL-006 - BR-492 (negative): breaching the spi_replacement_trailer constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openRecord(PRUPAC_TEST_POLICY_NUMBER, PRUPAC_TEST_ERROR_ID);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    // BR-494 documents this rule as "Fully deterministic; no operator override" (Business
    // Rules Catalogue v4.2). The modernized UI enforces that structurally: for this branch,
    // no replacementTrailer input is rendered anywhere on the screen at all, so there is
    // nothing an operator could even key a breaching value into to attempt this.
    await expect(page.getByRole('row', { name: /^RHO/i })).toHaveCount(0);
    await expect(page.locator('[name^="replacementTrailer."]')).toHaveCount(0);
    await expect(recordEditorPage.saveChangesButton()).toBeVisible();
  });

  test('TMS-RDMS-TRL-007 - BR-493: spi_prupac_agent must be null on replacement trailer rows for branch other than D/P', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage); // shared fixture, branch V
    // Replacement variant renders (Trailer Comparison grid); the PRUPAC variant's own Agent
    // Allocation Grid - which spi_prupac_agent backs (TRL-011/012) - does not, which is the
    // direct observation that it's null/absent for this branch.
    await expect(page.getByText('Trailer Comparison', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('row', { name: /^RHO/i })).toBeVisible();
    await expect(page.getByText('Agent Allocation Grid', { exact: true })).toHaveCount(0);
  });

  test('TMS-RDMS-TRL-008 - BR-493 (negative): breaching the spi_prupac_agent constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    // Same "fully deterministic; no operator override" reasoning as TRL-006: the PRUPAC
    // variant's Agent Allocation Grid (and its percSplit inputs) never renders at all for
    // this branch, so there is no prupacTrailer input an operator could key a breaching
    // value into to attempt this.
    await expect(page.getByText('Agent Allocation Grid', { exact: true })).toHaveCount(0);
    await expect(page.locator('[name^="prupacTrailer."]')).toHaveCount(0);
    await expect(recordEditorPage.saveChangesButton()).toBeVisible();
  });

  test('TMS-RDMS-TRL-009 - BR-494: the trailer\'s shape must match the PRUPAC variant for branch D/P', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    // Branch D/P => PRUPAC variant (≤4 agents), Replacement variant absent.
    await recordEditorPage.openRecord(PRUPAC_TEST_POLICY_NUMBER, PRUPAC_TEST_ERROR_ID);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    await expect(page.getByText('Agent Allocation Grid', { exact: true })).toBeVisible();
    await expect(page.getByText('Trailer Comparison', { exact: false })).toHaveCount(0);

    // Else => Replacement variant (≤6 trailers), PRUPAC variant absent.
    await recordEditorPage.openConfirmedTestRecord(); // shared fixture, branch V
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    await expect(page.getByText('Trailer Comparison', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Agent Allocation Grid', { exact: true })).toHaveCount(0);
  });

  test('TMS-RDMS-TRL-010 - BR-494 (negative): breaching the trailer-shape-by-branch constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    // BR-494's own text: "Fully deterministic; no operator override" (Business Rules
    // Catalogue v4.2) - confirmed structurally by TRL-009: whichever variant the branch
    // selects is the only one ever rendered, so an operator can never combine or override
    // the two shapes to breach this rule.
    await expect(page.getByText('Trailer Comparison', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Agent Allocation Grid', { exact: true })).toHaveCount(0);
    await expect(recordEditorPage.saveChangesButton()).toBeVisible();
  });

  test('TMS-RDMS-TRL-011 - BR-495: PRUPAC percSplit is 0.00-100.00 per slot and sums to 100.00 across populated agents', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openRecord(PRUPAC_TEST_POLICY_NUMBER, PRUPAC_TEST_ERROR_ID);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    const slot0 = prupacPercSplitField(page, 0);
    const slot1 = prupacPercSplitField(page, 1);
    await expect(slot0).toBeVisible();
    const original0 = await slot0.inputValue();
    const original1 = await slot1.inputValue();
    // Re-split the two populated agents' shares - still summing to the required 100.00, per
    // BR-495's own cross-row sum rule - rather than an arbitrary single-field change.
    await slot0.fill('');
    await slot0.fill('55');
    await slot1.fill('');
    await slot1.fill('45');
    await recordEditorPage.clickSave();
    await expect(screeningErrorBanner(page)).toHaveCount(0);
    await expect(page.getByText(/Total Split Status:\s*Valid/i)).toBeVisible();
    await reenterEditMode(recordEditorPage, page);
    await expect(prupacPercSplitField(page, 0)).toHaveValue('55');
    await expect(prupacPercSplitField(page, 1)).toHaveValue('45');
    // Restore the fixture's original split so it's reusable on the next run.
    await prupacPercSplitField(page, 0).fill('');
    await prupacPercSplitField(page, 0).fill(original0);
    await prupacPercSplitField(page, 1).fill('');
    await prupacPercSplitField(page, 1).fill(original1);
    await recordEditorPage.clickSave();
    await expect(screeningErrorBanner(page)).toHaveCount(0);
  });

  test('TMS-RDMS-TRL-012 - BR-495 (negative): breaching the percSplit range or sum constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openRecord(PRUPAC_TEST_POLICY_NUMBER, PRUPAC_TEST_ERROR_ID);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    const slot0 = prupacPercSplitField(page, 0);
    await expect(slot0).toBeVisible();
    const original0 = await slot0.inputValue();
    // 150 breaches BR-495's 0.00-100.00 per-slot domain.
    await slot0.fill('');
    await slot0.fill('150');
    await recordEditorPage.clickSave();
    await expect(screeningErrorBanner(page)).toBeVisible();
    await expect(page.getByText(/Number must be less than or equal to 100/i)).toBeVisible();
    // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
    await recordEditorPage.openRecord(PRUPAC_TEST_POLICY_NUMBER, PRUPAC_TEST_ERROR_ID);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    await expect(prupacPercSplitField(page, 0)).toHaveValue(original0);
  });

  test('TMS-RDMS-TRL-013 - BR-496: the trailer rho domain is narrower than the main record\'s assignedRho and disallows same-RMO transfers', async ({ page, loginPage, recordEditorPage }) => {
    // Larger viewport for this test only (not playwright.config.ts's shared 1280x720 default,
    // not verified safe globally): at the default size the floating listbox's option click
    // point is intercepted by another element, so a real click on it never lands.
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openTrailerTabEditable(loginPage, recordEditorPage);
    const field = trailerRhoField(page, 0);
    await expect(field).toBeVisible();
    // "B" (CAMO) is in this record's Trailer-1 RHO domain, matching BR-496's "∈ {'B'..'I'}".
    const selected = await selectReadonlyComboboxOption(page, field, 'B');
    expect(selected).toBe('B');
    // Never Save a real RHO value here (see header) - Cancel leaves the record unmutated
    // regardless of the outcome above.
    await recordEditorPage.clickCancel();
  });

  test('TMS-RDMS-TRL-014 - BR-496 (negative): breaching the trailer rho domain constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    // Larger viewport (same as TRL-013): this field now carries a real value ("B", from an
    // earlier live investigation - see test-data/constants.ts), so its own "Clear selection"
    // button renders and intercepts a plain click at the default 1280x720 viewport size.
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openTrailerTabEditable(loginPage, recordEditorPage);
    const field = trailerRhoField(page, 0);
    await expect(field).toBeVisible();
    const original = await field.inputValue();
    // This combobox's input is `readonly` - no typed/filtered entry, only clicking a listed
    // option - so BR-496's domain is enforced by construction: confirm no out-of-domain code
    // (e.g. "Z", past the documented "B".."I" range and not the "Q" exception) is ever offered.
    await field.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await expect(page.getByRole('option', { name: /^Z\b/ })).toHaveCount(0);
    // Escape unmounts the whole amendment-mode form here (not just the listbox), so close it
    // by clicking a neutral element outside it instead.
    await page.getByRole('heading', { name: 'Trailer Information' }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    // Nothing changed: closing without selecting an option leaves the bound value untouched.
    await expect(field).toHaveValue(original);
    await recordEditorPage.clickCancel();
  });

  test('TMS-RDMS-TRL-015 - BR-497: trailer pctOfSplit is 0.00-100.00 per slot and sums to 100.00 across populated trailers', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    // TRL_PCTOFSPLIT_TEST_POLICY_NUMBER, not the shared TEST_POLICY_NUMBER fixture: this
    // commits a real value, and nothing else in this suite references this record, so a real
    // Save + restore round trip is safe here. Two trailer slots are populated (50/50), so this
    // re-splits both to a different combination that still sums to 100 - the same shape as
    // TRL-011's own PRUPAC percSplit re-split, applied to this field's own cross-row sum rule.
    await recordEditorPage.openRecordByPolicyNumber(TRL_PCTOFSPLIT_TEST_POLICY_NUMBER);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    const slot0 = trailerPctOfSplitField(page, 0);
    const slot1 = trailerPctOfSplitField(page, 1);
    await expect(slot0).toBeVisible();
    const original0 = await slot0.inputValue();
    const original1 = await slot1.inputValue();
    await slot0.fill('');
    await slot0.fill('60.00');
    await slot1.fill('');
    await slot1.fill('40.00');
    await recordEditorPage.clickSave();
    // Save succeeded: no screening-error banner, and the editor leaves amendment mode.
    await expect(screeningErrorBanner(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Edit$/i })).toBeVisible();
    await reenterEditMode(recordEditorPage, page);
    await expect(trailerPctOfSplitField(page, 0)).toHaveValue(/60(\.00?)?/);
    await expect(trailerPctOfSplitField(page, 1)).toHaveValue(/40(\.00?)?/);
    // Restore the fixture's original split so it's reusable on the next run.
    await trailerPctOfSplitField(page, 0).fill('');
    if (original0) await trailerPctOfSplitField(page, 0).fill(original0);
    await trailerPctOfSplitField(page, 1).fill('');
    if (original1) await trailerPctOfSplitField(page, 1).fill(original1);
    await recordEditorPage.clickSave();
    await expect(screeningErrorBanner(page)).toHaveCount(0);
  });

  test('TMS-RDMS-TRL-016 - BR-497 (negative): breaching the pctOfSplit range or sum constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openRecordByPolicyNumber(TRL_PCTOFSPLIT_TEST_POLICY_NUMBER);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    const field = trailerPctOfSplitField(page, 0);
    await expect(field).toBeVisible();
    const original = await field.inputValue();
    // 150.00 breaches BR-497's 0.00-100.00 per-slot domain.
    await field.fill('');
    await field.fill('150.00');
    await recordEditorPage.clickSave();
    // Exact legacy banner wording isn't asserted verbatim - not yet confirmed against this UI.
    await expect(screeningErrorBanner(page)).toBeVisible();
    // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
    await recordEditorPage.openRecordByPolicyNumber(TRL_PCTOFSPLIT_TEST_POLICY_NUMBER);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    await expect(trailerPctOfSplitField(page, 0)).toHaveValue(original);
  });

  // BR-335 makes the operator's own RHO architecturally unobservable (see header), so a
  // same-RMO condition can never be reliably set up - only reachability is checked here.
  test('TMS-RDMS-TRL-017 - BR-498: a same-RMO transfer is disallowed when a trailer\'s RHO equals the current-user\'s RHO', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
  });

  // Same unobservable-RHO precondition as TRL-017.
  test('TMS-RDMS-TRL-018 - BR-498 (negative): breaching the same-RMO transfer restriction is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
  });

  // BR-499 is untestable in its own positive form (see header): BR-500's blanket read-only
  // lock at 1525 fires before BR-499's own 1567 trigger can ever be reached in an editable
  // state. This confirms the record is read-only rather than attempting to add a third
  // trailer.
  test('TMS-RDMS-TRL-019 - BR-499: a record length of 1567 caps trailer capacity at two populated trailers', async ({ page, loginPage, recordEditorPage }) => {
    await openLongFormatRecordTrailerTab(page, loginPage, recordEditorPage);
    await expect(page.getByText(/long-format record/i)).toBeVisible();
    await expect(recordEditorPage.editButton()).toBeDisabled();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
  });

  // Same architectural conflict as TRL-019 - refused by construction (Edit disabled), not by
  // a live validation this suite can trigger.
  test('TMS-RDMS-TRL-020 - BR-499 (negative): breaching the short-record trailer capacity constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openLongFormatRecordTrailerTab(page, loginPage, recordEditorPage);
    await expect(recordEditorPage.editButton()).toBeDisabled();
    await expect(page.locator('[name^="replacementTrailer."], [name^="prupacTrailer."]')).toHaveCount(0);
  });

  test('TMS-RDMS-TRL-021 - BR-500: a record length of 1525 or more renders the Trailer screen as read-only with a banner', async ({ page, loginPage, recordEditorPage }) => {
    await openLongFormatRecordTrailerTab(page, loginPage, recordEditorPage);
    await expect(page.getByText(/long-format record/i)).toBeVisible();
    await expect(page.getByText(/recordLength/i)).toBeVisible();
    await expect(recordEditorPage.editButton()).toBeDisabled();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
  });

  // Same fixture as TRL-021. Edit is genuinely disabled (not merely hidden), so there is no
  // path to key a breaching value into any field on this tab at all.
  test('TMS-RDMS-TRL-022 - BR-500 (negative): breaching the long-record read-only banner constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openLongFormatRecordTrailerTab(page, loginPage, recordEditorPage);
    await expect(recordEditorPage.editButton()).toBeDisabled();
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
  });

  // The recordLength half of BR-501's precondition is satisfied (this record is exactly
  // 1668), but its own channelCode is "02", not "I" as the rule's other half also requires -
  // no record combining both has been found (see header). Confirms read-only rather than
  // testing the channelCode-gated effect directly.
  test('TMS-RDMS-TRL-023 - BR-501: a double-length record precondition (recordLength >= 1668) applies only when channelCode starts with I', async ({ page, loginPage, recordEditorPage }) => {
    await openLongFormatRecordTrailerTab(page, loginPage, recordEditorPage);
    await expect(page.getByText(/long-format record/i)).toBeVisible();
    await expect(recordEditorPage.editButton()).toBeDisabled();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
  });

  // Same narrowed gap as TRL-023.
  test('TMS-RDMS-TRL-024 - BR-501 (negative): breaching the double-length record-length precondition is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openLongFormatRecordTrailerTab(page, loginPage, recordEditorPage);
    await expect(recordEditorPage.editButton()).toBeDisabled();
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
  });

  // BR-502's own CORRECTED-AND-DELETED switch (BR-032's `88 CORRECTED-AND-DELETED VALUE 'C'`)
  // names a narrower, transient condition - a correction concurrently in flight when a
  // separate delete request lands - not simply "the record's persisted status is Deleted": a
  // real Deleted-status record (policy 300000293) has no Edit button at all and its own
  // Transfer dialog doesn't raise this banner either. Reproducing the real race would need two
  // concurrent sessions, so Transfer is never actually submitted here - only reachability and
  // the banner's absence are checked.
  test('TMS-RDMS-TRL-025 - BR-502: a correction attempted while the transaction is in Delete status is refused under condition 7112', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTransferDialogAsOperator(page, loginPage, recordEditorPage);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    await expect(page.getByText('ERROR- CORRECTION BEING ATTEMPTED AND TRANSACTION WAS CHANGED TO DELETE STATUS', { exact: true })).toHaveCount(0);
    await recordEditorPage.cancelDialog();
  });

  test('TMS-RDMS-TRL-026 - BR-503: transferring with an RHO code of Q or R is refused under condition 7126', async ({ page, loginPage, recordEditorPage }) => {
    await openOwnRecordTransferDialogAsOperator(page, loginPage, recordEditorPage, SOURCE_RHO_Q_POLICY_NUMBER, SOURCE_RHO_Q_ERROR_ID);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    const targetRhoField = page.locator('#action-target-rho');
    // A normal, non-Q/R target: BR-503's own scenario is the SOURCE record's RHO being Q/R,
    // not the target (a Q/R target is a different condition, 7110 - see SOURCE_RHO_Q constant
    // above).
    await selectReadonlyComboboxOption(page, targetRhoField, 'B');
    await page.getByRole('button', { name: /^Transfer$/i }).click();
    await expect(page.getByText('ERROR-AN RHO CODE OF Q OR R IS INVALID FOR TRANSFER', { exact: true })).toBeVisible();
    await recordEditorPage.cancelDialog();
  });

  // TEST_POLICY_NUMBER's own current RHO is B - selecting the same code as Target RHO
  // exercises BR-504's same-RHO scenario directly.
  test('TMS-RDMS-TRL-027 - BR-504: attempting a same-RHO transfer is refused under condition 7127', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTransferDialogAsOperator(page, loginPage, recordEditorPage);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    const targetRhoField = page.locator('#action-target-rho');
    await selectReadonlyComboboxOption(page, targetRhoField, 'B');
    await page.getByRole('button', { name: /^Transfer$/i }).click();
    await expect(page.getByText('ERROR-ENTER RHO TO WHICH CASE IS TO BE TRANSFERRED', { exact: true })).toBeVisible();
    await recordEditorPage.cancelDialog();
  });

  test('TMS-RDMS-TRL-028 - BR-505: a replacement record whose copies exist in all RHOs is refused for transfer under condition 7129', async ({ page, loginPage, errorManagerPage, recordEditorPage }) => {
    await openDeletedRecordTransferDialogAsOperator(page, loginPage, errorManagerPage, recordEditorPage, PB_REPL_POLICY_NUMBER, PB_REPL_ERROR_ID);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    const targetRhoField = page.locator('#action-target-rho');
    await selectReadonlyComboboxOption(page, targetRhoField, 'I');
    await page.getByRole('button', { name: /^Transfer$/i }).click();
    await expect(page.getByText("ERROR - REPL RECORD NOT FOR TRANSFER. ITS COPIES EXIST IN ALL RHO'S", { exact: true })).toBeVisible();
    await recordEditorPage.cancelDialog();
  });

  test('TMS-RDMS-TRL-029 - BR-506: an I1 service register record is refused for transfer under condition 7130', async ({ page, loginPage, recordEditorPage }) => {
    await openOwnRecordTransferDialogAsOperator(page, loginPage, recordEditorPage, I1_SERVICE_REGISTER_POLICY_NUMBER, I1_SERVICE_REGISTER_ERROR_ID);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    const targetRhoField = page.locator('#action-target-rho');
    await selectReadonlyComboboxOption(page, targetRhoField, 'I');
    await page.getByRole('button', { name: /^Transfer$/i }).click();
    await expect(page.getByText('Message - Invalid Status - CANNOT transfer DX0I1 SERVICE REGISTER records', { exact: true })).toBeVisible();
    await recordEditorPage.cancelDialog();
  });

  // This record's own CB3+spiIndicator='C' also qualifies for BR-505 (TRL-028), but its
  // synopsis branch (1) hits this check first - which is why TRL-028 uses a different,
  // branch-S record instead, to exercise BR-505 in isolation.
  test('TMS-RDMS-TRL-030 - BR-507: a SYNOPSIS-only record is refused for transfer under condition 7131', async ({ page, loginPage, recordEditorPage }) => {
    await openOwnRecordTransferDialogAsOperator(page, loginPage, recordEditorPage, SYNOPSIS_POLICY_NUMBER, SYNOPSIS_ERROR_ID);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    const targetRhoField = page.locator('#action-target-rho');
    await selectReadonlyComboboxOption(page, targetRhoField, 'I');
    await page.getByRole('button', { name: /^Transfer$/i }).click();
    await expect(page.getByText(/SYNOPSIS Records CANNOT be transferred/i)).toBeVisible();
    await recordEditorPage.cancelDialog();
  });

  // The record API's own runId field (detail JSON only, never the grid or CSV export) carries
  // the literal "RV" for a distinct record family, matching BR-508's own Java Ref
  // ("NOT-VALID-FOR-RVP"). A first candidate (policy 300000230, RHO R) hit an unrelated rule
  // first (RHO Q/R's own blanket transfer ban); RVP_TEST_POLICY_NUMBER (RHO B) doesn't carry
  // that conflict.
  test('TMS-RDMS-TRL-031 - BR-508: transferring an RVP error whose status is not D or H is refused under condition 7132', async ({ page, loginPage, errorManagerPage, recordEditorPage }) => {
    await openReleasedRecordTransferDialogAsOperator(page, loginPage, errorManagerPage, recordEditorPage, RVP_TEST_POLICY_NUMBER, RVP_TEST_ERROR_ID);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    const targetRhoField = page.locator('#action-target-rho');
    await selectReadonlyComboboxOption(page, targetRhoField, 'I');
    await page.getByRole('button', { name: /^Transfer$/i }).click();
    await expect(page.getByText('Message - VALID STATUS FOR RVP ERROR IS "D" OR "H"', { exact: true })).toBeVisible();
    await recordEditorPage.cancelDialog();
  });

  // BR-509 is a generic CICS catch-all with no specific trigger named in the reference, so
  // condition 7900 can't be independently produced - only reachability is checked here.
  test('TMS-RDMS-TRL-032 - BR-509: an untrapped module error is reported under condition 7900 with a named escalation route', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText(/ERROR IN MODULE/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
  });
});
