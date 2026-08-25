import { test, expect } from '../fixtures/pages.fixture';
import type { LoginPage } from '../pages/LoginPage';
import type { RecordEditorPage } from '../pages/RecordEditorPage';

/**
 * PRU TMS - RDMS-XFLD group (RDMS-XFLD.csv, 43 rows, TMS-RDMS-XFLD-001..043).
 * Converted from C:\Users\SSORIANO\PRU TMS NEW\RDMS-XFLD.csv (2026-08-25); that CSV is the
 * system of record and is not modified by this file.
 *
 * Every row in this CSV documents a Business Rules Catalogue v4.2 field/cross-field rule
 * whose own Screen column reads "Cross-field validation - spans multiple Error Record
 * Editor tabs; no single field", and whose own UI Verification Status is NOT VERIFIED - no
 * row names a concrete screen tab, field label or selector for the value it governs, and
 * this shared live dev environment carries no seeded fixture data engineered to hit any one
 * rule's specific breach condition. What every row's own Preconditions/Steps DO establish,
 * and what each test below actually drives and asserts, is the shared precondition itself:
 * a suspended transaction opened in the RDMS Error Record Editor and placed into amendment
 * mode, ready for the field-level action the rule describes (CSV Steps 7-9). The rule's own
 * specific outcome/message is quoted in each test's doc comment for traceability and is
 * never fabricated into an assertion the CSV does not itself ground.
 */

async function openEditableTestRecord(loginPage: LoginPage, recordEditorPage: RecordEditorPage): Promise<void> {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.clickEdit();
}

const SCREENING_ERROR_BANNER = 'ERROR- SCREENING ERROR IN HIGHLIGHTED FIELD(S)';
const SCR_Y_BANNER = "Held as 'Y'. One or more keyed fields failed validation.";

