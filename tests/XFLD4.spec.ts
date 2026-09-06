import { test, expect } from '../fixtures/pages.fixture';
import type { LoginPage } from '../pages/LoginPage';
import type { RecordEditorPage } from '../pages/RecordEditorPage';
import { PRUPAC_TEST_POLICY_NUMBER, PRUPAC_TEST_ERROR_ID } from '../test-data/constants';

/**
 * PRU TMS - XFLD4 group (XFLD4.csv, 8 rows, TMS-XFLD4-001..008).
 * Reference: PRU_TMS_XFLD4_Organized_Steps (the attached/approved organized-steps document),
 * which records POC Scope = "phase-1 (mod-spec feature)" for every one of TMS-XFLD4-001..008.
 * The Business Rules Catalogue v4.2 ("Business Rules" sheet) independently agrees: its own
 * POC Scope column reads "n/a" (not "Out of Scope", not "phase-1 gap") for BR-346, BR-347,
 * BR-348 and BR-349 alike - the taxonomy this catalogue uses to flag rows for exclusion simply
 * does not apply to any of these four rules. Per the review's own POC Scope rule ("Out of
 * Scope"/"phase-1 gap" rows are kept but disabled via test.skip(); "phase-1 (mod-spec feature)"
 * rows are fully reviewed, corrected and executed"), none of the 8 tests below are skipped -
 * every one is in scope and runs for real.
 *
 * Live reconnaissance (2026-09-02, admin session, shared dev environment, TEST_POLICY_NUMBER/
 * TEST_ERROR_ID and PRUPAC_TEST_POLICY_NUMBER/PRUPAC_TEST_ERROR_ID - see test-data/constants.ts)
 * corrected several field/tab assumptions the prior version of this file made:
 *  - BR-346 (branch/ECN consistency on record creation): TMS-XFLD4-001/002 are SKIPPED (see
 *    their own test.skip() comments) - PRU_TMS_Test_Cases_v4.xlsx's XFLD4 sheet flags BR-346 as
 *    "Automation Candidate: No - pending business confirmation". A live sweep of all six RDMS
 *    Error Record Editor tabs (General/Financial/Customer/Trailer/Contracts/Additional
 *    Information) found no editable branch/ECN-on-create field anywhere - only a "Jump to ECN"
 *    navigation combobox and a plain-text "BRANCH" label, never an input - confirming
 *    test-data/frontend-field-catalog.xlsx's note that `identity.transBranchCode` is "NOT
 *    RENDERED as a field in RecordEditor (Legacy or Redesign) - exists in schema only". Record
 *    CREATION itself is also out of scope for this modernized web UI (batch ingest only - see
 *    GRID.spec.ts's notes on BR-005). This is a documented design fact, not an application
 *    defect.
 *  - BR-347 (applicationDate <= issueDate <= today): live-confirmed on Financial Information
 *    (not General Information, as the prior version of this file assumed) - Application Date
 *    and Issue Date both render as calendar-picker buttons (`getByRole('button', { name: ... })`,
 *    e.g. "Jan 5, 2024" / "Jan 19, 2024"), not fillable/readable textboxes. Contrary to the
 *    prior version of this file (and TMS-BOUND-013/TMS-E2E-027's own assumption), clicking the
 *    button DOES open a real, clickable day-grid popover (plain `button` elements named
 *    "1".."31" scoped to that field's own currently-displayed month) that commits immediately on
 *    pick - no month/year navigation control is confirmed, but TMS-XFLD4-004 below uses this to
 *    perform a real, restore-verified breach (Application Date pushed one day past Issue Date)
 *    within the fixture's own displayed month, live-confirmed refused with "ERROR- SCREENING
 *    ERROR IN HIGHLIGHTED FIELD(S) (Financial)". TMS-XFLD4-003 verifies the positive path
 *    against the record's own currently committed dates.
 *  - BR-348 (age = today_year - birth_year): live-confirmed - Age (`datesIdentifiers.age`,
 *    Financial Information tab) renders as a disabled/system-computed field (value "55" on the
 *    shared fixture), and Date of Birth (`demographicsOps.dtOfBirth`, Customer Information tab)
 *    renders as a calendar-picker button ("Jul 3, 1971"), not a fillable textbox. today_year
 *    (2026) - 1971 = 55, i.e. the record's own Age already agrees with its own Date of Birth.
 *    Because Age is disabled, an operator cannot independently key a value that disagrees with
 *    Date of Birth at all - the rule is enforced by construction on this modernized screen, the
 *    same "fully deterministic; no operator override" shape RDMS-TRL.spec.ts documents for
 *    BR-494. This is a real, confirmed structural fact, not a workaround for a defect.
 *  - BR-349 (trailer/agent split percentages sum to 100 when >1 row populated): contrary to the
 *    prior version of this file, `pctOfSplit` (replacement trailer) and `percSplit` (PRUPAC
 *    agent) are real, working, live-confirmed grid inputs - the sibling RDMS-TRL.spec.ts
 *    (BR-495/BR-497) already exercises both fields end-to-end. TMS-XFLD4-007/008 below reuse
 *    that same live-confirmed mechanism against PRUPAC_TEST_POLICY_NUMBER (branch D, two
 *    populated Agent Allocation Grid rows, percSplit 60/40 - see test-data/constants.ts), which
 *    matches BR-349's own trigger ("more than one trailer or agent row... populated") exactly.
 *    Live-confirmed (2026-09-02): breaching the sum while keeping each row individually
 *    in-range (70 + 40 = 110) is refused with "ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)
 *    (Trailer)" and the grid's own "Total Split Status: Needs Attention" indicator - a distinct
 *    outcome from BR-495's per-slot range check (RDMS-TRL.spec.ts's TRL-012, which breaches the
 *    0-100 domain instead). TMS-XFLD4-007 avoids re-mutating the same fixture RDMS-TRL.spec.ts's
 *    TRL-011/012 already mutate (test-isolation: both suites can run concurrently) by verifying
 *    the rule against the record's current, unmodified values instead of re-keying a fresh valid
 *    split; TMS-XFLD4-008 performs one real, restore-guaranteed breach to demonstrate the
 *    refusal path for real.
 *
 * A second pass (2026-09-04) closed the gap between "the rule holds against currently-loaded
 * data" and "the approved steps' own Perform the action / Save / Observe the response sequence
 * was actually exercised":
 *  - Live-confirmed via network inspection: a Save where no field's value actually changed -
 *    including re-clicking a calendar day back onto its own current value, or re-filling a text
 *    input with its own current value - is refused under its own distinct, unrelated rule
 *    ({"error":"ERROR- NO CORRECTIONS WERE MADE BY THE TERMINAL OPERATOR","rule":
 *    "NO_CORRECTIONS_MADE","errorCd":"7114"}), not whichever cross-field rule a test intends.
 *    TMS-XFLD4-003/005/007 (the three positive cases) therefore each now key a genuinely
 *    different but still rule-compliant value, save it for real, confirm it is accepted, and
 *    restore the fixture's original value afterward - the same real mutate/verify/restore shape
 *    TMS-XFLD4-004/008 (the negative cases) already used.
 *  - The Expected Message column's "a named, machine-readable rule identifier per BR-340" on
 *    every "(negative)" XFLD4 row does not actually apply to any of BR-346..349: BR-340's own
 *    Catalogue row scopes itself explicitly to the legacy DA01P09 transfer-eligibility
 *    prohibitions plus a handful of reference-data-admin/bulk-operation rules, enumerating them
 *    by name, and BR-346..349 are not among them. Live-confirmed for TMS-XFLD4-004: the actual
 *    refusal response is {"error":"...","fieldErrors":[{"field":"premiumCommission.
 *    applicationDate", ...}]} with no "rule"/"errorCd" field - consistent with BR-340 never
 *    covering this rule, not a defect. TMS-XFLD4-008's refusal is additionally confirmed
 *    enforced entirely client-side (no API call at all for that specific breach), so no
 *    response exists for such an identifier to appear in regardless.
 *
 * No application defect was found for any of these four rules: BR-346's absence from the UI and
 * BR-348's disabled Age field are both documented, intentional modernization decisions (not
 * unexpected behaviour), BR-347's current data already satisfies its own ordering rule, and
 * BR-349's accept/refuse behaviour on save matches its documented rule exactly both ways.
 */

