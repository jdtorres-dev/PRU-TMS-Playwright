import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { BASE_URL } from '../test-data/constants';

export type SearchTab = 'CB Records' | 'Quality Review' | 'Non-CB Records';

/**
 * Error Manager search screen (PIRCS side): the CB Records / Quality Review / Non-CB
 * Records tabs, their shared criteria controls, and the Result Grid the search produces.
 */
export class ErrorManagerPage extends BasePage {
  // Opening a record navigates away to /errors/{ECN}#... and a refused save leaves the app
  // there (it does not return to the search screen on its own), so callers that need the
  // search screen again must navigate back to it explicitly rather than assume it's current.
  async goto(): Promise<void> {
    await this.page.goto(`${BASE_URL}/errors`);
  }

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
    // is being described. The search form renders all three tabs' sections in the same DOM
    // (only the active one is enabled), so both buttons can be present at once - a snapshot
    // .count() check here raced with the page still rendering and could commit to whichever
    // button doesn't exist on this tab, hanging until the click timeout. Waiting on the
    // combined locator lets Playwright's own actionability auto-wait handle the timing.
    //
    // Live-confirmed bug: .first() alone picks DOM order, not "the enabled one" the comment
    // above assumed. CB Records renders first in the DOM, so this happened to work whenever
    // CB Records was the active tab; on Quality Review or Non-CB Records its own button is
    // disabled but still comes first in the DOM, so .first() clicked that disabled button and
    // hung until timeout. Disabled tabs are inherited from an ancestor <fieldset disabled>
    // rather than each button's own disabled attribute, so :not(:disabled) (the CSS
    // pseudo-class, not a [disabled] attribute selector) is required to exclude them.
    const viewBtn = this.page.getByRole('button', { name: /^View Records$/i });
    const searchBtn = this.page.getByRole('button', { name: /^Search$/i });
    await viewBtn.or(searchBtn).and(this.page.locator(':not(:disabled)')).first().click();
  }

  resultGrid(): Locator {
    // Live-confirmed: a search that legitimately returns zero rows renders a
    // "No results found" message instead of any grid/table role element, so
    // this must also match that empty state - otherwise a correctly-empty
    // result is indistinguishable from the page never having loaded.
    return this.page.getByRole('grid').or(this.page.getByRole('table')).or(this.page.getByText(/No results found/i));
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
