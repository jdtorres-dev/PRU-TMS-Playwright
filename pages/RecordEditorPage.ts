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

export type ActionMenuItem = 'Resolve' | 'Hold' | 'Delete' | 'Transfer';

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

  async clickEdit(): Promise<void> {
    await this.page.getByRole('button', { name: /^Edit$/i }).click();
  }

  async clickSave(): Promise<void> {
    // Header buttons in Edit mode are Cancel / Save Changes / Submit - no plain "Save".
    await this.page.getByRole('button', { name: /^Save Changes$/i }).click();
  }

  async clickSubmit(): Promise<void> {
    await this.page.getByRole('button', { name: /^Submit$/i }).click();
  }

  async clickCancel(): Promise<void> {
    await this.page.getByRole('button', { name: /^Cancel$/i }).click();
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
   * Searches CB Records for the confirmed test policy number and opens the matching
   * record (General Information renders by default).
   */
  async openConfirmedTestRecord(): Promise<void> {
    const errorManager = new ErrorManagerPage(this.page);
    // Reopening a record (e.g. after a refused save) starts from inside the record editor,
    // not the search screen, so navigate back to Error Manager before searching again.
    await errorManager.goto();
    // "Current Week" (the default scope) is week-relative, so switch to "All Weeks" first
    // so the search isn't time-sensitive.
    await errorManager.allWeeksRadio().check();
    await errorManager.policyNumberField().fill(TEST_POLICY_NUMBER);
    await errorManager.viewRecords();
    // The Result Grid's Error column has been observed live rendering the control number as
    // a link, a plain cell, or (current build) a button - matching all three keeps this
    // resilient to that presentation detail rather than re-breaking on the next UI tweak.
    await this.page
      .getByRole('link', { name: new RegExp(`^${TEST_ERROR_ID}$`) })
      .or(this.page.getByRole('button', { name: new RegExp(`^${TEST_ERROR_ID}$`) }))
      .or(this.page.getByRole('cell', { name: new RegExp(`^${TEST_ERROR_ID}$`) }))
      .first()
      .click();
  }
}
