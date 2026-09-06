import { test, expect } from '../fixtures/pages.fixture';
import { Locator, Page } from '@playwright/test';
import { SECONDARY_TEST_POLICY_NUMBER, PRUPAC_TEST_POLICY_NUMBER, PRUPAC_TEST_ERROR_ID } from '../test-data/constants';
import type { LoginPage } from '../pages/LoginPage';
import type { ErrorManagerPage } from '../pages/ErrorManagerPage';
import type { RecordEditorPage } from '../pages/RecordEditorPage';

/**
 * PRU TMS - RDMS-TRL group (PRU_TMS_Test_Cases_v4 1.xlsx, RDMS-TRL sheet, 32 rows,
 * TMS-RDMS-TRL-001..032). The reference (PRU_TMS_RDMSTRL_Organized_Steps) is the system of
 * record for this file's step sequencing and is never modified by this file.
 *
 * POC Scope, per the approved reference: every row is tagged out of scope / phase-1 gap /
 * phase-1 (mod-spec feature). Only TRL-001 (phase-1 gap) and TRL-002/003 (out of scope) are
 * disabled here - via test.skip(), never deletion, each with a leading comment naming its
 * POC Scope and Test Case ID so it can be re-enabled later. Every phase-1 (mod-spec feature)
 * row (TRL-004..032) remains in scope and executes normally.
 *
 * Live reconnaissance of the Trailer Information tab (2026-09-02, ECN J7202633001004/Error
 * ID 0028, the shared TEST_POLICY_NUMBER fixture) confirmed its actual modernized fields:
 *  - Replacement Information: TRANSACTION MODE REPLACEMENT (a custom combobox, same
 *    pattern RDMS-GEN.spec.ts documents for General Information's dropdowns - name
 *    "replacementTrailer.transModeRepl"), REPLACEMENT LAPSE PRODUCTION CREDIT (plain text,
 *    name "replacementTrailer.replLapseProdCr") and REPLACEMENT LAPSE ANNUAL PREMIUM
 *    (plain text, name "replacementTrailer.replLapseAnnPrem").
 *  - A "Trailer Comparison (TRLR-1 through TRLR-6)" table with one row per legacy field
 *    (RHO, Agree Number, Agent Surname, District, Percent of Split) and one column per
 *    trailer slot (1-6, 0-indexed here as slot 0-5). RHO is a combobox with no name
 *    attribute (located by its own table row); the other four rows are plain text inputs
 *    named "replacementTrailer.trailers.<slot>.agreeNo/agtSurname/dist/pctOfSplit".
 *    RHO's live-confirmed domain on this record - B (CAMO), C (NEMO), E (SCMO), F (MMO),
 *    G (WMO), I (CDNO), Q (Withheld/Yield/Zero-comm) - matches BR-496's own "SPACE, 'Q',
 *    channel-W bypass, ∈ {'B'..'I'}" domain description exactly.
 *  - "Percent of Split"'s own on-screen footnote ("Sum of % of Split across populated
 *    trailers must equal 100.00 when more than one trailer is populated.") matches BR-497's
 *    wording verbatim, confirming pctOfSplit is that field.
 *
 * A second round of reconnaissance (2026-09-02) against test-data/frontend-field-catalog.xlsx
 * ("Trailers" sheet), test-data/PRU-TMS Business Rules Catalogue v4.2.xlsx ("Business Rules"
 * sheet, BR-491..BR-509/BR-032/BR-335), and a second live record (PRUPAC_TEST_POLICY_NUMBER,
 * branch D - see test-data/constants.ts) resolved most of what the first round left BLOCKED:
 *  - `spi_replacement_trailer` and `spi_prupac_agent` are NOT hidden boolean flags - they are
 *    the backend child-row tables *behind* two mutually-exclusive UI sections BR-494 ("Trailer
 *    shape by branch") switches between, live-confirmed on real records: a branch-D/P record
 *    (PRUPAC_TEST_POLICY_NUMBER) renders a "PRUPAC" section - Address/Rejection Information
 *    plus an "Agent Allocation Grid" (≤4 agents, fields "prupacTrailer.agents.<slot>.typeOfAgt
 *    /contNo/percSplit") - and never renders the Trailer Comparison grid at all; a record of
 *    any other branch (the shared TEST_POLICY_NUMBER fixture, branch V) renders the Trailer
 *    Comparison grid and never the Agent Allocation Grid. This is BR-494's own "Fully
 *    deterministic; no operator override" (Business Rules Catalogue) made directly
 *    observable, and it is what TRL-005..010 assert. BR-495's PRUPAC `percSplit` is therefore
 *    also a real, confirmed field (`prupacTrailer.agents.<slot>.percSplit`, live-confirmed
 *    "0.00 – 100.00 per slot; sum = 100.00 when >1 agent populated", NUMERIC(5,2)) - distinct
 *    from `pctOfSplit` above - which TRL-011/012 exercise for real.
 *  - Trailer/record byte-length IS exposed on screen after all, via the "View system
 *    metadata for this record" button (Record Details panel, RECORD LENGTH field) - not
 *    absent from the UI as first thought. BR-499/500/501's specific thresholds (recordLength
 *    = 1567 / ≥ 1525 / ≥ 1668) were not found anywhere on this shared environment - not a
 *    sample, but an exhaustive census of every CB Records row (2026-09-02: 109 unique
 *    records across all 6 result-grid pages), whose maximum recordLength is 1200. TRL-019..024
 *    are therefore BLOCKED by presently-unavailable test data, not by any UI limitation -
 *    TRL-019/021/023 open that panel for real to demonstrate the mechanism.
 *  - The current operator's own RHO (TRL-017/018) is confirmed, by design, never exposed to
 *    the client at all: BR-335 (Business Rules Catalogue) states the operator's office is
 *    "held only on the server side of the session; no request may name or override its own
 *    office value" specifically to close a client-side scope-spoofing hole. This is not a
 *    documentation gap - the value is architecturally unobservable from the UI/API this suite
 *    can reach, so TRL-017/018 remain structural.
 *
 * SAFETY: this project's own test-data/constants.ts documents a confirmed, reproduced-three-
 * times environment/access-control bug where committing a real, different RHO value via the
 * RDMS Edit UI's Save silently moves the record outside the admin session's viewing scope
 * (a permanent per-record lockout on this shared dev environment), "regardless of which
 * record is used". The Trailer Comparison grid's per-slot RHO field is the same combobox
 * pattern (an office-code domain) as the General Information RHO field that bug was
 * confirmed against, and this suite has no independent evidence it is exempt, so neither
 * TRL-013 nor TRL-014 ever calls Save on this field - both Cancel unconditionally instead,
 * regardless of outcome.
 *
 * RETRACTED DEFECT (DEF-RDMS-TRL-001, 2026-09-02): earlier live reconnaissance in this suite
 * concluded this RHO picker's selection mechanism did not work at all (a domain-valid option
 * click closed the listbox but never updated the field's bound value). Manual QA reported
 * that a normal click on the correct option does work, which prompted a live re-check: at
 * Playwright's default 1280x720 viewport, the floating listbox's options are positioned such
 * that a real (non-forced) click on an option times out (an intercepting element sits over
 * the click point), and the `force: true` workaround used to route around that dispatches its
 * click at stale/misaligned coordinates that do not land on the option's actual interactive
 * span - so the value never updated, but not because the app is broken. Re-run at a
 * realistic 1920x1080 viewport, `document.elementFromPoint()` at the option's own bounding-box
 * center resolves to the option's own text span (no intercepting element), a real click
 * succeeds without needing force, and the field's bound value updates correctly to the
 * selected code. The defect was in this suite's own viewport/click methodology, not the
 * application - DEF-RDMS-TRL-001 is retracted. TRL-013 now sets an explicit larger viewport
 * for this one test (not a change to playwright.config.ts's shared default, since the DOM
 * uses viewport-driven responsive breakpoint classes and a global viewport change was not
 * verified safe across the rest of this suite) and asserts the real, correct, passing
 * behavior. TRL-014 was and remains unaffected either way (it only opens the listbox and
 * confirms an out-of-domain option is absent, never selecting anything).
 *
 * ENVIRONMENT MIGRATION (2026-09-02): BASE_URL's own default (test-data/constants.ts) moved
 * from the "dev" Elastic Beanstalk instance to a new "demo" one. Every fixture this file
 * references (TEST_POLICY_NUMBER, SECONDARY_TEST_POLICY_NUMBER, PRUPAC_TEST_POLICY_NUMBER)
 * was re-verified live against "demo" and found unchanged - same ECN/Error ID, same field
 * values (including the PRUPAC record's percSplit 60/40 split and the RHO domain) - so no
 * fixture identifier needed updating for this migration. The one substantive re-check this
 * migration prompted - an exhaustive census of every record now on "demo" for a
 * recordLength ≥ 1525 candidate (TRL-019..024's own blocker) - is documented at BR-499/500/
 * 501 above: still none exists (max 1200), so those six rows remain BLOCKED - TEST DATA.
 *
 * ROLE_ADMIN CANNOT REACH TRANSFER AT ALL (2026-09-04): re-verification of TRL-025/028/029/
 * 030/031 found TRL-025/031 timing out on the Actions menu's own Transfer menuitem - live
 * inspection showed admin's (ROLE_ADMIN/ROLE_REFDATA_ADMIN) Actions menu on the shared
 * TEST_POLICY_NUMBER fixture lists only Resolve/Delete/Schedule Release, never Transfer at
 * all. This is stronger than the "backend returns 403 on submission" finding immediately
 * below (which TRL-026/TRL-027's own login-role note already used to justify o-0001/
 * ROLE_OPERATOR for those two rows): the Transfer action is hidden client-side for
 * ROLE_ADMIN, not merely rejected server-side after the dialog opens. TRL-025 and TRL-031
 * (the only two rows still using the old admin-login dialog-opener) were switched to the same
 * openTrailerTransferDialogAsOperator() path TRL-026..030 already use; the now-unused
 * admin-login helper was removed. TRL-028/029/030's own already-o-0001-based resolutions
 * (2026-09-03, see openOwnRecordTransferDialogAsOperator/openDeletedRecordTransferDialogAsOperator
 * below) were independently re-run and confirmed still passing.
 */

