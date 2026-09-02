import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { ErrorManagerPage } from './ErrorManagerPage';
import { BASE_URL, TEST_POLICY_NUMBER, TEST_ERROR_ID } from '../test-data/constants';

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

  // Cancel with unsaved changes pending opens a "Discard changes?" confirmation dialog
  // (Keep editing / Discard) that must be confirmed before edit mode actually exits; a plain
  // Cancel click alone leaves that dialog open (and the background inert, so role queries
  // against the record's fields resolve to nothing until it's dismissed). Cancel with no
  // pending changes exits directly with no dialog, so the Discard click is best-effort.
  async cancelDialog(): Promise<void> {
    await this.page.getByRole('button', { name: /^Cancel$/i }).click();
    const discardButton = this.page.getByRole('button', { name: /^Discard$/i });
    try {
      await discardButton.waitFor({ state: 'visible', timeout: 3000 });
      await discardButton.click();
    } catch {
      // No unsaved-changes confirmation appeared - Cancel already exited edit mode.
    }
  }

  firstTextbox(): Locator {
    return this.page.getByRole('textbox').first();
  }

  // Outside edit mode, General Information renders each field as a label/value pair (a
  // <span> label followed by a <span> value), not an <input> - so a field's displayed value
  // can only be read this way once editing has ended (e.g. after cancelDialog() discards a
  // pending correction), not via firstTextbox()/textboxAt(), which only match in edit mode.
  viewFieldValue(label: string): Locator {
    return this.page.getByText(new RegExp(`^${label}$`, 'i')).locator('xpath=following-sibling::*[1]');
  }

  // Not firstTextbox(): that resolves to Policy Number, the field openConfirmedTestRecord()
  // searches by, so saving a changed value would break every later lookup of this shared
  // fixture record. District is the field TMS-E2E-001 already proves reaches a clean
  // successful save on this record when given a format-compliant value (char 1 alphabetic,
  // chars 2-4 alphanumeric/space, chars 2-3 not both blank). No .or(firstTextbox()) fallback:
  // District always renders its own label here, and .or() unions matches rather than
  // preferring one, so pairing it with firstTextbox() causes a strict-mode violation once
  // both resolve.
  districtTextbox(): Locator {
    return this.page.getByLabel(/District/i);
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

  // This shared fixture record lives in the RDMS error-suspense queue, so its Financial
  // section can carry pre-existing required fields (Split Credit, OORD Chrg Dist) left
  // blank from whatever correction is still outstanding on it. Save validates the whole
  // record, not just the section a caller is editing, so those blanks refuse every save
  // - including ones that only touch General - until filled. Call this right after
  // clickEdit(), before any test-specific edit, so a save later in the flow isn't
  // refused for a reason unrelated to what's under test. Idempotent: does nothing if the
  // fields already carry a value. Leaves the record on the General Information tab and
  // back in Edit mode.
  async resolveFinancialPrerequisites(): Promise<void> {
    await this.openRdmsTab('Financial Information');
    const splitCredit = this.page.locator('label:has-text("Split Credit") input[role="combobox"]');
    const oordChrgDist = this.page.locator('label:has-text("OORD Chrg Dist") input');
    const splitCreditEmpty = (await splitCredit.inputValue().catch(() => '')) === '';
    const oordChrgDistEmpty = (await oordChrgDist.inputValue().catch(() => '')) === '';

    if (splitCreditEmpty || oordChrgDistEmpty) {
      if (splitCreditEmpty) {
        const option = this.page.getByRole('option', { name: /No split/i });
        // The dropdown's open animation occasionally swallows the first click - retry
        // rather than fail the whole prerequisite fix over a timing flake.
        for (let attempt = 0; attempt < 3 && !(await option.isVisible().catch(() => false)); attempt++) {
          await splitCredit.click();
          await option.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        }
        await option.click();
      }
      if (oordChrgDistEmpty) {
        await oordChrgDist.fill('B12A');
      }
      await this.clickSave();
      // The multi-tab edit form resets a tab's fields to blank once you've navigated
      // away from it, even after that tab's own save succeeded - so a second save from
      // another tab later in the flow would silently resubmit Financial as blank again
      // and undo this fix. Reloading forces a fresh fetch of the now-persisted values
      // before the caller starts its own edit, so that second save doesn't clobber them.
      await this.page.reload();
      await this.clickEdit();
    }
    await this.openRdmsTab('General Information');
  }

  /**
   * Searches CB Records for the confirmed test policy number and opens the matching
   * record (General Information renders by default).
   */
  async openConfirmedTestRecord(): Promise<void> {
    const errorManager = new ErrorManagerPage(this.page);
    // Re-enter through the Error Manager search screen (CB Records, its default tab)
    // regardless of where the caller currently is - e.g. a prior clickHistory() navigates
    // to a standalone Audit History page with no "All Weeks" radio, so a second call in
    // the same test needs this to get back rather than timing out against the wrong page.
    await this.page.goto(`${BASE_URL}/errors`);
    // "Current Week" (the default scope) is week-relative, so switch to "All Weeks" first
    // so the search isn't time-sensitive.
    await errorManager.allWeeksRadio().check();
    await errorManager.policyNumberField().fill(TEST_POLICY_NUMBER);
    await errorManager.viewRecords();
    await this.page
      .getByRole('link', { name: new RegExp(`^${TEST_ERROR_ID}$`) })
      .or(this.page.getByRole('cell', { name: new RegExp(`^${TEST_ERROR_ID}$`) }))
      .first()
      .click();
  }
}
