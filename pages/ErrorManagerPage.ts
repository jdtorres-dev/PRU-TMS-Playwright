import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export type SearchTab = 'CB Records' | 'Quality Review' | 'Non-CB Records';

/**
 * Error Manager search screen (PIRCS side): the CB Records / Quality Review / Non-CB
 * Records tabs, their shared criteria controls, and the Result Grid the search produces.
 */
export class ErrorManagerPage extends BasePage {
  async selectSearchTab(tab: SearchTab): Promise<void> {
    // exact: true - otherwise "CB Records" substring-matches "Non-CB Records" too.
    await this.page.getByRole('tab', { name: tab, exact: true }).click();
  }

  /**
   * Opens one of the custom placeholder-only combobox dropdowns (Search Branch, Select
   * Mode, Select Status, etc.) and waits for its options to render. A plain .click() only
   * focuses the input - ArrowDown is what actually expands the listbox - and the open
   * sequence is flaky under automation, so this retries a few times rather than relying on
   * one click+ArrowDown succeeding.
   */
  async openComboboxOptions(field: Locator): Promise<Locator> {
    const options = this.page.getByRole('option');
    for (let attempt = 0; attempt < 4; attempt++) {
      await field.click();
      await field.press('ArrowDown');
      try {
        await expect(options.first()).toBeVisible({ timeout: 2000 });
        return options;
      } catch {
        // retry
      }
    }
    await expect(options.first()).toBeVisible();
    return options;
  }

  async getDropdownOptionTexts(field: Locator): Promise<string[]> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const options = await this.openComboboxOptions(field);
      const texts = (await options.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
      if (texts.length > 0) return texts;
    }
    return [];
  }

  async viewRecords(): Promise<void> {
    // Steps text alternates between "View Records" and "Search" depending on which screen
    // is being described, and both can be in the DOM at once (e.g. Quality Review's enabled
    // "View Records" alongside Non-CB Records' aria-disabled "Search"), so `.or()` alone is a
    // strict-mode violation there. These buttons mark their disabled state via aria-disabled
    // rather than the native disabled attribute, so filter via getByRole's disabled option
    // (which checks both) rather than a `:not([disabled])` CSS filter (which only catches
    // the native attribute and would still resolve to both).
    await this.page
      .getByRole('button', { name: /^View Records$/i, disabled: false })
      .or(this.page.getByRole('button', { name: /^Search$/i, disabled: false }))
      .click();
  }

  resultGrid(): Locator {
    return this.page.getByRole('grid').or(this.page.getByRole('table'));
  }

  // A search that legitimately returns zero records renders an empty-state message instead
  // of a grid/table role, so a "search succeeded" check needs to accept either. .first() -
  // the empty state renders both a heading and a detail line matching these patterns at
  // once, which is a strict-mode violation without it.
  resultGridOrEmptyState(): Locator {
    return this.resultGrid()
      .or(this.page.getByText(/No Records on Error Suspense File for the selection specified/i))
      .or(this.page.getByText(/no (record|results?) found/i))
      .first();
  }

  async openFirstResultRow(): Promise<void> {
    const rows = this.page.getByRole('row');
    await rows.nth(1).click(); // row 0 is typically the header
  }

  // Not getByLabel: the "Policy Number" text next to this field is plain text, not a
  // <label for>/aria-labelledby association. CB Records tab only - Quality Review has no
  // Policy Number field, see programRunErrorNumberField().
  policyNumberField(): Locator {
    return this.page.getByPlaceholder('e.g. 100000001');
  }

  // Quality Review tab's nearest equivalent quick-filter field ("Program Run / Error
  // Number"); the tab has no Policy Number field.
  programRunErrorNumberField(): Locator {
    return this.page.getByPlaceholder('e.g. CV');
  }

  allWeeksRadio(): Locator {
    return this.page.getByRole('radio', { name: 'All Weeks' });
  }

  currentWeekRadio(): Locator {
    return this.page.getByRole('radio', { name: 'Current Week' });
  }

  includeReleasedCheckbox(): Locator {
    return this.page.getByRole('checkbox', { name: /Include Released/i });
  }

  includeDeletedCheckbox(): Locator {
    return this.page.getByRole('checkbox', { name: /Include Deleted/i });
  }

  clearFiltersButton(): Locator {
    return this.page.getByRole('button', { name: /^Clear Filters$/i });
  }

  // After a search, the criteria controls (scope radios, filters) are replaced by the
  // Result Grid; this reopens them so a second search can be built.
  filterResultsButton(): Locator {
    return this.page.getByRole('button', { name: /^Filter Results$/i });
  }

  exportCsvButton(): Locator {
    return this.page.getByRole('button', { name: /Export CSV/i });
  }

  // Resolve/Assign/Delete render only once at least one Result Grid row is selected - there
  // is no button for a zero-row bulk action to click in the first place (BR-340's
  // NO_ROWS_SELECTED precondition is enforced by omission, not by a post-submit refusal).
  bulkActionButtons(): Locator {
    return this.page.getByRole('button', { name: /^(Resolve|Assign|Delete)$/i });
  }
}