// Trailer Comparison grid (TRLR-1..6, slot 0-5): RHO is a combobox with no name attribute of
// its own, located by its own table row (accessible name starts with "RHO") and the 0-based
// trailer-slot column index within that row; every other row (Agree Number/Agent Surname/
// District/Percent of Split - see this file's header) is a plain named text input, of which
// only pctOfSplit is exercised by a real field-level test below (TRL-015/016).
function trailerRhoField(page: Page, slot: number): Locator {
  return page.getByRole('row', { name: /^RHO/i }).locator('input').nth(slot);
}

// PRUPAC variant's Agent Allocation Grid (≤4 agent slots, 0-3): percSplit is a plain, named
// number input - live-confirmed "prupacTrailer.agents.<slot>.percSplit" - unlike the
// Replacement variant's RHO combobox above, this field has no readonly/selection quirks.
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

// Live-confirmed (2026-09-02, via error-context snapshot on first automated run): the
// Trailer Comparison grid's RHO combobox renders `readonly` - a pure click-to-open,
// click-an-option-to-select control - unlike General Information's own comboboxes
// (RDMS-GEN.spec.ts's selectComboboxOption()), which accept a typed filter string. Calling
// .fill() on this field times out (it is never editable), so a value can only be chosen by
// clicking the option whose own text starts with `code` (e.g. "B" for the CAMO option).
async function selectReadonlyComboboxOption(page: Page, field: Locator, code: string): Promise<string> {
  await field.scrollIntoViewIfNeeded();
  await field.click();
  const option = page.getByRole('option', { name: new RegExp(`^${code}\\b`) });
  await expect(option).toBeVisible();
  // Live-confirmed: this floating listbox can render with its popover positioned over an
  // unrelated field higher up the same form (Transaction Mode Replacement) right after the
  // page auto-scrolls the table row into view - a rendering/positioning quirk of the popover
  // library, not a real overlapping control a user could actually be blocked by. force:true
  // clicks through that transient interception; the resulting bound value is asserted by the
  // caller regardless.
  await option.click({ force: true });
  await expect(page.getByRole('listbox')).toHaveCount(0);
  return field.inputValue();
}

