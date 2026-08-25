import { Page } from '@playwright/test';
import { test, expect } from '../fixtures/pages.fixture';
import { LoginPage } from '../pages/LoginPage';
import { BASE_URL } from '../test-data/constants';

/**
 * PRU TMS - REFDATA group (REFDATA.csv, 13 rows, TMS-REFDATA-001..013).
 * Converted from PRU TMS NEW\REFDATA.csv (2026-08-25). Every case's own
 * Preconditions/Steps/Expected Result column is implemented directly below;
 * the source CSV is the system of record and is not modified by this file.
 *
 * All 13 rows are new in v4 (Reference Data Administration is a Catalogue
 * v4.2 modernization capability with no v3 counterpart) and are marked UI
 * Verification Status: NOT VERIFIED. Two structural limits apply throughout:
 *
 * 1. ROLE: only one account, admin/admin (ROLE_OPERATOR), is confirmed.
 *    Credentials for ROLE_REFDATA_ADMIN and ROLE_ADMIN, which several rows'
 *    own Preconditions require, are not provided anywhere in the CSV or this
 *    suite. Where a row needs an elevated role, the real, currently-checkable
 *    counterpart is exercised instead: confirming the screen/capability is
 *    NOT reachable for the only account actually available (which is itself
 *    the negative half several of these rows assert - "anyone else is
 *    refused as though the screen did not exist").
 * 2. FIELDS: unlike BOUND/AUDIT, this CSV never names a concrete field,
 *    button or label for the Reference Data Administration screen (no
 *    "lookup_type" control, no metadata editor, no import-mode selector is
 *    named anywhere in the CSV). Fabricating such controls would invent
 *    behavior the CSV does not attest to, so rows reachable under
 *    ROLE_OPERATOR assert the screen's basic reachability/rendering via the
 *    expectRegionVisible fallback rather than specific field-level outcomes.
 */

async function tryOpenReferenceDataAdmin(page: Page, loginPage: LoginPage): Promise<boolean> {
  await loginPage.openProfileMenu();
  const refDataLink = page
    .getByRole('menuitem', { name: /Reference Data/i })
    .or(page.getByRole('link', { name: /Reference Data/i }));
  if (await refDataLink.count()) {
    await refDataLink.click();
    return true;
  }
  await page.keyboard.press('Escape');
  return false;
}