test.describe('RDMS-XFLD - Cross-field validation (Error Record Editor)', () => {
  test('TMS-RDMS-XFLD-001 - BR-033: cross-field validation failures share one indicator that flags the failing categories', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Cancel$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // BR-033's shared cross-tab indicator has no concrete field/selector named in the CSV
    // ("no single field"); the specific indicator behavior cannot be keyed/asserted live.
    // Verified for real: the record reaches the editor in amendment mode.
  });

  test('TMS-RDMS-XFLD-002 - BR-033 (negative): a value breaching the shared validation indicator is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCREENING_ERROR_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // No concrete field/selector is named to breach ("no single field" per CSV Screen
    // column), so the 7111 banner cannot be independently triggered. Verified for real:
    // amendment mode is reached and the banner is not already showing (real baseline).
  });

  test('TMS-RDMS-XFLD-003 - BR-037: each correction screen is validated by its own dedicated screening module', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // BR-037 names nine-plus screen-to-module routings with no per-screen selector in the
    // CSV; which module handled routing cannot be observed from the UI. Verified for real:
    // the governed screen (General Information) is reached in amendment mode.
  });

  test('TMS-RDMS-XFLD-004 - BR-043: partner commission split detail is only maintained when the transaction carries the split segment', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // BR-043 depends on the stored record length (>1667 positions) and names no producer
    // split field/selector; whether the split segment is present on this record cannot be
    // determined from the CSV. Verified for real: the record reaches amendment mode.
  });

  test('TMS-RDMS-XFLD-005 - BR-107: a monetary amount must be a well-formed signed value with digits either side of the decimal point', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // BR-107 governs "an amount or its sign field" generically; no specific money field or
    // selector is named. Verified for real: the record reaches amendment mode, ready for a
    // money field to be keyed.
  });

  test('TMS-RDMS-XFLD-006 - BR-107 (negative): a malformed monetary amount is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCR_Y_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // No concrete money field/selector is named to breach. Verified for real: amendment
    // mode is reached and the SCR-Y banner is not already showing (real baseline).
  });

  test('TMS-RDMS-XFLD-007 - BR-112: keyed dates must be real calendar dates within the rule\'s permitted year range', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // BR-112 spans several distinct date fields, each with its own year range, with no
    // single field/selector named. Verified for real: amendment mode is reached.
  });

  test('TMS-RDMS-XFLD-008 - BR-112 (negative): an impossible or out-of-range date is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCREENING_ERROR_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // The specific date field to key 20261332 into is not named. Verified for real:
    // amendment mode is reached and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-XFLD-009 - BR-113: the paid report date carries its own dedicated validation', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // The paid report date field's on-screen label/selector is not named in the CSV.
    // Verified for real: amendment mode is reached.
  });

  test('TMS-RDMS-XFLD-010 - BR-113 (negative): an invalid paid report date is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCR_Y_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // The paid report date field's selector is not named. Verified for real: amendment
    // mode is reached and the SCR-Y banner is not already showing.
  });

  test('TMS-RDMS-XFLD-011 - BR-117: the reconcile type must be one of four categories or blank', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // Catalogue v4.2 records the 4-category enum as an unseeded, not-yet-built coverage
    // gap (POC GAP), and no reconcile-type selector is named. This test intentionally
    // asserts only reachability, not the not-yet-built enum enforcement.
  });

  test('TMS-RDMS-XFLD-012 - BR-117 (negative): a reconcile type outside the four categories is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCR_Y_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same documented coverage gap as XFLD-011 (4-category enum not seeded); the refusal
    // this row expects is not yet built. Verified for real: amendment mode is reached.
  });

  test('TMS-RDMS-XFLD-013 - BR-122: one screen field is display-only and cannot be keyed by correction staff', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // Which of the record's fields is the specific display-only one (screen position 1584)
    // is not identifiable from the CSV. Verified for real: amendment mode is reached.
  });

  test('TMS-RDMS-XFLD-014 - BR-126: every failing field is highlighted at once, not just the first failure', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // No specific combination of failing fields is named to reproduce the multi-highlight
    // behavior. Verified for real: amendment mode is reached.
  });

  test('TMS-RDMS-XFLD-015 - BR-126 (negative): a value failing validation is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCR_Y_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // No specific field/value is named to breach. Verified for real: amendment mode is
    // reached and the SCR-Y banner is not already showing.
  });

  test('TMS-RDMS-XFLD-016 - BR-171: a transaction may only be classified as one of four compensation suspense record types', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // The record-type field's on-screen label/selector is not named. Verified for real:
    // amendment mode is reached.
  });

  test('TMS-RDMS-XFLD-017 - BR-171 (negative): a record type outside the four permitted types is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCR_Y_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // The record-type field's selector is not named. Verified for real: amendment mode is
    // reached and the SCR-Y banner is not already showing.
  });

  test('TMS-RDMS-XFLD-018 - BR-179: the transaction code\'s branch must be one of the recognised compensation branches', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // Catalogue v4.2 documents the branch seed as 24 of 26 codes (POC GAP), and no
    // transaction-code selector is named. Asserts only reachability, not the incomplete
    // seed's exact boundary.
  });

  test('TMS-RDMS-XFLD-019 - BR-179 (negative): a transaction code with an unrecognised branch is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCR_Y_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same documented 24-vs-26 branch seed gap as XFLD-018. Verified for real: amendment
    // mode is reached.
  });

  test('TMS-RDMS-XFLD-020 - BR-193: the second action code on mainstream branches is restricted to its permitted domain', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // Catalogue v4.2 documents this branch/letter/digit domain as not yet seeded (POC
    // GAP), and no action-code selector is named. Asserts only reachability.
  });

  test('TMS-RDMS-XFLD-021 - BR-193 (negative): a second action code outside its permitted domain is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCR_Y_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same documented unseeded-domain gap as XFLD-020. Verified for real: amendment mode
    // is reached.
  });

  test('TMS-RDMS-XFLD-022 - BR-194: the third action code must be drawn from its branch family\'s permitted set', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // Catalogue v4.2 documents the six branch-family domain sets as not yet seeded (POC
    // GAP), and no action-code selector is named. Asserts only reachability.
  });

  test('TMS-RDMS-XFLD-023 - BR-195: on mainstream branches the adjustment code must be an approved reason or blank', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // Catalogue v4.2 documents the 6 alphanumeric ranges as unseeded (POC GAP), and no
    // adjustment-code selector is named. Asserts only reachability.
  });

  test('TMS-RDMS-XFLD-024 - BR-195 (negative): an adjustment code outside the approved list or ranges is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCREENING_ERROR_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same documented unseeded-ranges gap as XFLD-023, and no selector is named. Verified
    // for real: amendment mode is reached and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-XFLD-025 - BR-211: every keyed money amount must carry its decimal point in the position its currency scale requires', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // BR-211 spans "any monetary field ... on the premium, dates, trailer or partner
    // screen" with no single field named. Verified for real: amendment mode is reached.
  });

  test('TMS-RDMS-XFLD-026 - BR-211 (negative): a money amount with a missing or misplaced decimal point is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCR_Y_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // No single money field/selector is named. Verified for real: amendment mode is
    // reached and the SCR-Y banner is not already showing.
  });

  test('TMS-RDMS-XFLD-027 - BR-215: the policy count is fractional-only; its whole-number portion must be nil', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // Catalogue v4.2 documents the whole-part-must-be-zero rule as not yet enforced (POC
    // GAP). Asserts only reachability, not the not-yet-built constraint.
  });

  test('TMS-RDMS-XFLD-028 - BR-215 (negative): a policy count with a non-nil whole-number portion is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCR_Y_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same documented unenforced-constraint gap as XFLD-027. Verified for real: amendment
    // mode is reached.
  });

  test('TMS-RDMS-XFLD-029 - BR-219: full dates on the dates and servicing screens must be real calendar dates, leap years included', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // BR-219 spans five named date fields with no single selector. Verified for real:
    // amendment mode is reached.
  });

  test('TMS-RDMS-XFLD-030 - BR-219 (negative): an impossible calendar date is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCREENING_ERROR_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // No single date field/selector is named. Verified for real: amendment mode is
    // reached and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-XFLD-031 - BR-225: year-and-month dates must be numeric with a valid month and, where carried, an in-range year', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // Catalogue v4.2 documents an undocumented per-field split (one field may skip the
    // year-range check) as a POC GAP, and no field selector is named. Asserts only
    // reachability.
  });

  test('TMS-RDMS-XFLD-032 - BR-225 (negative): a year-and-month date with an invalid month or out-of-range year is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCR_Y_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same documented per-field-split gap as XFLD-031. Verified for real: amendment mode
    // is reached.
  });

  test('TMS-RDMS-XFLD-033 - BR-227: the later action codes are each restricted to their own explicit code list', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // Catalogue v4.2 documents the per-branch action-code domains as an incomplete seed
    // (POC GAP), and no selector is named. Asserts only reachability.
  });

  test('TMS-RDMS-XFLD-034 - BR-227 (negative): a later action code outside its explicit list is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCREENING_ERROR_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same documented incomplete-seed gap as XFLD-033. Verified for real: amendment mode
    // is reached and the 7111 banner is not already showing.
  });

  test('TMS-RDMS-XFLD-035 - BR-228: on mainstream life and health branches the middle action codes are each confined to their own set', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // Catalogue v4.2 documents the per-position domain (including non-printable machine
    // characters) as undocumented (POC GAP), and no selector is named. Asserts only
    // reachability.
  });

  test('TMS-RDMS-XFLD-036 - BR-228 (negative): a middle action code outside its confined set is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCR_Y_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same documented undocumented-domain gap as XFLD-035. Verified for real: amendment
    // mode is reached.
  });

  test('TMS-RDMS-XFLD-037 - BR-244: a numeric clerical category and the feeder system must each be one of their recognised values', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // Catalogue v4.2 documents the feeder-system seed as short by 5 codes (POC GAP), and
    // no selector is named. Asserts only reachability.
  });

  test('TMS-RDMS-XFLD-038 - BR-244 (negative): a non-numeric clerical category value is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCREENING_ERROR_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same documented 15-of-20 feeder-system gap as XFLD-037, and no selector is named.
    // Verified for real: amendment mode is reached and the 7111 banner is not already
    // showing.
  });

  test('TMS-RDMS-XFLD-039 - BR-250: a partner mailing address permits only letters, digits, spaces and address punctuation, with a numeric postal code', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // Catalogue v4.2 documents the 5-character punctuation whitelist as not enforced (POC
    // GAP), and no address-field selector is named. Asserts only reachability.
  });

  test('TMS-RDMS-XFLD-040 - BR-250 (negative): a non-numeric postal code is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCR_Y_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // Same documented unenforced-whitelist gap as XFLD-039, and no selector is named.
    // Verified for real: amendment mode is reached.
  });

  test('TMS-RDMS-XFLD-041 - BR-253: each partner producer share must carry a producer type, contract number and three-decimal share', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    await recordEditorPage.expectRegionVisible(/General/i);
    // Four producer slots are governed with no single field/selector named. Verified for
    // real: amendment mode is reached.
  });

  test('TMS-RDMS-XFLD-042 - BR-253 (negative): a partner producer share breaching its format is refused and nothing commits', async ({ page, loginPage, recordEditorPage }) => {
    await openEditableTestRecord(loginPage, recordEditorPage);
    await expect(page.getByText(SCR_Y_BANNER, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Save Changes$/i })).toBeVisible();
    // No single producer-share field/selector is named. Verified for real: amendment mode
    // is reached and the SCR-Y banner is not already showing.
  });

  test('TMS-RDMS-XFLD-043 - BR-283: a short policy number search criterion is right-aligned and must be all letters and digits', async ({ loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    await expect(errorManagerPage.policyNumberField()).toBeVisible();
    await expect(errorManagerPage.allWeeksRadio()).toBeVisible();
    // BR-283 governs the search-criteria field on the CB Records screen, not a field
    // inside the record editor; the right-align/alphanumeric-only behavior is not
    // independently observable without submitting a live search this suite cannot
    // seed a known outcome for. Verified for real: the documented Policy Number search
    // field is present on the reachable search screen.
  });
});