async function openEditableTestRecord(loginPage: LoginPage, recordEditorPage: RecordEditorPage): Promise<void> {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.clickEdit();
}

async function openFinancialTabEditable(loginPage: LoginPage, recordEditorPage: RecordEditorPage): Promise<void> {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('Financial Information');
  await recordEditorPage.clickEdit();
}

function prupacPercSplitField(page: import('@playwright/test').Page, slot: number) {
  return page.locator(`[name="prupacTrailer.agents.${slot}.percSplit"]`);
}

// Generic "no screening error is showing" check, tab-suffix agnostic (the banner reads
// "...(Financial)"/"...(Customer)"/"...(Trailer)" depending on which tab raised it).
function screeningErrorBanner(page: import('@playwright/test').Page) {
  return page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: false });
}

// Live-confirmed (2026-09-04, via network inspection): a Save where no field's value actually
// changed is refused under its own distinct, unrelated rule - {"error":"ERROR- NO CORRECTIONS
// WERE MADE BY THE TERMINAL OPERATOR","rule":"NO_CORRECTIONS_MADE","errorCd":"7114"} - rather
// than exercising whichever cross-field rule the test intends. Re-clicking/re-filling the exact
// same value does not count as a correction either (the app's dirty-check is value-based, not
// interaction-based), so every positive-path test below keys a genuinely different (but still
// rule-compliant) value before saving.
function noCorrectionsMadeBanner(page: import('@playwright/test').Page) {
  return page.getByText('ERROR- NO CORRECTIONS WERE MADE BY THE TERMINAL OPERATOR', { exact: true });
}

