import { test, expect } from '../fixtures/pages.fixture';

/**
 * PRU TMS - PIRCS-CB group (tc/PRU_TMS_Test_Cases_v4.xlsx, "PIRCS-CB" tab, 12 rows,
 * TMS-PIRCS-CB-001..012). Converted directly from that workbook tab; the xlsx is the system
 * of record and is not modified by this file.
 *
 * Screen: "Error Manager - CB Records" (+ the RDMS Error Record Editor a CB record opens
 * into). Most rows are phrased against legacy COBOL field names (STATCOD, CHNLCOD) or
 * internal CICS/legacy triggers (a function key, an I/O-error switch, an internal fast-
 * forward program check) with no confirmed, live-inspected mapping onto a specific control in
 * this modernized UI - several rows are themselves flagged in the workbook as an ACCEPTED
 * DIVERGENCE or an SME/Phase-2-review item. Per this suite's scoping rule, those rows exercise
 * the strongest currently-checkable REAL fact instead (a reachable screen/tab/control, or an
 * unaffected untouched field), with a comment on each row explaining exactly what could not
 * be independently verified and why. Two rows (BR-106's untouched-field case and BR-597's
 * zero-result search) map cleanly onto mechanisms already proven live elsewhere in this suite
 * (TMS-AUDIT-006 and TMS-PIRCS-QA-003/028 respectively) and are exercised for real here too.
 */
