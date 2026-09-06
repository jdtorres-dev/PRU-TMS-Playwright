import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { ErrorManagerPage } from './ErrorManagerPage';
import { TEST_POLICY_NUMBER, TEST_ERROR_ID } from '../test-data/constants';

export type RdmsTab =
  | 'General Information'
  | 'Financial Information'
  | 'Customer Information'
  | 'Trailer'
  | 'Trailer Information'
  | 'Contracts'
  | 'Contracts Information'
  | 'Additional Information';

export type ActionMenuItem = 'Resolve' | 'Hold' | 'Delete' | 'Transfer' | 'Schedule Release';

/**
 * RDMS Error Record Editor: the six-tab record view/edit surface (General, Financial,
 * Customer, Trailer, Contracts, Additional Information), its header actions (Edit / Save
 * Changes / Actions / History) and the Actions-menu dispositions (Resolve/Hold/Delete/
 * Transfer) opened from it.
 */
export class RecordEditorPage extends BasePage {
  async openRdmsTab(tab: RdmsTab): Promise<void> {
    // The RDMS sidebar renders short labels (General/Financial/Customer/Trailer/
    // Contracts/Additional), not the full "X Information" names.
    const shortName = tab.replace(/ Information$/, '');
    await this.page.getByRole('tab', { name: shortName }).or(this.page.getByRole('link', { name: shortName })).click();
  }

  async clickEdit(options: { force?: boolean } = {}): Promise<void> {
    // force: a transient "success" toast can sit directly over this button right after a
    // Save and hasn't been observed to clear within the default click retry window - callers
    // re-entering Edit immediately after Save (to verify the saved value) pass force:true to
    // click through it rather than fail on an intercepted-pointer-events timeout.
    await this.page.getByRole('button', { name: /^Edit$/i }).click({ force: options.force });
  }

  async clickSave(): Promise<void> {
    // Header buttons in Edit mode are Cancel / Save Changes / Submit - no plain "Save".
    await this.page.getByRole('button', { name: /^Save Changes$/i }).click();
  }

  async clickSubmit(): Promise<void> {
    await this.page.getByRole('button', { name: /^Submit$/i }).click();
  }

  async clickCancel(): Promise<void> {
    // Live-confirmed: right after a Save that surfaces a banner (a
    // pre-existing screening error, or 7114 NO_CORRECTIONS_MADE), the
    // header Cancel button can stay disabled/be torn down and re-attached
    // for the app's whole post-save transition - long enough that even a
    // single click()'s own built-in actionability retry (bounded by
    // actionTimeout) can run out before the button ever settles. Retrying
    // the click itself (each attempt getting its own fresh actionability
    // window) survives that longer transition instead of failing loudly
    // the first time the window is too short.
    const cancelButton = this.page.getByRole('button', { name: /^Cancel$/i });
    for (let attempt = 0; ; attempt++) {
      try {
        await cancelButton.click({ timeout: 15_000 });
        break;
      } catch (err) {
        if (attempt >= 2) throw err;
      }
    }
    // Cancelling with pending field edits opens a "Discard changes?"
    // confirmation on top of the editor - click through it so the record
    // actually leaves Edit mode instead of leaving that modal stuck open
    // (which then blocks the next Edit click).
    const discardButton = this.page.getByRole('button', { name: /^Discard$/i });
    if (await discardButton.count()) {
      await discardButton.click();
    }
  }

  async clickActions(): Promise<void> {
    await this.page.getByRole('button', { name: /^Actions$/i }).click();
  }

  async clickHistory(): Promise<void> {
    await this.page.getByRole('button', { name: /^History$/i }).click();
  }

  async openActionsItem(item: ActionMenuItem): Promise<void> {
    await this.clickActions();
    await this.page.getByRole('menuitem', { name: new RegExp(`^${item}$`, 'i') }).click();
  }

  async cancelDialog(): Promise<void> {
    await this.page.getByRole('button', { name: /^Cancel$/i }).click();
  }

  firstTextbox(): Locator {
    return this.page.getByRole('textbox').first();
  }

