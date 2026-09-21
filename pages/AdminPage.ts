import { Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Administration area: the top-nav "References" menu and the Lookup Manager / File Import
 * screens it opens (plus the separate "Administration" menu, which this page object also
 * exposes for anything that still lives there).
 *
 * Live-confirmed (2026-09-03): the admin/admin account's own top navigation bar carries a
 * direct "Administration" button (distinct from the profile/avatar menu in the top-right
 * corner) - it was not previously found because earlier reconnaissance in this suite
 * (TMS-LOGIN-015, and SMOKE-013/014's own prior version) only checked the profile menu for a
 * link literally named "Reference Data". The real capability was reachable from this top-nav
 * menu instead, under different names: "Lookup Manager" (Reference Data Administration) and
 * "File Import".
 *
 * UI CHANGE (live-confirmed 2026-09-13): a new "References" top-nav button now carries Lookup
 * Manager, File Import and several other reference-data screens (Online Error Codes, Frontend
 * Messages, Service Register Domain, Agent Authorization) that used to live under
 * Administration. Administration itself still exists but is now down to just "Action
 * Permissions" - Lookup Manager/File Import are no longer reachable from it at all.
 * gotoLookupManager()/gotoFileImport() were updated to open References instead;
 * administrationMenuButton()/openAdministrationMenu() are kept as-is for whatever still lives
 * under Administration.
 */
export class AdminPage extends BasePage {
  administrationMenuButton(): Locator {
    return this.page.getByRole('button', { name: 'Administration' });
  }

  referencesMenuButton(): Locator {
    // exact: true - otherwise "References" substring-matches the unrelated "Open preferences"
    // button too (live-confirmed: "preferences" contains "references"), a strict-mode violation.
    return this.page.getByRole('button', { name: 'References', exact: true });
  }

  async openAdministrationMenu(): Promise<void> {
    await this.administrationMenuButton().click();
  }

  async openReferencesMenu(): Promise<void> {
    await this.referencesMenuButton().click();
  }

  async gotoLookupManager(): Promise<void> {
    await this.openReferencesMenu();
    await this.page.getByRole('link', { name: 'Lookup Manager' }).click();
  }

  async gotoFileImport(): Promise<void> {
    await this.openReferencesMenu();
    await this.page.getByRole('link', { name: 'File Import' }).click();
  }

  // --- Lookup Manager: Lookup Categories tab ---
  lookupCategoriesTab(): Locator {
    return this.page.getByRole('tab', { name: 'Lookup Categories' }).or(this.page.getByRole('link', { name: 'Lookup Categories' }));
  }

  lookupValuesTab(): Locator {
    return this.page.getByRole('tab', { name: 'Lookup Values' }).or(this.page.getByRole('link', { name: 'Lookup Values' }));
  }

  addCategoryButton(): Locator {
    return this.page.getByRole('button', { name: /^Add Category$/i });
  }

  // --- Lookup Manager: Lookup Values tab (per selected lookup type) ---
  addCodeButton(): Locator {
    return this.page.getByRole('button', { name: /^Add Code$/i });
  }

  bulkImportButton(): Locator {
    return this.page.getByRole('button', { name: /^Bulk Import$/i });
  }

  // The per-value active/inactive toggle - live-confirmed role="switch", aria-label
  // "Toggle active for {code}" (the deactivate/reactivate control).
  activeToggle(code: string): Locator {
    return this.page.getByRole('switch', { name: `Toggle active for ${code}` });
  }
}
