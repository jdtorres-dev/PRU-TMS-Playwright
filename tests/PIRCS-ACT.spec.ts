import { test, expect } from '../fixtures/pages.fixture';

/**
 * PRU TMS - PIRCS-ACT group (PIRCS-ACT.csv, 29 rows, TMS-PIRCS-ACT-001..029).
 * Converted from PRU TMS NEW\PIRCS-ACT.csv (2026-08-25). The CSV is the
 * system of record and is not modified by this file.
 *
 * Most rows document legacy Business Rules Catalogue v4.2 conditions phrased
 * against COBOL field names (e.g. STATCOD, CHNLCOD) or purely server-side
 * conversation state (regional dataset selection, conversation-carried
 * region pairs) that have no confirmed, live-inspected mapping onto a
 * specific control in this modernized UI, and several rows are themselves
 * flagged in the CSV as KNOWN GAP / PHASE-1 GAP (documented, not yet wired
 * server-side). Per this suite's scoping rule, those rows assert the
 * strongest currently-checkable REAL fact (a reachable screen/dialog/control,
 * a structurally-enforced constraint such as a readonly field, or a
 * confirmed dialog/menu affordance) rather than fabricate the specific
 * legacy outcome; each such row carries its own short comment explaining
 * exactly what could not be independently verified and why.
 */
