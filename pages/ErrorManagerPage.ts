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
    // is being described; try whichever is present.
    const viewBtn = this.page.getByRole('button', { name: /^View Records$/i });
    const searchBtn = this.page.getByRole('button', { name: /^Search$/i });
    if (await viewBtn.count()) {
      await viewBtn.click();
    } else {
      await searchBtn.click();
    }
  }

  resultGrid(): Locator {
    return this.page.getByRole('grid').or(this.page.getByRole('table'));
  }

  async openFirstResultRow(): Promise<void> {
    const rows = this.page.getByRole('row');
    await rows.nth(1).click(); // row 0 is typically the header
  }

  // Not getByLabel: the "Policy Number" text next to this field is plain text, not a
  // <label for>/aria-labelledby association.
  policyNumberField(): Locator {
    return this.page.getByPlaceholder('e.g. 100000001');
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

  exportCsvButton(): Locator {
    return this.page.getByRole('button', { name: /Export CSV/i });
  }
}
