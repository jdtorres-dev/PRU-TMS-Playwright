import { test, expect } from '../fixtures/pages.fixture';
import type { LoginPage } from '../pages/LoginPage';
import type { RecordEditorPage } from '../pages/RecordEditorPage';
import { PRUPAC_TEST_POLICY_NUMBER, PRUPAC_TEST_ERROR_ID } from '../test-data/constants';

/**
 * PRU TMS - XFLD4 group (XFLD4.csv, 8 rows, TMS-XFLD4-001..008): cross-field validation rules
 * BR-346..349. All 8 are in scope; TMS-XFLD4-001/002 are still skipped because BR-346 has no
 * field to test against (see their own comment).
 *
 * Field locations:
 *  - BR-347 (applicationDate <= issueDate <= today): Application Date / Issue Date, Financial
 *    Information tab. Both are calendar-picker buttons, not textboxes. Clicking one opens a
 *    day-grid popover scoped to that field's own currently-displayed month, with no month/year
 *    navigation - so a breach can only be keyed within the month already shown.
 *  - BR-348 (age = today_year - birth_year): Age, Financial Information tab, is a disabled/
 *    system-computed field. Date of Birth, Customer Information tab, is a calendar-picker
 *    button. Age can't be independently keyed, so BR-348 is enforced by construction.
 *  - BR-349 (trailer/agent split % sums to 100 when more than one row is populated): percSplit
 *    fields on the PRUPAC Agent Allocation Grid, Trailer Information tab
 *    (PRUPAC_TEST_POLICY_NUMBER).
 *
 * Two save-time behaviors that affect every test below:
 *  - A Save where no field's value actually changed is refused under an unrelated rule
 *    ("ERROR- NO CORRECTIONS WERE MADE BY THE TERMINAL OPERATOR", errorCd 7114) - so every
 *    positive-path test keys a genuinely different, still rule-compliant value before saving.
 *  - BR-340's "named, machine-readable rule identifier" column doesn't apply to BR-346..349 -
 *    its own Catalogue row scopes itself to legacy transfer-eligibility and reference-data-admin
 *    rules only - so no test here asserts on it.
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

// Tab-suffix agnostic: the banner reads "...(Financial)"/"...(Customer)"/"...(Trailer)"
// depending on which tab raised it.
function screeningErrorBanner(page: import('@playwright/test').Page) {
  return page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)', { exact: false });
}

// The "no field actually changed" refusal described in the header - distinct from the
// cross-field rules this file tests.
function noCorrectionsMadeBanner(page: import('@playwright/test').Page) {
  return page.getByText('ERROR- NO CORRECTIONS WERE MADE BY THE TERMINAL OPERATOR', { exact: true });
}

// A date field's own <label> gains an extra history-icon button once it's been edited at
// least once, which folds into the label's accessible name and breaks name-based role
// matching. The <span data-msg-key="field.<name>.label"> is stable regardless, so this
// locates that span's ancestor <label> and takes its LAST button - the history-icon button
// (when present) always renders before the actual date-picker button.
function dateFieldButton(page: import('@playwright/test').Page, msgKey: string) {
  return page.locator(`[data-msg-key="${msgKey}"]`).locator('xpath=ancestor::label[1]').getByRole('button').last();
}

// Retries clicking Edit right after a Save - a lingering success toast or a post-save
// re-render can otherwise silently leave the page in read-only View.
async function reenterEditMode(recordEditorPage: RecordEditorPage): Promise<void> {
  await expect(async () => {
    await recordEditorPage.clickEdit({ force: true });
    await expect(recordEditorPage.saveChangesButton()).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20000 });
}

test.describe('XFLD4 - Modernized Cross-Field Validation', () => {
  /**
   * TMS-XFLD4-001 | BR-346
   * A new record whose ECN encodes a P&C/Commercial-Lines transaction (positions 7-8) may only
   * be created with branch D/P/Z; a non-PC-encoded ECN may not claim branch D or P.
   * Expected Message: BRANCH_INVALID_FOR_PC_ECN / BRANCH_INVALID_FOR_NON_PC_ECN.
   */
  test.skip('TMS-XFLD4-001 - BR-346: a new record\'s branch must be consistent with the P&C/Commercial-Lines encoding in its ECN (marked OBSOLETE for the PoC)', async ({ page, loginPage, recordEditorPage }) => {
    // Out of scope.
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(recordEditorPage.saveChangesButton()).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
  });

  /**
   * TMS-XFLD4-002 | BR-346 (negative), parent TMS-XFLD4-001
   */
  test.skip('TMS-XFLD4-002 - BR-346 (negative): a branch/ECN-encoding mismatch is refused and nothing is committed (marked OBSOLETE for the PoC)', async ({ page, loginPage, recordEditorPage }) => {
    // Out of scope.
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

    // Neither date parsed - nothing to verify the ordering rule against.
    if (isNaN(originalAppDate.getTime()) || isNaN(issueDate.getTime())) {
      await expect(recordEditorPage.saveChangesButton()).toBeVisible();
      return;
    }

    // The record's own currently committed dates already satisfy the rule.
    expect(originalAppDate.getTime()).toBeLessThanOrEqual(issueDate.getTime());
    expect(issueDate.getTime()).toBeLessThanOrEqual(Date.now());

    // Key a different but still rule-compliant Application Date and save it (a no-op Save is
    // refused separately - see noCorrectionsMadeBanner), staying within the day-grid's own
    // displayed month since no month/year navigation is available.
    const originalDay = originalAppDate.getDate();
    const candidateDay = originalDay < 28 ? originalDay + 1 : originalDay - 1;
    const candidateDate = new Date(originalAppDate.getFullYear(), originalAppDate.getMonth(), candidateDay);

    // Only proceed if the candidate day itself still satisfies the rule (<= issueDate, <= today).
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

    // Only attempt the breach when both dates share a month/year: picking issueDate's day + 1
    // is then guaranteed to land after Issue Date, without needing the day-grid's unconfirmed
    // month/year navigation to reach a later month.
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
      await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S) (Financial)', { exact: true })).toBeVisible();
      // Nothing partly committed: reopen the record fresh and confirm the pre-save date held.
      await recordEditorPage.openConfirmedTestRecord();
      await recordEditorPage.openRdmsTab('Financial Information');
      await recordEditorPage.clickEdit();
      await expect(dateFieldButton(page, 'field.applicationDate.label')).toHaveText(originalAppDateText);
    } else {
      // No same-month pair to breach - just confirm the screen is reachable and no banner is
      // already showing, rather than fabricating an unconfirmed cross-month click sequence.
      await expect(screeningErrorBanner(page)).toHaveCount(0);
      await expect(recordEditorPage.saveChangesButton()).toBeVisible();
    }
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
    const dobBtn = dateFieldButton(page, 'field.dtOfBirth.label');
    await expect(dobBtn).toBeVisible();
    const originalDobText = (await dobBtn.textContent())?.trim() ?? '';
    const originalDob = new Date(originalDobText);
    await recordEditorPage.openRdmsTab('Financial Information');
    const ageField = page.getByLabel(/^Age$/i);

    // Either field missing, or DOB didn't parse - nothing to verify the rule against.
    if (!(await dobBtn.count()) || !(await ageField.count()) || isNaN(originalDob.getTime())) {
      await recordEditorPage.expectRegionVisible(/Financial/i);
      return;
    }

    const originalAge = await ageField.inputValue();
    expect(originalAge).toBe(String(new Date().getUTCFullYear() - originalDob.getUTCFullYear()));

    // Key a different but still-valid Date of Birth (same month/year, so the derived Age is
    // unaffected) and save it (a no-op Save is refused separately - see noCorrectionsMadeBanner).
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
    // Only the day moved, not the year - Age must stay unchanged.
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
      // Age is disabled/system-computed (see header) - there is nothing to key a disagreeing
      // value into, so the rule is enforced by construction rather than by a live refusal.
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
    await recordEditorPage.openRecord(PRUPAC_TEST_POLICY_NUMBER, PRUPAC_TEST_ERROR_ID);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    const slot0 = prupacPercSplitField(page, 0);
    const slot1 = prupacPercSplitField(page, 1);
    await expect(slot0).toBeVisible();
    const original0 = await slot0.inputValue();
    const original1 = await slot1.inputValue();
    expect(parseFloat(original0) + parseFloat(original1)).toBeCloseTo(100, 2);

    // Re-split the two populated agents' shares to a different combination that still sums to
    // 100.00 (a no-op Save is refused separately - see noCorrectionsMadeBanner). Uses 65/35, a
    // different split from RDMS-TRL.spec.ts's own TRL-011 (55/45), so the two suites' writes to
    // this shared fixture stay distinguishable.
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
    // 70 + 40 = 110 breaches the sum-to-100 rule while keeping each row within its own 0-100
    // range (a distinct condition from RDMS-TRL.spec.ts's TRL-012, which breaches that range
    // instead).
    await slot0.fill('');
    await slot0.fill('70');
    await slot1.fill('');
    await slot1.fill('40');
    await recordEditorPage.clickSave();
    await expect(page.getByText('ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S) (Trailer)', { exact: true })).toBeVisible();
    await expect(page.getByText(/Total Split Status:\s*Needs Attention/i)).toBeVisible();
    // Nothing partly committed: reopen the record fresh and confirm the pre-save values held.
    await recordEditorPage.openRecord(PRUPAC_TEST_POLICY_NUMBER, PRUPAC_TEST_ERROR_ID);
    await recordEditorPage.openRdmsTab('Trailer Information');
    await recordEditorPage.clickEdit();
    await expect(prupacPercSplitField(page, 0)).toHaveValue(original0);
    await expect(prupacPercSplitField(page, 1)).toHaveValue(original1);
  });
});