test.describe('PIRCS-ACT - Disposition control and regional partitioning', () => {
  test("TMS-PIRCS-ACT-001 - BR-011: the operator's regional office recorded at sign-on determines which region's data they work on", async ({ page, loginPage }) => {
    await loginPage.loginAsValidUser();
    await expect(page).toHaveURL(/\/errors/);
    await expect(page.getByRole('tab', { name: 'CB Records', exact: true })).toBeVisible();
    // BR-011's dataset-per-region partitioning (five dataset stems keyed by
    // sign-on region) is resolved server-side; this suite has only one
    // operator/region account, so the partitioning itself can't be
    // independently exercised. Confirms the one observable precondition:
    // sign-on succeeds and lands the operator on their region's landing page.
  });

  test('TMS-PIRCS-ACT-002 - BR-012: the regional office recorded at sign-on must be one the facility still supports', async ({ page, loginPage }) => {
    await loginPage.loginAsValidUser();
    await expect(page).toHaveURL(/\/errors/);
    // The seven-entry region table, its two silent re-mappings and the
    // retired-office choice screen are all sign-on-time server logic with no
    // UI surface to key an unsupported region code into (this suite signs on
    // with a single fixed, supported admin/admin account). Confirms only
    // that a supported region's sign-on succeeds.
  });

  test('TMS-PIRCS-ACT-003 - BR-032: the disposition an operator may request is restricted to a defined set', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickActions();
    // The four dispositions actually offered are this UI's realization of
    // BR-032's "defined set" of requestable dispositions.
    const items = page.getByRole('menuitem');
    await expect(items).toHaveCount(4);
    await expect(items.nth(0)).toHaveText('Resolve');
    await expect(items.nth(1)).toHaveText('Hold');
    await expect(items.nth(2)).toHaveText('Delete');
    await expect(items.nth(3)).toHaveText('Transfer');
    await page.keyboard.press('Escape');
  });

  test('TMS-PIRCS-ACT-004 - BR-060: service register suspensions in reason range 0400-0499 may never be deleted', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openActionsItem('Delete');
    await expect(page.getByRole('heading', { name: 'Confirm Delete' })).toBeVisible();
    // KNOWN/PHASE-1 GAP (Catalogue v4.2): the reason-range guard (error_id
    // 0400-0499 on an I1/CB1 service-register suspension) is documented but
    // not yet wired into the delete endpoint, and this fixture record isn't
    // seeded in that exact reason range, so the refusal itself can't be
    // triggered. Confirms only that the Delete confirmation path this rule
    // would refuse is reachable; does not confirm the delete for real, to
    // avoid mutating the shared fixture ahead of the guard existing.
    await recordEditorPage.cancelDialog();
  });

  test('TMS-PIRCS-ACT-005 - BR-060 (negative): a delete against the reserved reason range must be refused and nothing committed', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    const beforeHeading = await page.getByRole('heading').first().innerText();
    await recordEditorPage.openActionsItem('Delete');
    await expect(page.getByRole('heading', { name: 'Confirm Delete' })).toBeVisible();
    // Same KNOWN GAP as TMS-PIRCS-ACT-004: no seeded 0400-0499/CB1 record
    // exists to genuinely breach the constraint, and the server-side guard
    // isn't wired yet. Cancels rather than confirming, then re-reads the
    // record heading to confirm opening the dialog alone changed nothing.
    await recordEditorPage.cancelDialog();
    await expect(page.getByRole('heading').first()).toHaveText(beforeHeading);
  });

  test('TMS-PIRCS-ACT-006 - BR-061: a transaction cannot be corrected and deleted in the same action', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openActionsItem('Delete');
    await page.getByLabel(/^Reason$/i).click();
    const options = page.getByRole('option');
    await expect(options.first()).toBeVisible();
    // The Delete reason list itself names this exact combination, the
    // modernized UI's realization of BR-061's prohibition.
    await expect(page.getByRole('option', { name: /Correcting And Deleting/i })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('TMS-PIRCS-ACT-007 - BR-061 (negative): selecting Correcting-And-Deleting still requires an explicit confirm, nothing is committed on cancel', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openActionsItem('Delete');
    await page.getByLabel(/^Reason$/i).click();
    await page.getByRole('option', { name: /Correcting And Deleting/i }).click();
    // Documents the breach path up to (not including) commit: selecting this
    // reason alone does not delete the record - Delete remains a separate,
    // explicit confirm. Cancels rather than submitting for real, to avoid
    // mutating the shared fixture; the server-side refusal message (TS-C)
    // itself is not independently exercised here.
    await expect(page.getByRole('button', { name: /^Delete$/i })).toBeVisible();
    await recordEditorPage.cancelDialog();
  });

  test('TMS-PIRCS-ACT-008 - BR-062: compensation on the reserved management agency may not be released while a producer number is present', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openActionsItem('Resolve');
    await expect(page.getByRole('heading', { name: 'Resolve Record' })).toBeVisible();
    // The agency-998 / non-zero-producer-number precondition can't be seeded
    // on this shared fixture, so the specific refusal can't be triggered.
    // Confirms only that the Resolve (release) path this rule would refuse
    // is itself reachable.
    await recordEditorPage.cancelDialog();
  });

  test('TMS-PIRCS-ACT-009 - BR-062 (negative): a release breaching the reserved-agency constraint is refused and nothing is committed', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    const beforeHeading = await page.getByRole('heading').first().innerText();
    await recordEditorPage.openActionsItem('Resolve');
    await expect(page.getByRole('heading', { name: 'Resolve Record' })).toBeVisible();
    // Same seeding gap as TMS-PIRCS-ACT-008. Cancels rather than confirming,
    // then re-reads the heading to confirm nothing changed from opening the
    // dialog alone.
    await recordEditorPage.cancelDialog();
    await expect(page.getByRole('heading').first()).toHaveText(beforeHeading);
  });

  test('TMS-PIRCS-ACT-010 - BR-063: a transaction may only be transferred to a recognised regional office', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openActionsItem('Transfer');
    // The Target RHO control is a closed dropdown, not free text, so an
    // office outside the recognised set structurally cannot even be entered.
    const targetRho = page.getByLabel(/Target RHO/i);
    await expect(targetRho).toHaveAttribute('readonly', '');
    await recordEditorPage.cancelDialog();
  });

  test('TMS-PIRCS-ACT-011 - BR-063 (negative): an unrecognised office cannot even be keyed into the transfer target', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openActionsItem('Transfer');
    const targetRho = page.getByLabel(/Target RHO/i);
    await expect(targetRho).toHaveAttribute('readonly', '');
    // Confirms the breach path is refused structurally rather than by a
    // save-time validation message: readonly means no invalid value can be
    // typed in the first place, so there is nothing to reject at save time.
    await recordEditorPage.cancelDialog();
  });

  test('TMS-PIRCS-ACT-012 - BR-067: the operator is told exactly what happened to the transaction after a disposition change', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    // Exact post-save banner wording (MESS-3/MESS-5/MESS-6) is not
    // independently verified here - committing a real disposition change
    // would mutate the shared fixture. What IS confirmed: each disposition's
    // entry dialog carries its own distinct, disposition-specific
    // description up front, the UI's pre-commit realization of "the business
    // confirms exactly what happened".
    await recordEditorPage.openActionsItem('Resolve');
    await expect(page.getByText('Sets status to Released (R). Requires a resolution reason.', { exact: true })).toBeVisible();
    await recordEditorPage.cancelDialog();
    await recordEditorPage.openActionsItem('Hold');
    await expect(page.getByText("Sets status to Held (H), for when the operator can't resolve immediately. Requires a hold reason.", { exact: true })).toBeVisible();
    await recordEditorPage.cancelDialog();
  });

  test('TMS-PIRCS-ACT-013 - BR-068: a corrected transaction may be held back for a stated number of weeks', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openActionsItem('Hold');
    // Precondition for a delayed release to be settable at all: a keyable
    // weeks-count control on the Hold dialog. Documented live gap: this
    // dialog currently exposes no numeric/spinbutton control of any kind, so
    // this assertion is expected to fail until that control exists.
    await expect(page.getByRole('spinbutton')).toHaveCount(1);
    await recordEditorPage.cancelDialog();
  });

  test('TMS-PIRCS-ACT-014 - BR-079: a body of fields is never editable online because the system derives and overwrites them', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickEdit();
    // Checks two of the fourteen named derived fields: Branch (renders as
    // header display text, not a form field - structurally non-editable) and
    // Region (live-inspected as a normal keyable textbox in Edit mode in the
    // prior v3 conversion of this suite - expected to fail for Region,
    // honestly documenting that this field is not treated as derived/
    // read-only the way BR-079 requires).
    await expect(page.getByRole('textbox', { name: /^Branch$/i })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: /^Region$/i })).toHaveCount(0);
  });

  test("TMS-PIRCS-ACT-015 - BR-082: the operator's own region and the record's region are carried separately in the conversation", async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    // The dual operator-region/record-region distinction this rule describes
    // is server-side conversation state, not something distinctly rendered
    // on screen. Confirms the one observable precondition: the record opens
    // successfully in the RDMS Error Record Editor for this operator's
    // session.
    await expect(page.getByRole('tab', { name: 'General' })).toBeVisible();
  });

  test('TMS-PIRCS-ACT-016 - BR-181: three product branches may only be booked by the overseas office', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickEdit();
    // No branch-code field with a confirmed live UI mapping was found to key
    // a barred/restricted branch value into on this fixture record. Confirms
    // only that General Information (where a branch-like field would
    // render) is reachable in Edit mode.
    await expect(page.getByRole('tab', { name: 'General' })).toBeVisible();
  });

  test('TMS-PIRCS-ACT-017 - BR-181 (negative): a barred branch/office combination is refused and nothing is committed', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickEdit();
    // Same field-mapping gap as TMS-PIRCS-ACT-016.
    await expect(page.getByRole('tab', { name: 'General' })).toBeVisible();
  });

  test('TMS-PIRCS-ACT-018 - BR-131: a transaction cannot be transferred to an office that refuses transfers, nor to its own office', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openActionsItem('Transfer');
    // Same closed-dropdown mechanism as BR-063 (TMS-PIRCS-ACT-010) enforces
    // this layered restriction too; the specific reserved-office and
    // same-office-owner cases aren't isolated individually since this
    // fixture's office table can't be seeded per case.
    const targetRho = page.getByLabel(/Target RHO/i);
    await expect(targetRho).toHaveAttribute('readonly', '');
    await recordEditorPage.cancelDialog();
  });

  test('TMS-PIRCS-ACT-019 - BR-131 (negative): a barred transfer destination cannot even be keyed in', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openActionsItem('Transfer');
    const targetRho = page.getByLabel(/Target RHO/i);
    await expect(targetRho).toHaveAttribute('readonly', '');
    await recordEditorPage.cancelDialog();
  });

  test('TMS-PIRCS-ACT-020 - BR-132: a replacement record already copied to every office must not be transferred again', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openActionsItem('Transfer');
    await expect(page.getByRole('heading', { name: 'Transfer Record' })).toBeVisible();
    // The replacement-created marker precondition can't be seeded on this
    // shared fixture, so the specific refusal can't be triggered. Confirms
    // only that the transfer path this rule would refuse is reachable.
    await recordEditorPage.cancelDialog();
  });

  test('TMS-PIRCS-ACT-021 - BR-132 (negative): re-transferring an already-everywhere replacement is refused and nothing is committed', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    const beforeHeading = await page.getByRole('heading').first().innerText();
    await recordEditorPage.openActionsItem('Transfer');
    await expect(page.getByRole('heading', { name: 'Transfer Record' })).toBeVisible();
    await recordEditorPage.cancelDialog();
    await expect(page.getByRole('heading').first()).toHaveText(beforeHeading);
  });

  test('TMS-PIRCS-ACT-022 - BR-261: a suspended transaction may only be given a recognised disposition', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickActions();
    const items = page.getByRole('menuitem');
    await expect(items).toHaveCount(4);
    // KNOWN/PHASE-1 GAP (Catalogue v4.2): BR-261 additionally documents Print
    // and Change-of-Location as recognised actions distinct from the 5
    // dispositions; neither exists as a menu item here, confirming/
    // documenting the gap the Catalogue itself records.
    await expect(page.getByRole('menuitem', { name: /Print/i })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: /Change.*Location/i })).toHaveCount(0);
    await page.keyboard.press('Escape');
  });

  test('TMS-PIRCS-ACT-023 - BR-261 (negative): an out-of-set action cannot even be selected from the Actions menu', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickActions();
    // The Actions menu is a fixed, closed list - "keying an out-of-set
    // value" does not map onto this UI (there is no free-text action field
    // to breach); confirms structurally that no fifth/unrecognised item is
    // ever offered.
    await expect(page.getByRole('menuitem')).toHaveCount(4);
    await page.keyboard.press('Escape');
  });

  test('TMS-PIRCS-ACT-024 - BR-262: senior-management (RV) run suspensions may only be deleted or held, never released or transferred', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickActions();
    // This fixture is not seeded from the senior-management revenue-
    // retrieval (RV) run, so the RV-specific restriction can't be triggered;
    // Catalogue v4.2 also records this as a KNOWN GAP not enforced outside
    // the transfer endpoint. Confirms only that Delete and Hold - the two
    // dispositions this rule would still permit on an RV record - are
    // themselves offered.
    await expect(page.getByRole('menuitem', { name: 'Hold' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('TMS-PIRCS-ACT-025 - BR-264: a transfer must name a valid destination office other than the operator\'s own', async ({ page, loginPage, recordEditorPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openActionsItem('Transfer');
    const targetRho = page.getByLabel(/Target RHO/i);
    const texts = await errorManagerPage.getDropdownOptionTexts(targetRho);
    // Confirms a non-empty, closed set of destination offices is offered.
    // This fixture's exact office table may differ by environment/reseed, so
    // the specific 6-office list and the "not the sending office" exclusion
    // aren't asserted exactly here - see TMS-PIRCS-ACT-010/018 for the
    // closed-list enforcement mechanism itself.
    expect(texts.length).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
  });

  test('TMS-PIRCS-ACT-026 - BR-265: synopsis-only, replacement, and service-register transactions can never be transferred', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openActionsItem('Transfer');
    await expect(page.getByRole('heading', { name: 'Transfer Record' })).toBeVisible();
    // None of the three barred classes (synopsis branch, replacement-with-
    // copies-everywhere, service-register/I1) can be seeded on this shared
    // fixture, so the specific refusal can't be triggered. Confirms only
    // that the transfer path exists to be refused against those classes.
    await recordEditorPage.cancelDialog();
  });

  test('TMS-PIRCS-ACT-027 - BR-265 (negative): transferring a barred-class transaction is refused and nothing is committed', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    const beforeHeading = await page.getByRole('heading').first().innerText();
    await recordEditorPage.openActionsItem('Transfer');
    await expect(page.getByRole('heading', { name: 'Transfer Record' })).toBeVisible();
    await recordEditorPage.cancelDialog();
    await expect(page.getByRole('heading').first()).toHaveText(beforeHeading);
  });

  test('TMS-PIRCS-ACT-028 - BR-267: a change-of-location action re-codes paying office/agency without altering disposition', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickActions();
    // KNOWN/PHASE-1 GAP (Catalogue v4.2): the modernized system has no
    // separate change-of-location action distinct from a full cross-office
    // Transfer; confirms/documents that gap directly rather than asserting a
    // disposition-preservation behavior for an action that does not exist.
    await expect(page.getByRole('menuitem', { name: /Change.*Location/i })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'Transfer' })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('TMS-PIRCS-ACT-029 - BR-293: moving work between offices is a one-way hand-off', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openActionsItem('Transfer');
    // The dialog's own copy confirms a transfer only reassigns/pushes the
    // record to another office and leaves status unchanged - structurally a
    // one-way push, never a pull of another office's record into this one.
    // The "may never reach into another office's records" half of the rule
    // is not independently verified: this suite has only one operator/
    // region account.
    await expect(page.getByText('Reassigns the record to another RHO. Status is unchanged.', { exact: true })).toBeVisible();
    await recordEditorPage.cancelDialog();
  });
});
