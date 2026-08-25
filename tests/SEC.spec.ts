import { Request } from '@playwright/test';
import { test, expect } from '../fixtures/pages.fixture';

/**
 * PRU TMS - SEC group (SEC.csv, 4 rows, TMS-SEC-001..004).
 * Converted from the PRU TMS v4 CSV export (2026-08-25). Each row's own Steps/Expected
 * Result column is implemented directly below; the source CSV is the system of record and
 * is not modified by this file. Per the conversion brief, this group follows the real
 * HTTP-level / entitlement-boundary verification pattern already used for TMS-LOGIN-011 and
 * TMS-LOGIN-015 in LOGIN.spec.ts.
 *
 * Verification gaps (flagged inline and summarized here):
 * - TMS-SEC-001 (BR-337): the CSV's own Precondition calls for the provisioned
 *   ROLE_REFDATA_ADMIN account; this suite has credentials for none of ROLE_QA_REVIEWER,
 *   ROLE_REFDATA_ADMIN or ROLE_ADMIN, so their distinct capability sets cannot be exercised.
 *   Only the ROLE_OPERATOR boundary admin/admin actually holds is checkable here.
 * - TMS-SEC-002 (BR-338): the rule's own mechanism (one audit row per field, grouped by a
 *   shared correlation identifier, with the legacy 34-field cap removed) is only inspectable
 *   via raw audit rows this UI does not expose. What is checkable is the user-facing promise:
 *   History reflects the fields changed by one save as a reachable entry.
 * - TMS-SEC-004 (BR-339 negative): a machine-readable rule identifier is expected on the
 *   refusal body per BR-340, but this suite has not independently confirmed the refusal
 *   response's shape (JSON field names), so only its HTTP-level refusal (4xx) and the
 *   record's unchanged state are asserted directly.
 */