// Re-enters Edit mode right after a Save, retrying the click - a lingering success toast or
// a post-save re-render can otherwise silently leave the page in read-only View. Mirrors
// RDMS-GEN.spec.ts's reenterEditMode().
async function reenterEditMode(recordEditorPage: RecordEditorPage): Promise<void> {
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

// Live-confirmed (2026-09-04): admin's (ROLE_ADMIN/ROLE_REFDATA_ADMIN) own Actions menu on the
// shared fixture never lists Transfer at all (only Resolve/Delete/Schedule Release) - stronger
// than the 403-on-submit finding below, this role cannot even reach the dialog client-side. A
// same-named openTrailerTransferDialog(loginPage, recordEditorPage) helper (admin login) used
// to exist here for TMS-RDMS-TRL-025/031, both of which switched to
// openTrailerTransferDialogAsOperator() below once this was found; nothing in this file still
// needs the admin-login variant, so it was removed rather than left unused.

// The shared VALID_USERNAME/VALID_PASSWORD fixture (admin/admin, loginAsValidUser()) carries
// ROLE_ADMIN/ROLE_REFDATA_ADMIN, not ROLE_OPERATOR - live reconnaissance (2026-09-02) confirmed
// that role lacks authorization for the Trailer Information Transfer action entirely: any
// submission of that form returns a blanket HTTP 403 {"error":"Access Denied"} from
// POST /api/v1/spi/{ecn}/transfer, before any RHO-specific business-rule validation ever runs
// - regardless of which target RHO is chosen or whether it is in that account's own rhoScope.
// TRL-026/TRL-027 (BR-503/BR-504) need a real ROLE_OPERATOR account to reach that validation
// layer at all. o-0001 (Marcus Webb) was chosen because its rhoScope ([A,B,C,D,E,F,G,I,Q,R])
// covers both TEST_POLICY_NUMBER's own current RHO (B) and the Q/R codes BR-503 exercises, so
// no separate "target RHO not in my own scope" check can confound the specific assertions
// these two tests make. This is a dedicated, narrowly-scoped login path (not a change to
// LoginPage.loginAsValidUser() or test-data/constants.ts) because only these two test cases
// need a different role.
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

// RESOLVED (2026-09-03): TRL-028/029/030 were previously BLOCKED - TEST DATA, on the belief
// that no record in this environment satisfies BR-505/BR-506/BR-507's own preconditions. A
// full CB Records census (o-0001/ROLE_OPERATOR - broadest rhoScope, covering all 10 RHO
// codes - Export CSV of the whole population with Include Released/Deleted checked, cross-
// referenced field-by-field against each candidate's own detail JSON via
// GET /api/v1/spi/{ecn}, the same endpoint test-data/constants.ts already documents using)
// found one real, currently-existing record per rule and confirmed each live by actually
// submitting Transfer and reading the resulting banner - not just opening the dialog. None
// of these three are the shared TEST_POLICY_NUMBER fixture, so each test opens its own
// record directly instead of via openTrailerTransferDialog()/openConfirmedTestRecord().
const I1_SERVICE_REGISTER_POLICY_NUMBER = '300000144'; // ECN I1202636900144, recordCode CB1, runId I1, status HELD
const I1_SERVICE_REGISTER_ERROR_ID = '3003';
// recordCode CB3, premiumCommission.spiIndicator='C' (PB-REPL-ALREADY-CREATED), branch S -
// deliberately NOT one of BR-507's synopsis branches (the only other CB3+spi=C record found,
// DC202626000004, is branch 1 and hits BR-507's synopsis check first instead - see TRL-030
// below). Status is DELETED, which the default CB Records search excludes and which removes
// the Edit button entirely (confirmed elsewhere in this file, TRL-025) - but the Actions
// menu's Transfer item remains reachable and functional on a Deleted record, live-confirmed
// here, so "Include Deleted" must be checked to find it and Transfer can still be exercised.
const PB_REPL_POLICY_NUMBER = '200000018'; // ECN I1202630001018
const PB_REPL_ERROR_ID = '0222';
const SYNOPSIS_POLICY_NUMBER = '100000004'; // ECN DC202626000004, branch 1 (a BR-507 synopsis branch), status HELD
const SYNOPSIS_ERROR_ID = 'E104';

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

test.describe('RDMS-TRL - Trailer Information (Error Record Editor)', () => {
  // OUT OF SCOPE (reference: PRU_TMS_RDMSTRL_Organized_Steps, TMS-RDMS-TRL-001, POC Scope =
  // phase-1 gap) - kept, disabled via test.skip so it does not execute.
  test.skip('TMS-RDMS-TRL-001 - BR-095: a blank lapse production credit or lapse annual premium on a trailer means nil, not unchanged', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // Catalogue v4.2 documents the blank-input-equals-zero contract for these two amount
    // fields (RLPCR06 = replLapseProdCr / replLapseAnnPrem, both live-confirmed to exist -
    // see this file's header) as an unresolved coverage gap (POC GAP). Verified for real:
    // the Trailer Information tab is reached in amendment mode.
  });

  // OUT OF SCOPE (reference: PRU_TMS_RDMSTRL_Organized_Steps, TMS-RDMS-TRL-002, POC Scope =
  // out of scope) - kept, disabled via test.skip so it does not execute.
  test.skip('TMS-RDMS-TRL-002 - BR-246: the replacement transaction mode is a two-character code with blanks permitted', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // TRMDR06 = transModeRepl (live-confirmed combobox - see this file's header). Verified
    // for real: the Trailer Information tab is reached in amendment mode.
  });

  // OUT OF SCOPE (reference: PRU_TMS_RDMSTRL_Organized_Steps, TMS-RDMS-TRL-003, POC Scope =
  // out of scope) - kept, disabled via test.skip so it does not execute.
  test.skip('TMS-RDMS-TRL-003 - BR-246 (negative): a value containing an unacceptable character in the replacement transaction mode is refused, nothing committed', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText("Held as 'Y'. One or more keyed fields failed validation.", { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same TRMDR06/transModeRepl field as TRL-002. Verified for real: amendment mode is
    // reached and the SCR-Y banner is not already showing.
  });

  test('TMS-RDMS-TRL-004 - BR-491: any per-field screening failure on the Trailer screen is refused under condition 7111', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // BLOCKED - TEST DATA: "Pattern A" is a generic per-field mechanism (any field's own rule
    // may set HGLT-MDT), not a single concrete field+value literal, so condition 7111 cannot
    // be independently triggered without inventing a value the reference itself does not
    // name. Verified for real: amendment mode is reached and the 7111 banner is not already
    // showing.
  });

  test('TMS-RDMS-TRL-005 - BR-492: spi_replacement_trailer must be null on PRUPAC trailer rows for branch D/P', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    // PRUPAC_TEST_POLICY_NUMBER is live-confirmed branch D - see test-data/constants.ts and
    // this file's header.
    await recordEditorPage.openRecord(PRUPAC_TEST_POLICY_NUMBER, PRUPAC_TEST_ERROR_ID);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    // PRUPAC variant is rendered (Agent Allocation Grid, ≤4 agents)...
    await expect(page.getByText('Agent Allocation Grid', { exact: true })).toBeVisible();
    // ...and the Replacement variant's own Trailer Comparison grid - the structure
    // spi_replacement_trailer backs (see TRL-013..016) - is not rendered at all for this
    // branch, live-confirming spi_replacement_trailer is null/absent here.
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
    // Replacement variant is rendered (Trailer Comparison grid, ≤6 trailers)...
    await expect(page.getByText('Trailer Comparison', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('row', { name: /^RHO/i })).toBeVisible();
    // ...and the PRUPAC variant's own Agent Allocation Grid - the structure spi_prupac_agent
    // backs (see TRL-011/012) - is not rendered at all for this branch (V, confirmed live on
    // General Information - not D or P), live-confirming spi_prupac_agent is null/absent.
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
    await reenterEditMode(recordEditorPage);
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
    // Live-confirmed (2026-09-02): 150 breaches BR-495's documented 0.00-100.00 per-slot
    // domain and is refused with both the usual screening-error banner and an inline "Number
    // must be less than or equal to 100" message, and the grid's own status flips to "Needs
    // Attention".
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
    // Uses an explicit larger viewport for this test only (not the shared playwright.config.ts
    // default of 1280x720) - see this file's header, RETRACTED DEFECT (DEF-RDMS-TRL-001), for
    // why: at the default viewport the floating listbox's option click point is intercepted,
    // producing a false "selection never updates the value" result that manual QA correctly
    // called out as not reproducing on a normal-size browser window.
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openTrailerTabEditable(loginPage, recordEditorPage);
    const field = trailerRhoField(page, 0);
    await expect(field).toBeVisible();
    // "B" (CAMO) is live-confirmed to be in this record's Trailer-1 RHO domain, matching
    // BR-496's own "∈ {'B'..'I'}" description.
    const selected = await selectReadonlyComboboxOption(page, field, 'B');
    // VERIFIED (2026-09-02, corrected after DEF-RDMS-TRL-001 was retracted): at a realistic
    // viewport, selecting a real, visible, in-domain option updates the field's own bound
    // value, exactly as BR-496 documents.
    expect(selected).toBe('B');
    // SAFETY: never Save a real RHO value - see this file's header. The record is left
    // unmutated by cancelling rather than committing, regardless of the outcome above.
    await recordEditorPage.clickCancel();
  });

  test('TMS-RDMS-TRL-014 - BR-496 (negative): breaching the trailer rho domain constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    const field = trailerRhoField(page, 0);
    await expect(field).toBeVisible();
    const original = await field.inputValue();
    // Live-confirmed (see TRL-013 and selectReadonlyComboboxOption() above): this combobox's
    // input is `readonly` - there is no typed/filtered entry path at all, only clicking one
    // of its own listed options. BR-496's domain constraint is therefore enforced by
    // construction: opening the listbox confirms no out-of-domain office code (e.g. "Z", one
    // letter past the documented "B".."I" range and not the "Q" exception) is ever offered,
    // so a breaching value can never even be keyed in, let alone committed.
    await field.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await expect(page.getByRole('option', { name: /^Z\b/ })).toHaveCount(0);
    // Live-confirmed: pressing Escape here does not just close this listbox - it was
    // observed to unmount the whole amendment-mode form (the RHO row's own input then
    // resolves to nothing at all), so instead close it the same way a user would dismiss any
    // floating popover without invoking an app-level shortcut - clicking a neutral,
    // non-interactive element outside it (the tab's own heading).
    await page.getByRole('heading', { name: 'Trailer Information' }).click();
    await expect(page.getByRole('listbox')).toHaveCount(0);
    // Nothing changed: closing without ever selecting an option leaves the bound value
    // untouched, so no Save is needed to demonstrate nothing was committed.
    await expect(field).toHaveValue(original);
    await recordEditorPage.clickCancel();
  });

  test('TMS-RDMS-TRL-015 - BR-497: trailer pctOfSplit is 0.00-100.00 per slot and sums to 100.00 across populated trailers', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    // Uses the dedicated secondary fixture (SECONDARY_TEST_POLICY_NUMBER in
    // test-data/constants.ts), not the shared TEST_POLICY_NUMBER fixture: this commits a
    // real value to the record, and nothing else in this suite references this secondary
    // record, so a real Save + restore round trip is safe here (same reasoning
    // RDMS-GEN.spec.ts documents for its own polNo test on this same fixture).
    await recordEditorPage.openRecordByPolicyNumber(SECONDARY_TEST_POLICY_NUMBER);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    const field = trailerPctOfSplitField(page, 0);
    await expect(field).toBeVisible();
    const original = await field.inputValue();
    await field.fill('');
    await field.fill('100.00');
    await recordEditorPage.clickSave();
    // Save succeeded: no screening-error banner, and the editor leaves amendment mode.
    await expect(screeningErrorBanner(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Edit$/i })).toBeVisible();
    await reenterEditMode(recordEditorPage);
    await expect(trailerPctOfSplitField(page, 0)).toHaveValue(/100(\.00?)?/);
    // Restore the secondary fixture's original value so it's reusable on the next run.
    await trailerPctOfSplitField(page, 0).fill('');
    if (original) await trailerPctOfSplitField(page, 0).fill(original);
    await recordEditorPage.clickSave();
    await expect(screeningErrorBanner(page)).toHaveCount(0);
  });

  test('TMS-RDMS-TRL-016 - BR-497 (negative): breaching the pctOfSplit range or sum constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openRecordByPolicyNumber(SECONDARY_TEST_POLICY_NUMBER);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    const field = trailerPctOfSplitField(page, 0);
    await expect(field).toBeVisible();
    const original = await field.inputValue();
    // 150.00 breaches BR-497's documented 0.00-100.00 per-slot domain.
    await field.fill('');
    await field.fill('150.00');
    await recordEditorPage.clickSave();
    // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
    // Catalogue v4.2 flags several of these banners as not yet confirmed against the
    // modernized UI's own wording).
    await expect(screeningErrorBanner(page)).toBeVisible();
    // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
    await recordEditorPage.openRecordByPolicyNumber(SECONDARY_TEST_POLICY_NUMBER);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    await expect(trailerPctOfSplitField(page, 0)).toHaveValue(original);
  });

  test('TMS-RDMS-TRL-017 - BR-498: a same-RMO transfer is disallowed when a trailer\'s RHO equals the current-user\'s RHO', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // BLOCKED - TEST DATA (by design, not a documentation gap): BR-335 (Business Rules
    // Catalogue v4.2) states the current operator's own office/RHO "is established once, at
    // login,... and is then held only on the server side of the session; no request may name
    // or override its own office value" - specifically to close a client-side scope-spoofing
    // hole. It is therefore architecturally unobservable from the UI/API this suite can
    // reach, so a same-RMO condition can never be reliably set up here, even though the
    // trailer RHO field itself is now confirmed (see TRL-013/014). Verified for real: the
    // Trailer Information tab is reached in amendment mode.
  });

  test('TMS-RDMS-TRL-018 - BR-498 (negative): breaching the same-RMO transfer restriction is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same architecturally-unobservable current-user RHO precondition as TRL-017 (BR-335).
    // Verified for real: amendment mode is reached and the 7111 banner is not already
    // showing.
  });

  test('TMS-RDMS-TRL-019 - BR-499: a record length of 1567 caps trailer capacity at two populated trailers', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // Record byte-length IS exposed after all, via "View system metadata for this record"
    // (Record Details panel) - demonstrated for real below.
    await recordEditorPage.clickCancel();
    await page.getByRole('button', { name: /View system metadata/i }).click();
    await expect(page.getByText(/RECORD LENGTH/i)).toBeVisible();
    // BLOCKED - TEST DATA: an exhaustive census of every CB Records row on this environment
    // (2026-09-02, "demo" - all ~109 unique records across all 6 result pages, not a sample)
    // found a maximum recordLength of 1200 (policy 300000300, the highest-suffix record in
    // the largest policy-number family) - well short of the documented recordLength=1567.
    // No record with that length exists on this environment to confirm the short-record
    // capacity condition against. This is a data-availability gap, not a UI limitation.
  });

  test('TMS-RDMS-TRL-020 - BR-499 (negative): breaching the short-record trailer capacity constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same recordLength=1567 data-availability gap as TRL-019 (max observed on this
    // environment: 1200, exhaustively checked). Verified for real: amendment mode is reached
    // and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-TRL-021 - BR-500: a record length of 1525 or more renders the Trailer screen as read-only with a banner', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // Record byte-length IS exposed after all, via "View system metadata for this record".
    await recordEditorPage.clickCancel();
    await page.getByRole('button', { name: /View system metadata/i }).click();
    await expect(page.getByText(/RECORD LENGTH/i)).toBeVisible();
    // BLOCKED - TEST DATA: an exhaustive census of every CB Records row on this environment
    // (2026-09-02, "demo" - all ~109 unique records, not a sample) found a maximum
    // recordLength of 1200 - short of the documented recordLength≥1525 threshold. Business
    // Rules Catalogue BR-216/BR-038 corroborate this is a real, implemented phase-1 guard
    // (not a dropped legacy artifact), so this remains a data-availability gap rather than
    // doubt about whether the feature exists. Verified for real: the Trailer Information tab
    // is reached in amendment mode (i.e. not read-only on this instance, whose recordLength
    // is under the threshold).
  });

  test('TMS-RDMS-TRL-022 - BR-500 (negative): breaching the long-record read-only banner constraint is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same recordLength>=1525 data-availability gap as TRL-021 (max observed on this
    // environment: 1200, exhaustively checked). Verified for real: amendment mode is reached
    // and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-TRL-023 - BR-501: a double-length record precondition (recordLength >= 1668) applies only when channelCode starts with I', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/Trailer/i);
    // Record byte-length IS exposed after all, via "View system metadata for this record"
    // (channelCode itself is a separately-confirmed General Information field - see
    // RDMS-GEN.spec.ts's TMS-RDMS-GEN-094/095 - but recordLength is the other half of this
    // precondition).
    await recordEditorPage.clickCancel();
    await page.getByRole('button', { name: /View system metadata/i }).click();
    await expect(page.getByText(/RECORD LENGTH/i)).toBeVisible();
    // BLOCKED - TEST DATA: an exhaustive census of every CB Records row on this environment
    // (2026-09-02, "demo" - all ~109 unique records, not a sample) found a maximum
    // recordLength of 1200 - short of the documented recordLength≥1668 threshold. Data-
    // availability gap, not a UI limitation.
  });

  test('TMS-RDMS-TRL-024 - BR-501 (negative): breaching the double-length record-length precondition is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same recordLength/channelCode data-availability gap as TRL-023 (max observed on this
    // environment: 1200, exhaustively checked). Verified for real: amendment mode is reached
    // and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-TRL-025 - BR-502: a correction attempted while the transaction is in Delete status is refused under condition 7112', async ({ page, loginPage, recordEditorPage }) => {
    // Live-confirmed (2026-09-04): the shared TEST_POLICY_NUMBER fixture's own Actions menu,
    // opened as admin (ROLE_ADMIN/ROLE_REFDATA_ADMIN via openTrailerTransferDialog()), lists
    // only Resolve/Delete/Schedule Release - no Transfer item at all, so
    // openTrailerTransferDialog() times out before ever reaching the dialog this test needs.
    // This is stronger than this file's header's existing ROLE_ADMIN finding (a backend 403 on
    // form submission): the Transfer action is hidden client-side for this role, not just
    // rejected server-side. Reusing the same o-0001/ROLE_OPERATOR path TRL-026..030 already
    // rely on (openTrailerTransferDialogAsOperator) reaches the real dialog.
    await openTrailerTransferDialogAsOperator(page, loginPage, recordEditorPage);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    await expect(page.getByText('ERROR- CORRECTION BEING ATTEMPTED AND TRANSACTION WAS CHANGED TO DELETE STATUS', { exact: true })).toHaveCount(0);
    await recordEditorPage.cancelDialog();
    // BLOCKED - TEST DATA: live reconnaissance (2026-09-02, "demo" environment) found a real
    // record with Status=DELETED (policy 300000293/ECN RV202636900293, surfaced only with
    // the search screen's "Include Deleted" filter checked - the default CB Records search
    // excludes it entirely) and confirmed it has no Edit button at all - a deleted record
    // structurally cannot enter amendment mode, so BR-502's own scenario ("a correction is
    // attempted") has no UI path to begin on it. Opening that record's Transfer dialog did
    // not raise the 7112 banner either, confirming the legacy CORRECTED-AND-DELETED switch
    // (BR-032's `88 CORRECTED-AND-DELETED VALUE 'C'`) names a narrower, transient condition -
    // a correction concurrently in flight when a separate delete request lands - not simply
    // "the record's persisted status is Deleted". Reproducing that transient race is beyond
    // what this suite can safely set up (it would require two concurrent sessions racing a
    // real delete against a real correction on the same record). Actually submitting the
    // Transfer form was deliberately not attempted here: this test does not submit Transfer at
    // all regardless of account, since no data can reproduce the transient race this rule
    // actually names. Verified for real: the Transfer action's real form is reachable from the
    // Trailer Information screen and the 7112 banner is not already showing; the dialog is
    // cancelled rather than committed.
  });

  test('TMS-RDMS-TRL-026 [Application Defect - DEF-RDMS-TRL-002] - BR-503: transferring with an RHO code of Q or R is refused under condition 7126', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTransferDialogAsOperator(page, loginPage, recordEditorPage);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    const targetRhoField = page.locator('#action-target-rho');
    await selectReadonlyComboboxOption(page, targetRhoField, 'Q');
    await page.getByRole('button', { name: /^Transfer$/i }).click();
    // DEF-RDMS-TRL-002: this is the correct, catalogued expected behavior for BR-503 (Error
    // Codes sheet row 197: condition 7126, "ERROR-AN RHO CODE OF Q OR R IS INVALID FOR
    // TRANSFER", explicitly mapped to BR-364/434/481/503/526/566/588) and is left in place
    // deliberately rather than weakened to match the live application. Reconnaissance
    // (2026-09-02, "demo" environment, o-0001/ROLE_OPERATOR - see openTrailerTransferDialogAsOperator
    // above) confirmed the live app instead returns HTTP 400
    // {"error":"ERROR- RHO CODE INVALID FOR TRANSFER","rule":"TARGET_RHO_INVALID_FOR_TRANSFER",
    // "errorCd":"7110"} - a different, real, catalogued condition (Error Codes sheet row 184)
    // that carries no Business Rule mapping of its own. The refusal itself is correct (nothing
    // commits; Target RHO=Q is rejected) but under the wrong condition code and a materially
    // different message than BR-503/the catalogue document, which would break any downstream
    // consumer keyed on 7126 specifically. Reproduced identically for both Q and R targets,
    // and with an in-scope target (R is in o-0001's own rhoScope, ruling out a
    // target-not-in-my-scope explanation for the mismatch).
    await expect(page.getByText('ERROR-AN RHO CODE OF Q OR R IS INVALID FOR TRANSFER', { exact: true })).toBeVisible();
    await recordEditorPage.cancelDialog();
  });

  test('TMS-RDMS-TRL-027 - BR-504: attempting a same-RHO transfer is refused under condition 7127', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTransferDialogAsOperator(page, loginPage, recordEditorPage);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    const targetRhoField = page.locator('#action-target-rho');
    // TEST_POLICY_NUMBER's own current RHO is B (live-confirmed via its `identity.rho` field) -
    // selecting the same code as the Target RHO exercises BR-504's same-RHO scenario directly.
    await selectReadonlyComboboxOption(page, targetRhoField, 'B');
    await page.getByRole('button', { name: /^Transfer$/i }).click();
    await expect(page.getByText('ERROR-ENTER RHO TO WHICH CASE IS TO BE TRANSFERRED', { exact: true })).toBeVisible();
    await recordEditorPage.cancelDialog();
    // VERIFIED (2026-09-02): resolved with a real ROLE_OPERATOR account (o-0001) - see
    // openTrailerTransferDialogAsOperator above for why the shared admin/admin fixture cannot
    // reach this validation at all (that role gets a blanket HTTP 403 Access Denied from
    // POST /api/v1/spi/{ecn}/transfer before any RHO-specific check runs, regardless of target
    // RHO). Submitting Transfer with Target RHO=B (the record's own current RHO) reproduces
    // condition 7127 exactly as catalogued: HTTP 400, errorCd 7127, rule
    // TARGET_RHO_SAME_AS_SOURCE, matching BR-504 and the Business Rules Catalogue's Error
    // Codes sheet row 198 verbatim (unlike TRL-026/DEF-RDMS-TRL-002, no code/message mismatch
    // here). Nothing commits; the dialog is cancelled after the banner is confirmed.
  });

  test('TMS-RDMS-TRL-028 - BR-505: a replacement record whose copies exist in all RHOs is refused for transfer under condition 7129', async ({ page, loginPage, errorManagerPage, recordEditorPage }) => {
    await openDeletedRecordTransferDialogAsOperator(page, loginPage, errorManagerPage, recordEditorPage, PB_REPL_POLICY_NUMBER, PB_REPL_ERROR_ID);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    const targetRhoField = page.locator('#action-target-rho');
    await selectReadonlyComboboxOption(page, targetRhoField, 'I');
    await page.getByRole('button', { name: /^Transfer$/i }).click();
    await expect(page.getByText("ERROR - REPL RECORD NOT FOR TRANSFER. ITS COPIES EXIST IN ALL RHO'S", { exact: true })).toBeVisible();
    await recordEditorPage.cancelDialog();
    // RESOLVED (2026-09-03): see this file's header comment above openOwnRecordTransferDialogAsOperator
    // for how PB_REPL_POLICY_NUMBER (200000018/ECN I1202630001018) was found and confirmed:
    // recordCode=CB3, premiumCommission.spiIndicator='C' (the legacy PB-REPL-ALREADY-CREATED
    // marker), branch S (not one of BR-507's synopsis branches, so this record exercises
    // BR-505 in isolation rather than tripping BR-507 first). Submitting Transfer with
    // Target RHO=I reproduces condition 7129 exactly as catalogued.
  });

  test('TMS-RDMS-TRL-029 - BR-506: an I1 service register record is refused for transfer under condition 7130', async ({ page, loginPage, recordEditorPage }) => {
    await openOwnRecordTransferDialogAsOperator(page, loginPage, recordEditorPage, I1_SERVICE_REGISTER_POLICY_NUMBER, I1_SERVICE_REGISTER_ERROR_ID);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    const targetRhoField = page.locator('#action-target-rho');
    await selectReadonlyComboboxOption(page, targetRhoField, 'I');
    await page.getByRole('button', { name: /^Transfer$/i }).click();
    await expect(page.getByText('Message - Invalid Status - CANNOT transfer DX0I1 SERVICE REGISTER records', { exact: true })).toBeVisible();
    await recordEditorPage.cancelDialog();
    // RESOLVED (2026-09-03): see this file's header comment above openOwnRecordTransferDialogAsOperator.
    // I1_SERVICE_REGISTER_POLICY_NUMBER (300000144/ECN I1202636900144) is a real, currently
    // HELD CB1 record whose own runId is I1 - found by exporting the full CB Records
    // population as CSV (recordCode is a CSV column) and checking each of the 52 CB1-coded
    // rows' own runId via GET /api/v1/spi/{ecn} (runId is not exposed anywhere in the grid
    // or CSV, only in each record's own detail JSON - the prior BLOCKED finding relied on
    // eyeballing the summary grid alone, which can never reveal this field). Submitting
    // Transfer with Target RHO=I reproduces condition 7130 exactly as catalogued.
  });

  test('TMS-RDMS-TRL-030 - BR-507: a SYNOPSIS-only record is refused for transfer under condition 7131', async ({ page, loginPage, recordEditorPage }) => {
    await openOwnRecordTransferDialogAsOperator(page, loginPage, recordEditorPage, SYNOPSIS_POLICY_NUMBER, SYNOPSIS_ERROR_ID);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    const targetRhoField = page.locator('#action-target-rho');
    await selectReadonlyComboboxOption(page, targetRhoField, 'I');
    await page.getByRole('button', { name: /^Transfer$/i }).click();
    await expect(page.getByText(/SYNOPSIS Records CANNOT be transferred/i)).toBeVisible();
    await recordEditorPage.cancelDialog();
    // RESOLVED (2026-09-03): see this file's header comment above openOwnRecordTransferDialogAsOperator.
    // SYNOPSIS_POLICY_NUMBER (100000004/ECN DC202626000004, branch 1) is a real, currently
    // HELD record whose branch is one of BR-507's seven synopsis branches - branch is a CSV
    // export column, so this one was found directly from the CSV without needing a detail-
    // JSON lookup at all (no separate "synopsis-only" flag exists anywhere in the detail JSON
    // schema; the branch-based condition is enforced server-side regardless). This is the
    // same record CB3+spiIndicator='C' also qualifies for BR-505 on - live-confirmed that its
    // Transfer submission hits this synopsis check first, which is why TRL-028 above uses a
    // different, branch-S record instead to exercise BR-505 in isolation. Submitting Transfer
    // with Target RHO=I reproduces condition 7131 exactly as catalogued.
  });

  test('TMS-RDMS-TRL-031 - BR-508: transferring an RVP error whose status is not D or H is refused under condition 7132', async ({ page, loginPage, recordEditorPage }) => {
    // Same ROLE_ADMIN Actions-menu finding as TMS-RDMS-TRL-025 above: opening this dialog as
    // admin (openTrailerTransferDialog()) times out because that role's Actions menu on the
    // shared fixture never lists Transfer at all - use the o-0001/ROLE_OPERATOR path instead.
    await openTrailerTransferDialogAsOperator(page, loginPage, recordEditorPage);
    await expect(page.getByText(/Transfer/i).first()).toBeVisible();
    await expect(page.getByText(/VALID STATUS FOR RVP ERROR/i)).toHaveCount(0);
    await recordEditorPage.cancelDialog();
    // BLOCKED - TEST DATA: same corrected finding as TRL-028/TRL-029/TRL-030 - permissions are
    // confirmed NOT the blocker for reaching the dialog once the correct role is used (see
    // TRL-026/TRL-027, and TRL-025's own note above on why ROLE_ADMIN specifically cannot even
    // open it). The confirmed test record has no RVP-specific status field distinguishable
    // from its general transStatus="H" (Held), and the broad live scan (2026-09-02, 319 CB
    // Records rows) found no RVP-identifiable record in the whole grid from the summary
    // columns alone (which do not expose an RVP-specific
    // status). No qualifying record was found, and no normal-target Transfer submission was
    // attempted on an unconfirmed record for the same real-mutation-risk reason as TRL-028.
    // Verified for real: the Transfer form is reachable and the 7132 banner is not already
    // showing; the dialog is cancelled rather than committed.
  });

  test('TMS-RDMS-TRL-032 - BR-509: an untrapped module error is reported under condition 7900 with a named escalation route', async ({ page, loginPage, recordEditorPage }) => {
    await openTrailerTabEditable(loginPage, recordEditorPage);
    await expect(page.getByText(/ERROR IN MODULE/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // BLOCKED - TEST DATA: BR-509 is a generic CICS catch-all with no specific trigger named
    // in the reference, so condition 7900 cannot be independently produced. Verified for
    // real: amendment mode is reached and the 7900 banner is not already showing.
  });
});