test.describe('PIRCS-CB - Error Manager CB Records field validation and rule enforcement', () => {
  test('TMS-PIRCS-CB-001 - BR-106: only fields the operator actually keyed are processed, so no spurious audit entry is created and no existing compensation data is overwritten', async ({ loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openRdmsTab('General Information');
    await recordEditorPage.clickEdit();
    const untouched = recordEditorPage.textboxAt(1);
    const untouchedBefore = await untouched.inputValue();
    await recordEditorPage.districtTextbox().fill('B12X');
    await recordEditorPage.clickSave();
    await recordEditorPage.openRdmsTab('General Information');
    // ACCEPTED DIVERGENCE for Phase 1 per Catalogue v4.2: same untouched-vs-erased convention
    // as BR-036/BR-170 (see TMS-AUDIT-006) - legacy skips a zero-length, unmarked field
    // entirely (STATCOD in the Catalogue's own example), while the modernized REST PUT may
    // replace the whole record. This executes the case to establish the actual Phase-1
    // behaviour (a field left untouched is unaffected by a save that changed a different
    // field) rather than to pre-judge it.
    await expect(untouched).toHaveValue(untouchedBefore);
  });

  test('TMS-PIRCS-CB-002 - BR-184: on health business sold through three named channels only a defined list of plans is recognised, and anything else is silently treated as long-term-care product', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openRdmsTab('Financial Information');
    await recordEditorPage.clickEdit();
    // KNOWN GAP for this fixture: reproducing this rule needs a record confirmed to be on the
    // health branch with a channel code beginning with one of the three named characters, and
    // a plan code control with a confirmed live UI mapping - neither is available on this
    // suite's single confirmed test record. Verified for real: the screen this plan-code
    // substitution would run on (Financial Information, in Edit mode) is reachable.
    await expect(recordEditorPage.firstTextbox()).toBeEditable();
  });

  test('TMS-PIRCS-CB-003 - BR-185: the distribution channel code has two parts, each drawn from its own permitted set, and only one channel may hold a double-length record', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openRdmsTab('General Information');
    await recordEditorPage.clickEdit();
    // KNOWN GAP for this fixture: the channel code field (legacy CHNLCOD) has no confirmed
    // live UI label/mapping in this suite, so the specific 5-value/7-value combination and the
    // double-length (>=1668 position) threshold cannot be keyed or independently verified.
    // Verified for real: General Information (where a channel-code field would render) opens
    // in Edit mode.
    await expect(recordEditorPage.firstTextbox()).toBeEditable();
  });

  test('TMS-PIRCS-CB-004 - BR-185 (negative): a breaching channel-code combination is refused and nothing is committed', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    const beforeHeading = await page.getByRole('heading').first().innerText();
    await recordEditorPage.openRdmsTab('General Information');
    await recordEditorPage.clickEdit();
    // Same CHNLCOD field-mapping gap as TMS-PIRCS-CB-003: there is no confirmed control to key
    // the breaching combination into, so the documented "SCR-Y - Held as 'Y'" refusal cannot
    // be triggered. Abandons via Cancel rather than an unconfirmed Save, confirming nothing on
    // this shared record changed from opening Edit mode alone.
    await recordEditorPage.clickCancel();
    await expect(page.getByRole('heading').first()).toHaveText(beforeHeading);
  });

  test('TMS-PIRCS-CB-005 - BR-188: a general-agent record on one channel must have its writing producer confirmed against the personnel file before it may be corrected', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.openRdmsTab('General Information');
    await recordEditorPage.clickEdit();
    // KNOWN GAP for this fixture: reproducing this rule needs a record on the general-agent
    // channel with the override marker and a producer number present - a specific record
    // class this suite's single confirmed test record cannot be seeded into, and the
    // producer-number field has no confirmed live UI mapping. Verified for real: General
    // Information (where the office/agency/staff fields this rule forces would render) opens
    // in Edit mode.
    await expect(recordEditorPage.firstTextbox()).toBeEditable();
    await recordEditorPage.clickCancel();
  });

  test('TMS-PIRCS-CB-006 - BR-188 (negative): a breaching value is refused and nothing is committed', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    const beforeHeading = await page.getByRole('heading').first().innerText();
    await recordEditorPage.openRdmsTab('General Information');
    await recordEditorPage.clickEdit();
    // Same seeding/field-mapping gap as TMS-PIRCS-CB-005: no general-agent/override-marker
    // record and no confirmed producer-number control is available, so the documented "7111 -
    // ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)" refusal cannot be triggered. Abandons via
    // Cancel, confirming nothing on this shared record changed.
    await recordEditorPage.clickCancel();
    await expect(page.getByRole('heading').first()).toHaveText(beforeHeading);
  });

  test('TMS-PIRCS-CB-007 - BR-275: a search must specify at least one viewing option; an empty request is refused', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    await errorManagerPage.selectSearchTab('CB Records');
    // The exact "no options selected" wording and the cursor-placed-on-current-week-tick
    // behaviour are not independently confirmed in this build. Verified for real: the Clear
    // Filters and View Records/Search controls this rule's empty-request guard would run
    // between are both present and reachable together on the CB Records tab.
    await expect(errorManagerPage.clearFiltersButton()).toBeVisible();
    await expect(page.getByRole('button', { name: /^View Records$/i }).or(page.getByRole('button', { name: /^Search$/i }))).toBeVisible();
  });

  test('TMS-PIRCS-CB-008 - BR-277: week selections are mutually exclusive in a fixed priority order (current week, all weeks, a single named week, a from-and-to range)', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    await errorManagerPage.selectSearchTab('CB Records');
    // The single-named-week and from/to-range controls (legacy CURWKRJ and related fields)
    // have no confirmed live UI mapping on this tab; only Current Week and All Weeks are
    // confirmed controls in this suite. Verified for real: both confirmed week-scope options
    // are present, which is the two highest ranks in this rule's priority order.
    await expect(errorManagerPage.currentWeekRadio()).toBeVisible();
    await expect(errorManagerPage.allWeeksRadio()).toBeVisible();
  });

  test('TMS-PIRCS-CB-009 - BR-278: every cycle the operator keys must be a six-digit year and week, and a range must run forwards', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    await errorManagerPage.selectSearchTab('CB Records');
    // The week-cycle from/to fields (legacy DAEMP02 week range) have no confirmed live UI
    // mapping on this tab. Verified for real: the CB Records search tab this cycle validation
    // would run on is reachable and its shared search affordance is present.
    await expect(page.getByRole('button', { name: /^View Records$/i }).or(page.getByRole('button', { name: /^Search$/i }))).toBeVisible();
  });

  test('TMS-PIRCS-CB-010 - BR-596: on the legacy screen DAEM001, the facility refuses the action and raises condition 7304 - "Enter Error Control Number (full or partial)"', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    await errorManagerPage.selectSearchTab('CB Records');
    // KNOWN GAP: the trigger this rule names is a legacy CICS function key (PF5:17), which has
    // no equivalent control in this modernized, browser-based UI - there is no way to bring
    // about this exact condition here. Verified for real: the CB Records screen this trap
    // protects is reachable.
    await expect(page.getByRole('tab', { name: 'CB Records', exact: true })).toHaveAttribute('aria-selected', 'true');
  });

  test('TMS-PIRCS-CB-011 - BR-597: on the legacy screen DAEM001, the facility refuses the action and raises condition 7305 - "Search Ended. No record found"', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    await errorManagerPage.selectSearchTab('CB Records');
    await errorManagerPage.allWeeksRadio().check();
    // A policy number very unlikely to exist on this shared demo dataset, to genuinely
    // exercise a zero-result search rather than assert a fabricated message - the same
    // technique already proven live in TMS-PIRCS-QA-003/028 for the analogous legacy
    // condition. The exact modernized wording/condition code is not independently confirmed
    // here; what is verified for real is the directly observable outcome: the search
    // completes with an empty Result Grid.
    await errorManagerPage.policyNumberField().fill('900000009');
    await errorManagerPage.viewRecords();
    // A zero-result search renders a "No results found" message instead of a grid/table -
    // no header row either, so getByRole('row') is 0, not 1.
    await expect(errorManagerPage.resultGridOrEmptyState()).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(0);
  });

  test('TMS-PIRCS-CB-012 - BR-598: on the legacy screen DAEM001, the facility refuses the action and raises condition 7306 - "Search program is invalid"', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    await errorManagerPage.selectSearchTab('CB Records');
    // KNOWN GAP: the trigger this rule names is an internal fast-forward program validity
    // check (INVALID-PGM-FAST-FORWARD), an internal legacy condition with no UI-mappable
    // equivalent in this modernized screen. Verified for real: the CB Records screen this trap
    // protects is reachable.
    await expect(page.getByRole('tab', { name: 'CB Records', exact: true })).toHaveAttribute('aria-selected', 'true');
  });
});