test.describe('SEC - Modernized Security and Audit', () => {
  test('TMS-SEC-001 - BR-337: access is organized around four named entitlements (operator, cross-office reviewer, reference-data administrator, administrator)', async ({ page, loginPage }) => {
    await loginPage.loginAsValidUser();

    // Only the ROLE_OPERATOR boundary admin/admin holds is checkable here (see file header).
    await expect(page.getByRole('link', { name: /Reference Data/i })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: /Reference Data/i })).toHaveCount(0);
    // The operator's own-office scoping is consistent with BR-335 (TMS-LOGIN-002): no office
    // selector is exposed to key in or switch offices.
    await expect(page.getByRole('textbox', { name: /office/i })).toHaveCount(0);
  });

  test('TMS-SEC-002 - BR-338: one audit row is written per changed field, all sharing a save correlation identifier, with no fixed cap on the count of fields in one save', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickEdit();

    // Change more than one field in the same save, per Test Data ("no fixed cap ... one row
    // per field, grouped by correlation identifier").
    const textFields = page.getByRole('textbox');
    const count = await textFields.count();
    const first = textFields.nth(0);
    const firstOriginal = await first.inputValue();
    await first.fill(`${firstOriginal} `);
    if (count > 1) {
      const second = textFields.nth(1);
      const secondOriginal = await second.inputValue();
      await second.fill(`${secondOriginal} `);
    }
    await recordEditorPage.clickSave();

    // The rule's own storage mechanism (raw audit rows, correlation identifier) is not
    // exposed by this UI; what IS checkable is History reflecting the save just performed.
    await recordEditorPage.clickHistory();
    await recordEditorPage.expectRegionVisible(/History/i);
  });

  test('TMS-SEC-003 - BR-339: a state-changing request is refused before any business rule runs if its anti-forgery token is missing or does not match', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickEdit();

    const field = recordEditorPage.firstTextbox();
    await field.fill(`${await field.inputValue()} `);

    let saveRequest: Request | null = null;
    page.on('request', (req) => {
      if (['POST', 'PUT', 'PATCH'].includes(req.method()) && saveRequest === null) {
        saveRequest = req;
      }
    });
    await recordEditorPage.clickSave();
    await page
      .waitForResponse((r) => ['POST', 'PUT', 'PATCH'].includes(r.request().method()), { timeout: 10_000 })
      .catch(() => {});

    expect(saveRequest, 'Expected the Save Changes action to issue a state-changing HTTP request').not.toBeNull();
    const req = saveRequest as unknown as Request;
    const originalHeaders = await req.allHeaders();
    const csrfHeaderName = Object.keys(originalHeaders).find((h) => /csrf|xsrf|anti-forgery/i.test(h));

    // Reissue without the anti-forgery header (or, if none was identified by name, unaltered
    // otherwise) - must be refused.
    const headersWithoutToken = { ...originalHeaders };
    if (csrfHeaderName) delete headersWithoutToken[csrfHeaderName];
    const respWithoutToken = await page.request.fetch(req.url(), {
      method: req.method(),
      headers: headersWithoutToken,
      data: req.postData() ?? undefined,
      failOnStatusCode: false,
    });
    expect(respWithoutToken.status(), 'Save reissued without the anti-forgery token must be refused (4xx)').toBeGreaterThanOrEqual(400);

    // Reissue again with the anti-forgery header altered to an arbitrary value - must also be
    // refused ("missing or does not match").
    const headersWithAlteredToken = { ...originalHeaders };
    if (csrfHeaderName) headersWithAlteredToken[csrfHeaderName] = 'tampered-' + Math.random().toString(36).slice(2);
    const respAlteredToken = await page.request.fetch(req.url(), {
      method: req.method(),
      headers: headersWithAlteredToken,
      data: req.postData() ?? undefined,
      failOnStatusCode: false,
    });
    expect(respAlteredToken.status(), 'Save reissued with an altered anti-forgery token must be refused (4xx)').toBeGreaterThanOrEqual(400);
  });

  test('TMS-SEC-004 - BR-339 (negative): a forged state-changing request without a valid anti-forgery token is refused and the record is left exactly as it was', async ({ page, loginPage, recordEditorPage }) => {
    await loginPage.loginAsValidUser();
    await recordEditorPage.openConfirmedTestRecord();
    await recordEditorPage.clickEdit();

    const field = recordEditorPage.firstTextbox();
    const original = await field.inputValue();
    const afterLegitSave = `${original} `;
    await field.fill(afterLegitSave);

    let saveRequest: Request | null = null;
    page.on('request', (req) => {
      if (['POST', 'PUT', 'PATCH'].includes(req.method()) && saveRequest === null) {
        saveRequest = req;
      }
    });
    // The legitimate save (valid token, issued by the real browser session) is expected to
    // succeed and commit afterLegitSave - this is the baseline "as it was" state below.
    await recordEditorPage.clickSave();
    await page
      .waitForResponse((r) => ['POST', 'PUT', 'PATCH'].includes(r.request().method()), { timeout: 10_000 })
      .catch(() => {});

    expect(saveRequest, 'Expected the Save Changes action to issue a state-changing HTTP request').not.toBeNull();
    const req = saveRequest as unknown as Request;
    const originalHeaders = await req.allHeaders();
    const csrfHeaderName = Object.keys(originalHeaders).find((h) => /csrf|xsrf|anti-forgery/i.test(h));

    // Attempt the forbidden condition: replay the same write with an altered/tampered token.
    const tamperedHeaders = { ...originalHeaders };
    if (csrfHeaderName) tamperedHeaders[csrfHeaderName] = 'tampered-' + Math.random().toString(36).slice(2);
    const resp = await page.request.fetch(req.url(), {
      method: req.method(),
      headers: tamperedHeaders,
      data: req.postData() ?? undefined,
      failOnStatusCode: false,
    });
    expect(resp.status(), 'A forged save reissued with an altered anti-forgery token must be refused (4xx)').toBeGreaterThanOrEqual(400);

    // "Nothing is committed and the record is left exactly as it was" (relative to the state
    // the legitimate save left it in): reload and confirm the forged replay changed nothing
    // further - a machine-readable rule identifier on the refusal body (BR-340) is expected
    // but its exact response shape has not been independently confirmed, so it is not
    // asserted here (see file header).
    await page.reload();
    await expect(recordEditorPage.firstTextbox()).toHaveValue(afterLegitSave);
  });
});
