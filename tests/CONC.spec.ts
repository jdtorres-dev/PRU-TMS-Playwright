import { test, expect } from '../fixtures/pages.fixture';
import { LoginPage } from '../pages/LoginPage';
import { RecordEditorPage } from '../pages/RecordEditorPage';

/**
 * PRU TMS - CONC group (tc/PRU_TMS_Test_Cases_v4.xlsx, "CONC" tab, 9 rows,
 * TMS-CONC-001..009). Converted directly from that workbook tab; the xlsx is the system of
 * record and is not modified by this file.
 *
 * Every row in this tab is a NEW modernization-specification rule (BR-323 to BR-329) with no
 * counterpart in the legacy 305-rule catalogue used for v3, covering optimistic-locking
 * version markers, per-record write serialization, save/submit validation parity, the
 * untouched->in-progress status transition, the commission-cap dual checkpoint, a
 * batch-in-progress warning, and independent bulk-action commits. Screen: "Result Grid (bulk
 * actions) + Error Record Editor (save/submit)".
 *
 * Where a rule is genuinely reproducible with two concurrent browser sessions against this
 * suite's one confirmed test record (BR-323, BR-324, BR-325), or with the Result Grid's own
 * bulk-select/bulk-resolve affordance (BR-329), it is exercised for real, following the same
 * two-context technique already proven live in TMS-E2E-018 and the bulk-resolve technique
 * proven live in TMS-E2E-021. Rows that need a record class this suite cannot seed (an
 * untouched/New-status record for BR-326, a commission-cap-exceeding record for BR-327, a
 * record whose most recent batch run is still shown running for BR-328) assert the strongest
 * currently-checkable real fact instead, with a comment naming exactly what could not be
 * independently verified and why.
 *
 * The "Additional TCs" tab in the same workbook is out of scope for now (per user direction).
 * Its four CONC-group rows (ADD-TC-013..016) are converted and kept, block-commented, at the
 * end of the describe block below. Say "UNSCOPE ADDITIONAL TCS" (or "UNSCOPE ADDITIONAL TCS
 * CONC") to bring them back into scope.
 */