  textboxAt(index: number): Locator {
    return this.page.getByRole('textbox').nth(index);
  }

  editButton(): Locator {
    return this.page.getByRole('button', { name: /^Edit$/i });
  }

  saveChangesButton(): Locator {
    return this.page.getByRole('button', { name: /^Save Changes$/i });
  }

  /**
   * Searches CB Records for a specific policy number/error ID pair and opens the matching
   * record (General Information renders by default). Shared by openConfirmedTestRecord()
   * (the static suite-wide fixture) and any test that dynamically looks up its own eligible
   * record instead (e.g. via ErrorManagerPage.findEligibleHeldRecord()) rather than depending
   * on that one static fixture.
   */
  async openRecord(policyNumber: string, errorId: string): Promise<void> {
    const errorManager = new ErrorManagerPage(this.page);
    // Reopening a record (e.g. after a refused save) starts from inside the record editor,
    // not the search screen, so navigate back to Error Manager before searching again.
    await errorManager.goto();
    // Live-confirmed: the search screen does not reliably land on CB Records by default, and
    // held records only turn up under that tab - selecting it explicitly avoids a silent
    // 0-results search on whichever tab happened to be active.
    await errorManager.selectSearchTab('CB Records');
    // "Current Week" (the default scope) is week-relative, so switch to "All Weeks" first
    // so the search isn't time-sensitive.
    await errorManager.allWeeksRadio().check();
    await errorManager.policyNumberField().fill(policyNumber);
    await errorManager.viewRecords();
    // The Result Grid's Error column has been observed live rendering the control number as
    // a link, a plain cell, or (current build) a button - matching all three keeps this
    // resilient to that presentation detail rather than re-breaking on the next UI tweak.
    await this.page
      .getByRole('link', { name: new RegExp(`^${errorId}$`) })
      .or(this.page.getByRole('button', { name: new RegExp(`^${errorId}$`) }))
      .or(this.page.getByRole('cell', { name: new RegExp(`^${errorId}$`) }))
      .first()
      .click();
  }

  /**
   * Searches CB Records for a policy number and opens whichever record the search finds,
   * without also needing its error ID (unlike openRecord()). For fixtures where only the
   * policy number is dedicated/known ahead of time (see SECONDARY_TEST_POLICY_NUMBER in
   * test-data/constants.ts).
   *
   * Not ErrorManagerPage.openFirstResultRow(): this grid's data rows render as a clickable
   * <button> wrapping all cells directly under the table's rowgroup, with no intervening
   * "row"-role element at all (only the header row keeps that role) - openFirstResultRow()'s
   * getByRole('row').nth(1) never matches a data row here. The Error column's control number
   * (a link, plain cell, or button depending on build - see openRecord()) is the one purely
   * numeric name on the page, which uniquely identifies it without needing that ID up front.
   */
  async openRecordByPolicyNumber(policyNumber: string): Promise<void> {
    const errorManager = new ErrorManagerPage(this.page);
    await errorManager.goto();
    await errorManager.selectSearchTab('CB Records');
    await errorManager.allWeeksRadio().check();
    await errorManager.policyNumberField().fill(policyNumber);
    await errorManager.viewRecords();
    await this.page
      .getByRole('link', { name: /^\d+$/ })
      .or(this.page.getByRole('button', { name: /^\d+$/ }))
      .or(this.page.getByRole('cell', { name: /^\d+$/ }))
      .first()
      .click();
  }

  /**
   * Opens the suite-wide shared fixture record (TEST_POLICY_NUMBER/TEST_ERROR_ID in
   * test-data/constants.ts). Most tests in this suite use this - it's fine for tests that
   * only need *some* open, editable record and either don't mutate it or fully restore what
   * they change. Tests that must NOT compete with everything else mutating that one record
   * (see ErrorManagerPage.findEligibleHeldRecord()) should call openRecord() with their own
   * dynamically-selected record instead.
   */
  async openConfirmedTestRecord(): Promise<void> {
    return this.openRecord(TEST_POLICY_NUMBER, TEST_ERROR_ID);
  }
}
