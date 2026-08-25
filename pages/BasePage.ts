import { Page, expect } from '@playwright/test';

/**
 * Common base for every Page Object in this suite. Holds the underlying Page and the one
 * assertion helper (expectRegionVisible) that is generic enough to apply regardless of
 * which screen/tab is currently active.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Generic "screen/region reached" assertion used where a test case attests only that a
   * screen, tab, or region renders (not a specific business-rule outcome that would
   * require seeded backend data this suite doesn't have).
   */
  async expectRegionVisible(label: string | RegExp): Promise<void> {
    await expect(this.page.getByText(label).first()).toBeVisible();
  }
}