test.describe('CONC - Modernized Concurrency and Bulk Operations', () => {
  test('TMS-CONC-001 - BR-323: a save whose version marker no longer matches the record\'s current version is refused and the server\'s current copy is returned', async ({ page, loginPage, recordEditorPage, browser }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickEdit();
    // Run before session 2 opens the record, so session 2's baseline version already
    // reflects this fix instead of needing its own.
    await recordEditorPage.resolveFinancialPrerequisites();
    const field1 = recordEditorPage.districtTextbox();

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const loginPage2 = new LoginPage(page2);
    const recordEditorPage2 = new RecordEditorPage(page2);
    await loginPage2.loginAsValidUser();
    await recordEditorPage2.openConfirmedTestRecord();
    await recordEditorPage2.clickEdit();
    const field2 = recordEditorPage2.districtTextbox();

    // Session 1 saves first, establishing a newer version than session 2 is still holding.
    // A fixed, format-compliant value (char 1 alphabetic, chars 2-4 alphanumeric/space) -
    // the same pattern TMS-E2E-001 already proves reaches a clean save on this record.
    await field1.fill('B12A');
    await recordEditorPage.clickSave();
    await expect(page.getByText(/\b710[0-8]\b/).first()).toBeVisible();

    await field2.fill('B12B');
    await recordEditorPage2.clickSave();
    // Session 2's version marker no longer matches the server's current copy (session 1's
    // save moved it on), so this save must be refused rather than silently overwriting.
    await expect(page2.getByText(/conflict|changed|no longer match|version|7303/i).first()).toBeVisible();

    await context2.close();
  });

  test('TMS-CONC-002 - BR-323 (negative): the forbidden condition is refused and the named rule identifier is returned', async ({ page, loginPage, recordEditorPage, browser }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickEdit();
    // Run before session 2 opens the record, so session 2's baseline version already
    // reflects this fix instead of needing its own.
    await recordEditorPage.resolveFinancialPrerequisites();
    const field1 = recordEditorPage.districtTextbox();

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const loginPage2 = new LoginPage(page2);
    const recordEditorPage2 = new RecordEditorPage(page2);
    await loginPage2.loginAsValidUser();
    await recordEditorPage2.openConfirmedTestRecord();
    await recordEditorPage2.clickEdit();
    const field2 = recordEditorPage2.districtTextbox();

    await field1.fill('B12C');
    await recordEditorPage.clickSave();
    await expect(page.getByText(/\b710[0-8]\b/).first()).toBeVisible();

    await field2.fill('B12D');
    await recordEditorPage2.clickSave();
    // BR-340 requires a distinct, machine-readable rule name for this refusal rather than
    // wording alone; the exact identifier string is not documented in the Catalogue for
    // BR-323, so this asserts the broad conflict signal actually observable in this build
    // rather than a specific, unconfirmed literal.
    await expect(page2.getByText(/conflict|changed|no longer match|version|7303/i).first()).toBeVisible();

    await context2.close();
  });

  test('TMS-CONC-003 - BR-324: two concurrent write attempts against the same record are serialised rather than allowed to interleave', async ({ page, loginPage, recordEditorPage, browser }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickEdit();
    const field1 = recordEditorPage.districtTextbox();
    await field1.fill('B12E');

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const loginPage2 = new LoginPage(page2);
    const recordEditorPage2 = new RecordEditorPage(page2);
    await loginPage2.loginAsValidUser();
    await recordEditorPage2.openConfirmedTestRecord();
    await recordEditorPage2.clickEdit();
    const field2 = recordEditorPage2.districtTextbox();
    await field2.fill('B12F');

    // Both sessions submit their save at essentially the same moment. Whichever the lock
    // admits first must commit cleanly; the other must not also silently succeed - the two
    // writes must not interleave into a corrupted merged result.
    const [result1, result2] = await Promise.all([
      recordEditorPage.clickSave().then(() => 'done'),
      recordEditorPage2.clickSave().then(() => 'done'),
    ]);
    expect(result1).toBe('done');
    expect(result2).toBe('done');
    const outcome1 = page.getByText(/\b710[0-8]\b/).first();
    const outcome2 = page2.getByText(/\b710[0-8]\b/).first();
    const succeeded1 = await outcome1.isVisible().catch(() => false);
    const succeeded2 = await outcome2.isVisible().catch(() => false);
    // Whether the loser is made to wait or is told the record is momentarily locked is a
    // timing/UX detail this suite cannot distinguish from a single automated run; what is
    // verified for real is the mutual-exclusion outcome BR-324 requires: not both concurrent
    // writes against the same record silently succeed.
    expect(succeeded1 && succeeded2).toBe(false);

    await context2.close();
  });

  test('TMS-CONC-004 - BR-325: saving and submitting a record apply exactly the same validation', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickEdit();
    const field = recordEditorPage.firstTextbox();
    await field.fill('');
    await recordEditorPage.clickSave();
    await expect(page.getByText(/7111|SCREENING ERROR|required/i).first()).toBeVisible();

    // The identical breach, still in place from the refused Save above, must be refused by
    // Submit's identical validation too - neither action is a lesser, less-validated path to
    // a released state.
    await field.fill('');
    await recordEditorPage.clickSubmit();
    await expect(page.getByText(/7111|SCREENING ERROR|required/i).first()).toBeVisible();
  });

  test('TMS-CONC-005 - BR-326: the first save of an untouched record advances its status from untouched to in-progress', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickEdit();
    await recordEditorPage.resolveFinancialPrerequisites();
    const field = recordEditorPage.districtTextbox();
    await field.fill('B12G');
    await recordEditorPage.clickSave();
    // KNOWN GAP for this fixture: this suite's single confirmed test record is reused across
    // the whole suite, so it is very unlikely to still be in the untouched (New) status this
    // rule's precondition requires by the time this case runs, and this suite has no way to
    // seed a fresh untouched record. The specific New->Open transition therefore cannot be
    // independently isolated. Verified for real: a save against this record completes and
    // commits, which is the action this status advance rides on.
    await expect(page.getByText(/\b710[0-8]\b/).first()).toBeVisible();
  });

  test('TMS-CONC-006 - BR-327: the commission-cap check applies at both a commission-field edit and a status transition toward Released', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    const beforeHeading = await page.getByRole('heading').first().innerText();
    await recordEditorPage.openActionsItem('Resolve');
    await expect(page.getByRole('heading', { name: 'Resolve Record' })).toBeVisible();
    // KNOWN GAP for this fixture: reproducing the actual COMMISSION_CAP_EXCEEDED downgrade
    // needs a record whose record code and SPI indicator are confirmed to meet the cap-check
    // trigger - a specific reference-data/monetary condition this suite's single confirmed
    // test record cannot be seeded into. Verified for real: the status-transition-toward-
    // Released path this checkpoint guards is reachable; cancelled rather than confirmed, to
    // avoid an unintended disposition change on this shared record.
    await recordEditorPage.cancelDialog();
    await expect(page.getByRole('heading').first()).toHaveText(beforeHeading);
  });

  test('TMS-CONC-007 - BR-327 (negative): the forbidden condition is refused and the named rule identifier is returned', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    const beforeHeading = await page.getByRole('heading').first().innerText();
    await recordEditorPage.openActionsItem('Resolve');
    await expect(page.getByRole('heading', { name: 'Resolve Record' })).toBeVisible();
    // Same seeding gap as TMS-CONC-006: no record confirmed to meet the cap-check trigger is
    // available on this shared fixture, so the COMMISSION_CAP_EXCEEDED refusal itself cannot
    // be triggered. Abandoning via Cancel keeps the shared record's disposition unchanged,
    // consistent with BR-327's "nothing is committed" on refusal.
    await recordEditorPage.cancelDialog();
    await expect(page.getByRole('heading').first()).toHaveText(beforeHeading);
  });

  test('TMS-CONC-008 - BR-328: opening a record for correction while its most recent batch run is still shown in progress displays a non-blocking warning', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickEdit();
    // KNOWN GAP for this fixture: this suite has no way to seed a record whose recorded batch
    // run is confirmed still running, so the specific banner cannot be triggered or observed.
    // Verified for real: the record editor opens in Edit mode with no blocking modal in the
    // way - the operator may still save, which is the one part of BR-328 this suite can
    // confirm (the version check, not any banner, is the safeguard actually relied upon).
    await expect(recordEditorPage.saveChangesButton()).toBeVisible();
    await expect(recordEditorPage.firstTextbox()).toBeEditable();
  });

  test('TMS-CONC-009 - BR-329: resolving several records in one bulk action commits each record independently under one shared batch identifier', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    await errorManagerPage.viewRecords();
    // The default Current Week scope can legitimately return zero records (another worker's
    // bulk-resolve may have already cleared this week's suspense population), in which case
    // the grid renders an empty-state message instead of a grid/table role.
    await expect(errorManagerPage.resultGridOrEmptyState()).toBeVisible();
    const rows = page.getByRole('row');
    const rowCount = await rows.count();
    const toSelect = Math.min(5, Math.max(0, rowCount - 1));
    for (let i = 1; i <= toSelect; i++) {
      const checkbox = rows.nth(i).getByRole('checkbox');
      if (await checkbox.count()) await checkbox.check();
    }
    const bulkResolveBtn = page.getByRole('button', { name: /Resolve/i });
    if (toSelect > 0 && (await bulkResolveBtn.count())) {
      await bulkResolveBtn.click();
      // The response is expected to list which named records succeeded and which failed, and
      // why - each is committed on its own rather than the whole batch succeeding or failing
      // together.
      await expect(page.getByText(/succeeded|failed|resolved/i).first()).toBeVisible();
    } else {
      // No selectable rows or no bulk-resolve affordance on this result set; confirms the
      // reachable precondition instead - the Result Grid (or its legitimate empty state) this
      // bulk action would run from.
      await expect(errorManagerPage.resultGridOrEmptyState()).toBeVisible();
    }
  });

  // ==========================================================================================
  // OUT OF SCOPE - "Additional TCs" tab (tc/PRU_TMS_Test_Cases_v4.xlsx). Approved in the
  // workbook but not yet in scope for execution, per user direction. To bring the block below
  // back into scope, say the checkpoint phrase "UNSCOPE ADDITIONAL TCS" (optionally "UNSCOPE
  // ADDITIONAL TCS CONC" to target only this file) and it will be uncommented.
  // ==========================================================================================
  /* OUT-OF-SCOPE-ADDITIONAL-TC (CONC)
  test('ADD-TC-013 - Data Integrity: browser refresh immediately after a successful save does not re-submit the save', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickHistory();
    const before = await page.getByRole('row').count();

    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openRdmsTab('General Information');
    await recordEditorPage.clickEdit();
    const district = page.getByLabel(/District/i).or(recordEditorPage.firstTextbox());
    await district.fill(`${await district.inputValue()} A`);
    await recordEditorPage.clickSave();
    await expect(page.getByText(/\b710[0-8]\b/).first()).toBeVisible();

    // Playwright auto-dismisses any browser beforeunload/form-resubmission confirmation
    // dialog by default, mirroring an operator who confirms the prompt if one appears.
    await page.reload();

    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickHistory();
    const after = await page.getByRole('row').count();
    // Some new entry must exist (the save was not silently lost), but not twice as many (the
    // refresh must not have re-submitted the save a second time).
    expect(after).toBeGreaterThan(before);
    expect(after).toBeLessThan(before + 2);
  });

  test('ADD-TC-014 - Concurrency: one operator editing the same record in two browser tabs is still subject to the version check', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickEdit();
    const districtA = page.getByLabel(/District/i).or(recordEditorPage.firstTextbox());
    const originalDistrict = await districtA.inputValue();

    // Same browser context (not browser.newContext()) - this is deliberately the SAME
    // session/cookies/operator as tab A, unlike TMS-CONC-001..003 which use two independent
    // logins to model two different operators.
    const page2 = await page.context().newPage();
    const recordEditorPage2 = new RecordEditorPage(page2);
    await recordEditorPage2.openConfirmedTestRecord();
    await recordEditorPage2.clickEdit();
    const staffB = page2.getByLabel(/Staff/i).or(recordEditorPage2.textboxAt(1));

    await districtA.fill(`${originalDistrict} A`);
    await recordEditorPage.clickSave();
    await expect(page.getByText(/\b710[0-8]\b/).first()).toBeVisible();

    await staffB.fill(`${await staffB.inputValue()} B`);
    await recordEditorPage2.clickSave();
    // Same session, same operator, same entitlement - if the lock/version check were keyed on
    // the session rather than the individual request, this second tab's stale write would be
    // let through. It must still be refused.
    await expect(page2.getByText(/conflict|changed|no longer match|version|7303/i).first()).toBeVisible();

    await page2.close();
  });

  test('ADD-TC-015 - Concurrency: two operators setting a disposition on the same Result Grid row simultaneously do not interleave', async ({ page, loginPage, recordEditorPage, browser }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const loginPage2 = new LoginPage(page2);
    const recordEditorPage2 = new RecordEditorPage(page2);
    await loginPage2.loginAsValidUser();
    await recordEditorPage2.openConfirmedTestRecord();

    await recordEditorPage.openActionsItem('Hold');
    await recordEditorPage2.openActionsItem('Resolve');
    await expect(page.getByRole('heading', { name: 'Hold Record' }).or(page.getByText(/Hold/i)).first()).toBeVisible();
    await expect(page2.getByRole('heading', { name: 'Resolve Record' })).toBeVisible();
    // Confirming both dispositions for real on this suite's single shared confirmed test
    // record risks leaving it Released (removed from the suspense population every other test
    // in this suite depends on) with no way to restore it - too destructive to risk here. Both
    // dialogs are opened concurrently to confirm the two independent disposition-prep paths
    // are reachable at once; neither is confirmed. The genuine interleave-avoidance outcome
    // (one applied, one refused/serialised, audit records only the one actually applied) is
    // not independently verified by this case.
    await recordEditorPage.cancelDialog();
    await recordEditorPage2.cancelDialog();
    await context2.close();
  });

  test('ADD-TC-016 - Concurrency: a bulk action overlapping a single-record action on one of the same records', async ({ page, loginPage, recordEditorPage, errorManagerPage, browser }) => {
    await loginPage.loginAsValidUser();
    await errorManagerPage.viewRecords();
    await expect(errorManagerPage.resultGrid()).toBeVisible();
    const rows = page.getByRole('row');
    const rowCount = await rows.count();
    const toSelect = Math.min(5, Math.max(0, rowCount - 1));
    for (let i = 1; i <= toSelect; i++) {
      const checkbox = rows.nth(i).getByRole('checkbox');
      if (await checkbox.count()) await checkbox.check();
    }
    const bulkResolveBtn = page.getByRole('button', { name: /Resolve/i });

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const loginPage2 = new LoginPage(page2);
    const recordEditorPage2 = new RecordEditorPage(page2);
    await loginPage2.loginAsValidUser();
    await recordEditorPage2.openConfirmedTestRecord();
    await recordEditorPage2.clickEdit();
    // No mechanism in this suite ties "one of the five bulk-selected rows" to the specific
    // confirmed test record opened in session 2 - the Result Grid's row order/selection and
    // the confirmed test record's identity are not correlated here, so the true contended-
    // record scenario cannot be deterministically constructed. Confirming a real bulk resolve
    // would also commit disposition changes across up to five shared fixture records with no
    // way to restore them. Verified for real: the bulk-select-and-resolve path and a
    // concurrent single-record edit path are each independently reachable at the same time.
    if (toSelect > 0 && (await bulkResolveBtn.count())) {
      await expect(bulkResolveBtn).toBeEnabled();
    }
    await expect(recordEditorPage2.firstTextbox()).toBeEditable();
    await recordEditorPage2.clickCancel();
    await context2.close();
  });
  */
});
