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

  // Live-confirmed (2026-09-03) ids: scope-SPECIFIC_WEEK / scope-WEEK_RANGE. Neither radio
  // carries a plain accessible name of its own from getByRole (the visible "Specific Week"/
  // "Week Range" text sits next to it, same non-<label> pattern as policyNumberField()
  // above), so these are located by id instead.
  specificWeekRadio(): Locator {
    return this.page.locator('#scope-SPECIFIC_WEEK');
  }

  weekRangeRadio(): Locator {
    return this.page.locator('#scope-WEEK_RANGE');
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

  saveFilterButton(): Locator {
    return this.page.getByRole('button', { name: /^Save Filter$/i });
  }

  exportCsvButton(): Locator {
    return this.page.getByRole('button', { name: /Export CSV/i });
  }

  /**
   * Deletes every currently-saved filter preset whose name matches `namePattern` (default:
   * every "QA automated saved filter <timestamp>" preset this suite's own tests leave behind
   * - see TMS-E2E-016). Live-confirmed: each Saved Filters chip carries its own delete button
   * with an aria-label of "Delete <exact filter name>" and no confirmation dialog - clicking
   * it removes the chip immediately. Deletes are looped one at a time (re-querying after each
   * click, not caching a list up front) since removing one chip re-renders/re-flows the rest.
   * Must be on the Error Manager search screen already (this does not call goto() itself).
   */
  async deleteSavedFiltersMatching(namePattern: RegExp = /QA automated saved filter/i): Promise<void> {
    const deleteButtonPattern = new RegExp(`^Delete .*(${namePattern.source})`, 'i');
    for (let guard = 0; guard < 25; guard++) {
      const deleteBtn = this.page.getByRole('button', { name: deleteButtonPattern }).first();
      if (!(await deleteBtn.count())) return;
      await deleteBtn.click();
      // No confirmation dialog - the click removes the chip immediately, but give the list a
      // moment to re-render before the next iteration re-queries it.
      await this.page.waitForTimeout(300);
    }
  }

  // --- CB Records "Detail Parameters" fields (live-confirmed 2026-09-03 via each field's own
  // id/aria-label/placeholder - see SMOKE.spec.ts TMS-SMOKE-001). branch/recordCode/
  // channelCode/centCode/errorId/rfCode are matched by id rather than accessible name: each
  // is a distinct per-tab instance whose accessible name/placeholder wording differs slightly
  // between CB Records and Quality Review (e.g. "Search Branch" vs "Search Branch..."), even
  // though the same id is reused by both instances - only the current tab's own instance is
  // ever actually present in the DOM at a time (live-confirmed; not two simultaneous nodes),
  // so an id locator resolves to exactly one element regardless of which tab is active. ---
  branchField(): Locator {
    return this.page.locator('#branch');
  }

  transCodeField(): Locator {
    return this.page.getByPlaceholder('e.g. 10 or 1*');
  }

  transModeField(): Locator {
    return this.page.getByRole('combobox', { name: 'Select Mode' });
  }

  runNumberField(): Locator {
    return this.page.getByPlaceholder('e.g. I1');
  }

  errorNumberField(): Locator {
    return this.page.locator('#errorId');
  }

  statusCodeField(): Locator {
    return this.page.getByRole('combobox', { name: 'Select Status' });
  }

  recordCodeField(): Locator {
    return this.page.locator('#recordCode');
  }

  // Not getByPlaceholder('e.g. C') - "e.g. C" is a substring of contractNumber's own
  // placeholder ("e.g. CN1001"), which getByPlaceholder matches by default (exact: false).
  rocField(): Locator {
    return this.page.locator('#roc');
  }

  regionField(): Locator {
    return this.page.getByRole('combobox', { name: 'Select Region' });
  }

  districtField(): Locator {
    return this.page.getByPlaceholder('e.g. 0123 or 01*');
  }

  staffField(): Locator {
    return this.page.getByPlaceholder('e.g. 3');
  }

  agencyField(): Locator {
    return this.page.getByPlaceholder('e.g. 001 or 0*');
  }

  contractNumberField(): Locator {
    return this.page.getByPlaceholder('e.g. CN1001');
  }

  supplementalKindField(): Locator {
    return this.page.getByRole('combobox', { name: 'Select Kind' });
  }

  actionCode3Field(): Locator {
    return this.page.getByRole('combobox', { name: 'Select Action Code' });
  }

  adjustCodeField(): Locator {
    return this.page.getByRole('combobox', { name: 'Select Adjust Code' });
  }

  centCodeField(): Locator {
    return this.page.locator('#centCode');
  }

  channelCodeField(): Locator {
    return this.page.locator('#channelCode');
  }

  // "Reference Code" - id=rfCode. CB Records' own placeholder reads "e.g. R"; Quality
  // Review's copy of this same field carries a different placeholder ("Enter RF Code...").
  referenceCodeField(): Locator {
    return this.page.locator('#rfCode');
  }

  // --- Quality Review-only fields ---
  programRunNumberField(): Locator {
    return this.page.getByPlaceholder('e.g. CV');
  }

  // "Selection Frequency (nth record)" - a range slider (id=nthRecord), not a text field.
  nthRecordSlider(): Locator {
    return this.page.locator('#nthRecord');
  }

  // --- Non-CB Records-only field ---
  // Distinct id (recordFamily) from CB Records/Quality Review's own "Record Code" combobox
  // (id=recordCode) above - live-confirmed default value "All Case Types".
  nonCbRecordFamilyField(): Locator {
    return this.page.locator('#recordFamily');
  }

  searchButton(): Locator {
    return this.page.getByRole('button', { name: /^Search$/i });
  }

  // --- Result Grid controls (live-confirmed 2026-09-03 - see SMOKE.spec.ts TMS-SMOKE-004) ---
  filterResultsButton(): Locator {
    return this.page.getByRole('button', { name: /^Filter Results$/i });
  }

  // Distinct from the search screen's own "View Records" button (ErrorManagerPage.viewRecords())
  // - this "View" button is the Result Grid's own row-selection action.
  resultGridViewButton(): Locator {
    return this.page.getByRole('button', { name: /^View$/i });
  }

  selectAllOnPageCheckbox(): Locator {
    return this.page.getByRole('checkbox', { name: /Select all/i });
  }

  // Live-confirmed: an unlabeled combobox (no aria-label/placeholder of its own beyond
  // "Select...") whose value reads "25 / page" - the page-size selector. hasText does not
  // match an <input>'s own value attribute, so this is matched by that attribute directly.
  pageSizeSelector(): Locator {
    return this.page.locator('input[role="combobox"][value$="/ page"]');
  }

  resultGridColumnHeader(name: string): Locator {
    return this.page.getByRole('columnheader', { name, exact: true });
  }

  /**
   * Live-searches CB Records (All Weeks, no policy filter) and returns the first currently
   * HELD record's policy number/error ID, or null if none are available. HELD is this app's
   * normal "awaiting correction, safely re-editable" status - OPEN/NEW records represent
   * other workflow stages this suite has no evidence are safe to open/edit here, and a
   * released/deleted/transferred record either won't appear in this default search or can't
   * be edited at all.
   *
   * Used by tests that must not depend on one specific hardcoded record (which may already
   * be mutated, held, or otherwise unavailable because of another test) - callers pass
   * `exclude` to steer away from records other tests are known to be using (e.g. the
   * suite-wide shared fixture in test-data/constants.ts), so this doesn't just rediscover
   * the same contended record every time.
   */
  async findEligibleHeldRecord(exclude: string[] = []): Promise<{ policyNumber: string; errorId: string } | null> {
    await this.goto();
    await this.selectSearchTab('CB Records');
    await this.allWeeksRadio().check();
    await this.viewRecords();
    await expect(this.resultGrid()).toBeVisible();
    // Live-confirmed column layout for this grid: Select, Status, Error ID, ECN, Branch,
    // RHO/District, Policy Number, (blank), Trans Code, Trans Mode, Cycle Week, Policy Kind,
    // Date, Created By.
    const COLUMNS = 14;
    // This shared dev environment (a cold-starting Elastic Beanstalk instance, see
    // playwright.config.ts) can render the Result Grid's heading before its rows have
    // populated - a single immediate read can misread "not loaded yet" as "no eligible
    // record exists". Retrying a few times distinguishes a genuine empty/all-excluded
    // result from that transient render lag before concluding no data is available.
    for (let attempt = 0; attempt < 5; attempt++) {
      const cellTexts = await this.page.getByRole('cell').allInnerTexts();
      for (let i = 0; i + COLUMNS <= cellTexts.length; i += COLUMNS) {
        const row = cellTexts.slice(i, i + COLUMNS);
        const [, status, errorId, , , , policyNumber] = row;
        if (status === 'HELD' && policyNumber && !exclude.includes(policyNumber)) {
          return { policyNumber, errorId };
        }
      }
      await this.page.waitForTimeout(1000);
    }
    return null;
  }
}