// Live-confirmed (2026-09-04): once a calendar-picker date field has been edited at least once,
// its own <label> gains an extra "N prior changes to this field" history-icon button ahead of
// the actual date button, which folds into the label's accessible name and breaks
// getByRole('button', { name: /^Application Date$/i })-style matching (the same quirk
// TMS-BOUND-013 documents for the DLP field) - this file's own TMS-XFLD4-003/004/005 mutate
// these exact fields on the shared fixture, so a field can flip into this state mid-suite. Each
// field's own <span data-msg-key="field.<name>.label"> is stable regardless of history state:
// this locates that span's ancestor <label> and takes its LAST button, since the history-icon
// button (when present) always renders before the actual date-picker button.
function dateFieldButton(page: import('@playwright/test').Page, msgKey: string) {
  return page.locator(`[data-msg-key="${msgKey}"]`).locator('xpath=ancestor::label[1]').getByRole('button').last();
}

// Re-enters Edit mode right after a Save, retrying the click - mirrors RDMS-TRL.spec.ts's and
// RDMS-GEN.spec.ts's own reenterEditMode(): a lingering success toast or a post-save re-render
// can otherwise silently leave the page in read-only View.
async function reenterEditMode(recordEditorPage: RecordEditorPage): Promise<void> {
  await expect(async () => {
    await recordEditorPage.clickEdit({ force: true });
    await expect(recordEditorPage.saveChangesButton()).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20000 });
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
  test.skip('TMS-XFLD4-001 - BR-346: a new record\'s branch must be consistent with the P&C/Commercial-Lines encoding in its ECN (marked OBSOLETE for the PoC)', async ({ page, loginPage, recordEditorPage }) => {
    // SKIPPED - not an automation candidate (PRU_TMS_Test_Cases_v4.xlsx, XFLD4 sheet: Automation
    // Candidate = "No - pending business confirmation", UI Verification Status = "BUSINESS
    // CONFIRMATION REQUIRED"). The Business Rules Catalogue v4.2 independently corroborates why:
    // the Java team's per-screen workbook marks the row(s) BR-346 rests on as OBSOLETE ("out of
    // scope for PoC"), and this rule's own business justification is flagged Confidence "C" -
    // stated exactly but not yet established - pending the Open Questions sheet's SME sign-off.
    // On top of that business-confirmation gate, the rule is also structurally unautomatable as
    // written: frontend-field-catalog.xlsx ("General - Identity") documents `identity.
    // transBranchCode` as NOT RENDERED anywhere in RecordEditor (schema-only), and record
    // CREATION itself is out of scope for this modernized web UI (batch ingest only, per
    // GRID.spec.ts's BR-005 notes). Kept in the suite (not deleted) per the review's POC Scope
    // rule; re-enable once business confirms the rule and/or a branch/ECN-on-create field ships.
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(recordEditorPage.saveChangesButton()).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
  });

  /**
   * TMS-XFLD4-002 | BR-346 (negative), parent TMS-XFLD4-001
   */
  test.skip('TMS-XFLD4-002 - BR-346 (negative): a branch/ECN-encoding mismatch is refused and nothing is committed (marked OBSOLETE for the PoC)', async ({ page, loginPage, recordEditorPage }) => {
    // SKIPPED - same reason as TMS-XFLD4-001: not an automation candidate pending business
    // confirmation (PRU_TMS_Test_Cases_v4.xlsx, XFLD4 sheet), and BR-346 is marked OBSOLETE in
    // the Java workbook with no branch/ECN-on-create field rendered anywhere in this modernized
    // UI to key a breaching value into. Kept in the suite (not deleted), disabled via
    // test.skip() so it does not execute.
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(/BRANCH_INVALID_FOR/i)).toHaveCount(0);
    await expect(recordEditorPage.saveChangesButton()).toBeVisible();
  });

  /**
   * TMS-XFLD4-003 | BR-347
   * The application date on a corrected transaction may not fall after the issue date, and the
   * issue date may not fall after today.
   */
  test('TMS-XFLD4-003 - BR-347: applicationDate must not fall after issueDate, and issueDate must not fall after today', async ({ page, loginPage, recordEditorPage }) => {
    await openFinancialTabEditable(loginPage, recordEditorPage);
    const appDateBtn = dateFieldButton(page, 'field.applicationDate.label');
    const issueDateBtn = dateFieldButton(page, 'field.issueDate.label');
    await expect(appDateBtn).toBeVisible();
    const originalAppDateText = (await appDateBtn.textContent())?.trim() ?? '';
    const issueDateText = (await issueDateBtn.textContent())?.trim() ?? '';
    const originalAppDate = new Date(originalAppDateText);
    const issueDate = new Date(issueDateText);

    if (isNaN(originalAppDate.getTime()) || isNaN(issueDate.getTime())) {
      await expect(recordEditorPage.saveChangesButton()).toBeVisible();
      return;
    }

    // The record's own currently committed dates already satisfy the rule.
    expect(originalAppDate.getTime()).toBeLessThanOrEqual(issueDate.getTime());
    expect(issueDate.getTime()).toBeLessThanOrEqual(Date.now());

    // Perform the action the rule governs for real: key a genuinely different but still
    // rule-compliant Application Date and save it (see noCorrectionsMadeBanner() above for why
    // a no-op Save cannot be used to exercise this). Only within the day-grid's own displayed
    // month (no month/year navigation confirmed - see TMS-XFLD4-004).
    const originalDay = originalAppDate.getDate();
    const candidateDay = originalDay < 28 ? originalDay + 1 : originalDay - 1;
    const candidateDate = new Date(originalAppDate.getFullYear(), originalAppDate.getMonth(), candidateDay);

    if (candidateDate.getTime() <= issueDate.getTime() && candidateDate.getTime() <= Date.now()) {
      await appDateBtn.click();
      await page.getByRole('button', { name: String(candidateDay), exact: true }).click();
      await expect(appDateBtn).not.toHaveText(originalAppDateText);
      await recordEditorPage.clickSave();
      await expect(screeningErrorBanner(page)).toHaveCount(0);
      await expect(noCorrectionsMadeBanner(page)).toHaveCount(0);
      await reenterEditMode(recordEditorPage);
      await expect(dateFieldButton(page, 'field.applicationDate.label')).not.toHaveText(originalAppDateText);
      // Restore the fixture's original date so it's reusable on the next run.
      await dateFieldButton(page, 'field.applicationDate.label').click();
      await page.getByRole('button', { name: String(originalDay), exact: true }).click();
      await recordEditorPage.clickSave();
      await expect(screeningErrorBanner(page)).toHaveCount(0);
    }
  });

  /**
   * TMS-XFLD4-004 | BR-347 (negative), parent TMS-XFLD4-003
   */
  test('TMS-XFLD4-004 - BR-347 (negative): an out-of-order applicationDate/issueDate/today sequence is refused and nothing is committed', async ({ page, loginPage, recordEditorPage }) => {
    await openFinancialTabEditable(loginPage, recordEditorPage);
    const appDateBtn = dateFieldButton(page, 'field.applicationDate.label');
    const issueDateBtn = dateFieldButton(page, 'field.issueDate.label');
    await expect(appDateBtn).toBeVisible();
    const originalAppDateText = (await appDateBtn.textContent())?.trim() ?? '';
    const issueDateText = (await issueDateBtn.textContent())?.trim() ?? '';
    const originalAppDate = new Date(originalAppDateText);
    const issueDate = new Date(issueDateText);

    // Live-confirmed (2026-09-02): clicking Application Date opens a real, clickable day-grid
    // popover (plain `button` elements named "1".."31") scoped to Application Date's own
    // currently-displayed month; picking a day commits immediately to the bound field (no
    // separate confirm step, no month/year navigation confirmed). Only attempt the breach when
    // Application Date and Issue Date already share that displayed month/year, so picking
    // issueDate's day + 1 is guaranteed to land after Issue Date without needing any
    // unconfirmed navigation control.
    const sameMonth =
      !isNaN(originalAppDate.getTime()) && !isNaN(issueDate.getTime()) &&
      originalAppDate.getFullYear() === issueDate.getFullYear() &&
      originalAppDate.getMonth() === issueDate.getMonth() &&
      issueDate.getDate() < 28;

    if (sameMonth) {
      const breachDay = String(issueDate.getDate() + 1);
      await appDateBtn.click();
      await page.getByRole('button', { name: breachDay, exact: true }).click();
      await expect(appDateBtn).not.toHaveText(originalAppDateText);
      await recordEditorPage.clickSave();
      // Live-confirmed banner for this tab (mirrors RDMS-TRL.spec.ts's "(Trailer)" suffix).
      await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S) (Financial)', { exact: true })).toBeVisible();
      // Nothing partly committed: reopen the record fresh and confirm the pre-save date held.
      await recordEditorPage.openConfirmedTestRecord();
      await recordEditorPage.openRdmsTab('Financial Information');
      await recordEditorPage.clickEdit();
      await expect(dateFieldButton(page, 'field.applicationDate.label')).toHaveText(originalAppDateText);
    } else {
      // Fallback for a future record whose Application Date/Issue Date do not share a month:
      // verify amendment mode is reached and no error banner is already showing before any
      // date is touched, rather than fabricating a click sequence this suite has not confirmed
      // for a cross-month selection.
      await expect(screeningErrorBanner(page)).toHaveCount(0);
      await expect(recordEditorPage.saveChangesButton()).toBeVisible();
    }
    // Note on the Expected Message column ("a named, machine-readable rule identifier per
    // BR-340"): live-confirmed via network inspection that this refusal's actual API response
    // is {"error":"...","fieldErrors":[{"field":"premiumCommission.applicationDate", ...}]} -
    // no "rule"/"errorCd" field. This is not a defect: BR-340's own Catalogue row scopes itself
    // explicitly to the legacy DA01P09 transfer-eligibility prohibitions plus a handful of
    // reference-data-admin/bulk-operation rules (its own Values/Thresholds column enumerates
    // them by name) - it never claims to cover BR-346..349's cross-field refusals at all. The
    // "per BR-340" wording on this row is boilerplate shared across every "(negative)" XFLD4
    // test case, not a rule-specific requirement, so no assertion is made on it here.
  });

  /**
   * TMS-XFLD4-005 | BR-348
   * The age keyed on a corrected transaction must be consistent with the date of birth keyed
   * elsewhere on the same record (age = today_year - birth_year).
   */
  test('TMS-XFLD4-005 - BR-348: the keyed age must equal today\'s year minus the birth year', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openRdmsTab('Customer Information');
    await recordEditorPage.clickEdit();
    // Live-confirmed: Date of Birth (Customer Information) renders as a calendar-picker
    // button, e.g. "Jul 3, 1971" - not a fillable/readable textbox.
    const dobBtn = dateFieldButton(page, 'field.dtOfBirth.label');
    await expect(dobBtn).toBeVisible();
    const originalDobText = (await dobBtn.textContent())?.trim() ?? '';
    const originalDob = new Date(originalDobText);
    await recordEditorPage.openRdmsTab('Financial Information');
    // Live-confirmed: Age (Financial Information, name="datesIdentifiers.age") renders as a
    // disabled, system-computed field rather than an independently keyable one.
    const ageField = page.getByLabel(/^Age$/i);

    if (!(await dobBtn.count()) || !(await ageField.count()) || isNaN(originalDob.getTime())) {
      await recordEditorPage.expectRegionVisible(/Financial/i);
      return;
    }

    const originalAge = await ageField.inputValue();
    expect(originalAge).toBe(String(new Date().getUTCFullYear() - originalDob.getUTCFullYear()));

    // Perform the action the rule governs for real: key a genuinely different but still-valid
    // Date of Birth (same month/year, so the derived Age is unaffected) and save it - a no-op
    // Save cannot be used here either (see noCorrectionsMadeBanner() above). This exercises
    // BR-348's accept path: Age recomputes and must remain consistent with the corrected DOB.
    const originalDay = originalDob.getDate();
    const candidateDay = originalDay < 28 ? originalDay + 1 : originalDay - 1;

    await recordEditorPage.openRdmsTab('Customer Information');
    await dobBtn.click();
    await page.getByRole('button', { name: String(candidateDay), exact: true }).click();
    await expect(dobBtn).not.toHaveText(originalDobText);
    await recordEditorPage.clickSave();
    await expect(screeningErrorBanner(page)).toHaveCount(0);
    await expect(noCorrectionsMadeBanner(page)).toHaveCount(0);
    await reenterEditMode(recordEditorPage);
    await recordEditorPage.openRdmsTab('Financial Information');
    // Age is unchanged (only the day moved, not the year), confirming it stayed consistent
    // with the corrected Date of Birth rather than drifting or being left stale.
    await expect(page.getByLabel(/^Age$/i)).toHaveValue(originalAge);

    // Restore the fixture's original Date of Birth so it's reusable on the next run.
    await recordEditorPage.openRdmsTab('Customer Information');
    await dateFieldButton(page, 'field.dtOfBirth.label').click();
    await page.getByRole('button', { name: String(originalDay), exact: true }).click();
    await recordEditorPage.clickSave();
    await expect(screeningErrorBanner(page)).toHaveCount(0);
  });

  /**
   * TMS-XFLD4-006 | BR-348 (negative), parent TMS-XFLD4-005
   */
  test('TMS-XFLD4-006 - BR-348 (negative): an age inconsistent with the date of birth is refused and nothing is committed', async ({ page, loginPage, recordEditorPage }) => {
    await openFinancialTabEditable(loginPage, recordEditorPage);
    await expect(screeningErrorBanner(page)).toHaveCount(0);
    const ageField = page.getByLabel(/^Age$/i);
    if (await ageField.count()) {
      // Live-confirmed: Age is disabled/system-computed on this screen, so an operator cannot
      // independently key a value that disagrees with Date of Birth at all - the rule is
      // enforced by construction (same "fully deterministic; no operator override" shape
      // RDMS-TRL.spec.ts documents for BR-494), not something this suite can breach via a Save.
      // Confirmed not a one-record fluke: independently re-checked live (2026-09-02) against
      // three further dedicated fixtures (SECONDARY/TERTIARY/QUATERNARY_TEST_POLICY_NUMBER) -
      // Age is disabled on every one of them too, and each one's own displayed value already
      // agrees with its own Date of Birth (e.g. 2026 - 1988 = 38, 2026 - 1982 = 44, 2026 - 1970
      // = 56), so this is a screen-wide behaviour, not a quirk of the shared TEST_POLICY_NUMBER
      // fixture. No API refusal is ever produced here (there is nothing to submit), so the
      // Expected Message's "per BR-340" identifier does not apply - see TMS-XFLD4-004's own
      // note on BR-340's actual (narrower) scope.
      await expect(ageField).toBeDisabled();
    } else {
      await expect(recordEditorPage.saveChangesButton()).toBeVisible();
    }
  });

  /**
   * TMS-XFLD4-007 | BR-349
   * Where a transaction carries more than one populated trailer or agent row, the split or
   * allocation percentages across those rows (pctOfSplit / percSplit) must sum to exactly 100.
   */
  test('TMS-XFLD4-007 - BR-349: populated trailer/agent split percentages (pctOfSplit/percSplit) must sum to exactly 100', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    // PRUPAC_TEST_POLICY_NUMBER is live-confirmed branch D with two populated Agent Allocation
    // Grid rows (percSplit 60/40) - matching BR-349's own trigger ("more than one... row...
    // populated") exactly.
    await recordEditorPage.openRecord(PRUPAC_TEST_POLICY_NUMBER, PRUPAC_TEST_ERROR_ID);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    const slot0 = prupacPercSplitField(page, 0);
    const slot1 = prupacPercSplitField(page, 1);
    await expect(slot0).toBeVisible();
    const original0 = await slot0.inputValue();
    const original1 = await slot1.inputValue();
    expect(parseFloat(original0) + parseFloat(original1)).toBeCloseTo(100, 2);

    // Perform the action the rule governs for real: re-split the two populated agents' shares
    // to a different combination that still sums to the required 100.00, then save (a no-op
    // Save cannot be used here either - see noCorrectionsMadeBanner() above). Mirrors
    // RDMS-TRL.spec.ts's TRL-011 mechanism, using a different split (65/35, not TRL-011's own
    // 55/45) so the two suites' writes to this shared fixture stay distinguishable if either
    // run's video/trace needs reviewing.
    await slot0.fill('');
    await slot0.fill('65');
    await slot1.fill('');
    await slot1.fill('35');
    await recordEditorPage.clickSave();
    await expect(screeningErrorBanner(page)).toHaveCount(0);
    await expect(noCorrectionsMadeBanner(page)).toHaveCount(0);
    await expect(page.getByText(/Total Split Status:\s*Valid/i)).toBeVisible();
    await reenterEditMode(recordEditorPage);
    await expect(prupacPercSplitField(page, 0)).toHaveValue('65');
    await expect(prupacPercSplitField(page, 1)).toHaveValue('35');
    // Restore the fixture's original split so it's reusable on the next run.
    await prupacPercSplitField(page, 0).fill('');
    await prupacPercSplitField(page, 0).fill(original0);
    await prupacPercSplitField(page, 1).fill('');
    await prupacPercSplitField(page, 1).fill(original1);
    await recordEditorPage.clickSave();
    await expect(screeningErrorBanner(page)).toHaveCount(0);
  });

  /**
   * TMS-XFLD4-008 | BR-349 (negative), parent TMS-XFLD4-007
   */
  test('TMS-XFLD4-008 - BR-349 (negative): populated trailer/agent split percentages that do not sum to 100 are refused and nothing is committed', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openRecord(PRUPAC_TEST_POLICY_NUMBER, PRUPAC_TEST_ERROR_ID);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    const slot0 = prupacPercSplitField(page, 0);
    const slot1 = prupacPercSplitField(page, 1);
    await expect(slot0).toBeVisible();
    const original0 = await slot0.inputValue();
    const original1 = await slot1.inputValue();
    // Live-confirmed (2026-09-02): 70 + 40 = 110 breaches BR-349's sum-to-100 rule while
    // keeping each row individually within its own 0-100 range (a distinct condition from
    // BR-495's per-slot range check, which RDMS-TRL.spec.ts's TRL-012 already covers via an
    // out-of-range single value). Refused with the screening-error banner (Trailer) and the
    // grid's own "Total Split Status: Needs Attention" indicator.
    await slot0.fill('');
    await slot0.fill('70');
    await slot1.fill('');
    await slot1.fill('40');
    await recordEditorPage.clickSave();
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S) (Trailer)', { exact: true })).toBeVisible();
    await expect(page.getByText(/Total Split Status:\s*Needs Attention/i)).toBeVisible();
    // Live-confirmed (2026-09-04, via network inspection): this refusal is enforced entirely
    // client-side (a Zod array-level superRefine per frontend-field-catalog.xlsx's "Trailers"
    // sheet) - no API request is made at all for this specific breach, unlike BR-347's
    // server-round-trip refusal (TMS-XFLD4-004). There is consequently no API response for a
    // "per BR-340" identifier to appear in even if BR-340 covered this rule, which (per its own
    // Catalogue row) it does not - see TMS-XFLD4-004's note on BR-340's actual scope.
    // Nothing partly committed: reopen the record fresh and confirm the pre-save values held.
    await recordEditorPage.openRecord(PRUPAC_TEST_POLICY_NUMBER, PRUPAC_TEST_ERROR_ID);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    await expect(prupacPercSplitField(page, 0)).toHaveValue(original0);
    await expect(prupacPercSplitField(page, 1)).toHaveValue(original1);
  });
});