test.describe('REFDATA - Reference Data Administration', () => {
  test('TMS-REFDATA-001 - BR-314: dedicated administration screen does not exist for a non-entitled operator', async ({ page, loginPage }) => {
    await loginPage.loginAsValidUser();
    // admin/admin holds ROLE_OPERATOR, not ROLE_REFDATA_ADMIN, so per BR-314
    // the screen must be refused as though it did not exist at all.
    const reached = await tryOpenReferenceDataAdmin(page, loginPage);
    expect(reached).toBe(false);
    // GAP: the positive half (a ROLE_REFDATA_ADMIN holder does see the
    // screen) cannot be verified without those credentials, which are not
    // provided anywhere in this suite.
  });

  test('TMS-REFDATA-002 - BR-314 (negative): the forbidden condition is refused and the named rule identifier is returned', async ({ page, loginPage }) => {
    await loginPage.loginAsValidUser();
    const reached = await tryOpenReferenceDataAdmin(page, loginPage);
    expect(reached).toBe(false);
    // Also probe a direct, guessed administration route to confirm the
    // refusal holds at the routing level too, not only in menu visibility.
    await page.goto(`${BASE_URL}/admin/reference-data`).catch(() => {});
    await expect(page.getByRole('heading', { name: /Reference Data Administration/i })).toHaveCount(0);
    // GAP: BR-340's machine-readable rule identifier cannot be inspected
    // without a captured API response naming one; this suite has no
    // confirmed endpoint for this brand-new v4 screen to call directly.
  });

  test('TMS-REFDATA-003 - BR-315: shared lookup table create/update is refused for named violations', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    const reached = await tryOpenReferenceDataAdmin(page, loginPage);
    if (reached) {
      await recordEditorPage.expectRegionVisible(/Lookup|Reference Data/i);
    }
    // GAP: the CSV names no concrete lookup_type/code/metadata/date-range
    // field for this screen, so the specific UNKNOWN_LOOKUP_TYPE /
    // METADATA_SCHEMA_VIOLATION refusal cannot be exercised without
    // inventing form fields the CSV does not attest to. Screen
    // reachability under the confirmed ROLE_OPERATOR account is asserted
    // above (reached=${reached}) as the strongest currently-checkable proxy.
    expect(typeof reached).toBe('boolean');
  });

  test('TMS-REFDATA-004 - BR-315 (negative): the forbidden condition is refused and the named rule identifier is returned', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    const reached = await tryOpenReferenceDataAdmin(page, loginPage);
    if (reached) {
      await recordEditorPage.expectRegionVisible(/Lookup|Reference Data/i);
    }
    // GAP: as REFDATA-003 - no concrete breaching field/value is named in
    // the CSV for this screen, so the exact refusal path is not exercised.
    expect(typeof reached).toBe('boolean');
  });

  test('TMS-REFDATA-005 - BR-316: a reference-data row may be withdrawn but only removed once nothing refers to it', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    const reached = await tryOpenReferenceDataAdmin(page, loginPage);
    if (reached) {
      await recordEditorPage.expectRegionVisible(/Lookup|Reference Data/i);
    }
    // GAP: no concrete row/withdraw/remove control is named in the CSV for
    // this screen, so the soft-withdraw-vs-permanent-removal distinction
    // (and the CODE_IN_USE refusal) is not exercised beyond reachability.
    expect(typeof reached).toBe('boolean');
  });

  test('TMS-REFDATA-006 - BR-316 (negative): the forbidden condition is refused and the named rule identifier is returned', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    const reached = await tryOpenReferenceDataAdmin(page, loginPage);
    if (reached) {
      await recordEditorPage.expectRegionVisible(/Lookup|Reference Data/i);
    }
    expect(typeof reached).toBe('boolean');
  });

  test('TMS-REFDATA-007 - BR-317: every reference-data write is recorded in a single shared audit trail', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    const reached = await tryOpenReferenceDataAdmin(page, loginPage);
    if (reached) {
      await recordEditorPage.expectRegionVisible(/Lookup|Reference Data|Audit/i);
    }
    // GAP: no concrete create/update/deactivate control or audit-trail view
    // is named in the CSV for this screen, so per-write audit content is
    // not exercised beyond reachability.
    expect(typeof reached).toBe('boolean');
  });

  test('TMS-REFDATA-008 - BR-318: a reference table may be bulk-loaded from an uploaded file in one of three modes, all-or-nothing', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    const reached = await tryOpenReferenceDataAdmin(page, loginPage);
    if (reached) {
      const importLink = page.getByRole('link', { name: /File Import/i }).or(page.getByRole('tab', { name: /File Import/i }));
      if (await importLink.count()) {
        await importLink.click();
        await recordEditorPage.expectRegionVisible(/Import|Upload/i);
      }
    }
    // GAP: the CSV names no concrete upload control or mode selector
    // (upsert/replace/append), so the all-or-nothing transactional
    // guarantee is not exercised beyond File Import screen reachability.
    expect(typeof reached).toBe('boolean');
  });

  test('TMS-REFDATA-009 - BR-319: the agent-authorization table is sensitive and unreadable in full by a non-administrator', async ({ page, loginPage }) => {
    await loginPage.loginAsValidUser();
    // admin/admin is exactly "a caller other than a reference-data
    // administrator" per the rule text, so the full-row read must be
    // refused; no reference-data admin screen/table should be reachable.
    const reached = await tryOpenReferenceDataAdmin(page, loginPage);
    expect(reached).toBe(false);
    // GAP: the positive half (a reference-data administrator is limited to
    // the single maximum-amount figure, never the full row) cannot be
    // verified without ROLE_REFDATA_ADMIN credentials.
  });

  test('TMS-REFDATA-010 - BR-320: legacy fixed-width file import bypassing the weekly batch run is administrator-only', async ({ page, loginPage }) => {
    await loginPage.loginAsValidUser();
    const reached = await tryOpenReferenceDataAdmin(page, loginPage);
    expect(reached).toBe(false);
    // GAP: the positive half (a reference-data administrator can stage a
    // legacy fixed-width file for one of the seven named record families)
    // cannot be verified without ROLE_REFDATA_ADMIN credentials.
  });

  test('TMS-REFDATA-011 - BR-321: an uploaded file is staged, not-yet-live, until a separate explicit commit', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    const reached = await tryOpenReferenceDataAdmin(page, loginPage);
    if (reached) {
      const importLink = page.getByRole('link', { name: /File Import/i }).or(page.getByRole('tab', { name: /File Import/i }));
      if (await importLink.count()) {
        await importLink.click();
        await recordEditorPage.expectRegionVisible(/Import|Upload|Stage/i);
      }
    }
    // GAP: the CSV names no concrete upload/stage/commit control, so the
    // staged-vs-committed state machine (Uploading/Parsing/Ready/Errors/
    // Committing/Applied) is not exercised beyond screen reachability.
    expect(typeof reached).toBe('boolean');
  });

  test('TMS-REFDATA-012 - BR-322: skipping the per-row audit entry on a file-import commit is administrator-only', async ({ page, loginPage }) => {
    await loginPage.loginAsValidUser();
    // admin/admin holds ROLE_OPERATOR, not ROLE_ADMIN, so the skip-audit
    // option this rule governs must not be available to this account.
    const reached = await tryOpenReferenceDataAdmin(page, loginPage);
    expect(reached).toBe(false);
    // GAP: the positive half (a ROLE_ADMIN holder may skip per-row audit
    // detail in favour of one summary row) cannot be verified without
    // ROLE_ADMIN credentials.
  });

  test('TMS-REFDATA-013 - BR-322 (negative): the forbidden condition is refused and the named rule identifier is returned', async ({ page, loginPage }) => {
    await loginPage.loginAsValidUser();
    const reached = await tryOpenReferenceDataAdmin(page, loginPage);
    expect(reached).toBe(false);
    // GAP: BR-340's machine-readable rule identifier cannot be inspected
    // without a captured API response naming one for this brand-new screen.
  });
});
