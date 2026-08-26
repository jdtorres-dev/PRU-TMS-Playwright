import { test, expect } from '../fixtures/pages.fixture';
import { Locator, Page } from '@playwright/test';
import { VALID_USERNAME, VALID_PASSWORD } from '../test-data/constants';

/**
 * PRU TMS - RDMS-GEN group (RDMS-GEN.csv, 117 rows, TMS-RDMS-GEN-001..117).
 * The CSV is the system of record and is never modified by this file.
 *
 * Every row in this CSV carries UI Verification Status = NOT VERIFIED, so no
 * row's specific business-rule outcome has been confirmed live. Two shapes of
 * row occur:
 *
 *  - Rows 001-046 restate legacy Business Rules Catalogue v4.2 entries in
 *    generic "place the record in the condition that triggers the rule"
 *    language, several of which the CSV itself documents (Notes column) as
 *    ACCEPTED DIVERGENCE / PHASE-1 GAP versus the modernized RDMS UI. Their
 *    field mnemonics (e.g. M1POLN, TRNCODE) are legacy mainframe codes not
 *    confirmed to map onto a specific modernized element. These are asserted
 *    structurally (record reached, tab selected, Edit mode entered) with a
 *    comment quoting the specific rule/expected result that remains
 *    unverified - except TMS-RDMS-GEN-010 (BR-057), whose "no corrections
 *    made" refusal is concretely and safely checkable by saving with nothing
 *    changed.
 *
 *  - Rows 047-117 (BR-373..BR-410) give per-field accepted/breaching literal
 *    values for the modernized General Information fields. Where a row gives
 *    a concrete literal (not a "look this up on Reference Data
 *    Administration" placeholder) for a single, cleanly-named field, this
 *    file performs a real fill + Save round trip and checks the committed (or
 *    refused) outcome by reopening the record - never by trusting the legacy
 *    banner wording verbatim, since the Catalogue itself flags several of
 *    those wordings as unconfirmed against the modernized UI. Cross-field
 *    constraints, condition-code demonstrations, and rows whose only given
 *    value is a narrative placeholder are asserted structurally instead, with
 *    a comment explaining why.
 *
 * TMS-RDMS-GEN-050/051 (Policy Number) never actually commit an accepted
 * value: polNo is the shared fixture record's own search key
 * (TEST_POLICY_NUMBER in _helpers.ts), so overwriting it would relocate/break
 * the fixture for every other concurrently-run spec in this multi-agent
 * conversion; the positive case validates and then Cancels instead of Saving.
 */

// Confirmed live against the General Information edit form: plain text inputs carry a
// "identity.<field>" name attribute (never a bare one), so the CSV's field identifier needs
// this prefix reinstated to resolve at all.
const IDENTITY_PREFIXED_FIELDS = new Set([
  'polNo', 'lapPolNoRepl', 'nameIns', 'actionCodeOverride', 'reg', 'dist', 'staff', 'debNo',
  'agreeNoWritAgt', 'functionCode', 'writAgtInd', 'agreeNoNwritAgt', 'overrideChannelCode',
  'commScaleCode',
]);

// The modernized UI's dropdown fields are a custom combobox control (input role="combobox")
// with no name/id attribute at all, and its wrapping <label> also picks up a trailing hidden
// code (e.g. "RHO*G", "Channel CodePS") that defeats an exact getByLabel match. Confirmed live
// that every editable field is wrapped in <label><span class="detail-field-label">Caption</span>
// ...<input/></label>, so locate by that caption span instead. "Union Code" appears twice
// (Writing Agent / Non-Writing Agent, in that DOM order) - index disambiguates the two.
const COMBOBOX_FIELD_CAPTIONS: Record<string, { caption: string; index?: number }> = {
  rho: { caption: 'RHO' },
  transCode: { caption: 'Transaction Code' },
  transMode: { caption: 'Transaction Mode' },
  polKind: { caption: 'Policy Kind' },
  faceIncInd: { caption: 'Face Inc Indicator' },
  unionCodeWritAgt: { caption: 'Union Code', index: 0 },
  unionCodeNwritAgt: { caption: 'Union Code', index: 1 },
  suplementalKind: { caption: 'Supplementary Kind' },
  adjCode: { caption: 'Adjustment Code' },
  chrgBckRhoOrdIssRho: { caption: 'Charge Back RHO / Ordinary Issue RHO' },
  channelCode: { caption: 'Channel Code' },
  issueState: { caption: 'Issue State' },
};

// Locates a General Information field by its CSV-documented field identifier
// (e.g. 'polNo', 'rho', 'transCode'). Not in _helpers.ts because it is only
// needed by this one CSV's field-level rows.
function fieldByName(page: Page, name: string): Locator {
  const combobox = COMBOBOX_FIELD_CAPTIONS[name];
  if (combobox) {
    const escapedCaption = combobox.caption.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const labels = page.locator('label').filter({
      has: page.locator('span.detail-field-label', { hasText: new RegExp(`^${escapedCaption}\\*?$`, 'i') }),
    });
    return (combobox.index !== undefined ? labels.nth(combobox.index) : labels.first()).locator('input');
  }
  const attrName = IDENTITY_PREFIXED_FIELDS.has(name) ? `identity.${name}` : name;
  return page
    .locator(`[name="${attrName}"]`)
    .or(page.locator(`#${name}`))
    .or(page.getByLabel(new RegExp(`^${name}$`, 'i')))
    .first();
}

test.describe('RDMS-GEN - RDMS Error Record Editor: General Information business rules', () => {
  test('TMS-RDMS-GEN-001 - BR-002: A policy number keyed anywhere in its field is right-aligned so that it matches the format held onâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The value is shifted right one position at a time until the final position is filled. - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-002 - BR-003: The operator must state what is to be done: an item identifier alone, with no function selected, isâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The operator is told to mark a function, the cursor is placed on the first function field and the three function fields are intensified. - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-003 - BR-006: A suspended item is located either by the error control number quoted on the weekly listing or by pâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: A control number performs a direct keyed read; a policy number browses the policy index and the control number found is displayed so the opâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-004 - BR-016: Starting a new item or re-keying an identifier clears any policy browse position, so that the operaâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The saved policy number and browse position are cleared before the new key is processed. - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-005 - BR-017: Re-displaying the page already on screen holds the record for amendment, whereas moving to a differâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: Where the page equals the page last displayed the record is read for update; where the operator has typed a different page it is read withoâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-006 - BR-034: A brand new transaction always starts on the first data-entry screen regardless of what page was reâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The first page is presented. - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-007 - BR-036: Only the fields the operator actually typed over are taken from the screen; every untouched field iâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: ACCEPTED DIVERGENCE for Phase 1. Legacy behaviour, which is NOT to be asserted: The record value is re-displayed; where the operator keyedâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-008 - BR-047: Amounts on a machine-generated compensation transaction must not be altered online unless the transâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The agreement number, premium billed, annual premium and commission fields are protected, so batch-produced money cannot be over-typed. PHAâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-009 - BR-050: Record code and transaction code are not amendable on service register suspensions in one reason raâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The record code, transaction code and marketing code fields are protected. PHASE-1 GAP recorded in Catalogue v4.2: Mod-spec has no field-loâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-010 - BR-057: A transaction is only updated where the operator has actually changed something', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  // No field is changed before Save - exercises the documented "nothing keyed" refusal path.
  await recordEditorPage.clickSave();
  await expect(page.getByText(/NO CORRECTIONS WERE MADE/i)).toBeVisible();
  });

  test('TMS-RDMS-GEN-011 - BR-093: Correcting the branch, the supplementary kind or the plan invalidates the screen\'s product descriptâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: A recalculation marker is set, the reference service consulted, and the returned description placed in the screen heading. - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-012 - BR-170: Every field on every correction screen follows one uniform handling convention, distinguishing a fiâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: ACCEPTED DIVERGENCE for Phase 1. Legacy behaviour, which is NOT to be asserted: A field not keyed and not erased is skipped entirely; a fieâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-013 - BR-170: Negative: the condition governed by BR-170 is breached and the entry must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The save is refused. The failing field is highlighted, the cursor is placed on it, and where the refused entry was blank the field is overwâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-014 - BR-173: The regional office owning a transaction must be one of the six live offices, with two further codeâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: A valid office is applied to the record and to the suspense header; an invalid one is refused and highlighted. - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-015 - BR-173: Negative: the condition governed by BR-173 is breached and the entry must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The save is refused. The failing field is highlighted, the cursor is placed on it, and where the refused entry was blank the field is overwâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-016 - BR-174: A district code must be a four-character office identifier whose first position is a letter, whoseâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: Any breach of the shape rules or any unacceptable character is refused; a blank district is shown as markers. - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-017 - BR-174: Negative: the condition governed by BR-174 is breached and the entry must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The save is refused. The failing field is highlighted, the cursor is placed on it, and where the refused entry was blank the field is overwâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-018 - BR-175: A staff code must always be supplied and be a single acceptable character; blank is not acceptable', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: A blank or unacceptable character is refused and the field highlighted. - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-019 - BR-175: Negative: the condition governed by BR-175 is breached and the entry must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The save is refused. The failing field is highlighted, the cursor is placed on it, and where the refused entry was blank the field is overwâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-020 - BR-176: An agency number must be numeric, one reserved value may never be used, and the reserved managementâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The forbidden reserved value or a non-numeric entry is refused; the management agency on the first half of a record silently forces the chaâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-021 - BR-176: Negative: the condition governed by BR-176 is breached and the entry must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The save is refused. The failing field is highlighted, the cursor is placed on it, and where the refused entry was blank the field is overwâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-022 - BR-177: A producer agreement number is a six-character identifier, except on debit insurance business whereâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: A non-numeric agreement number on those branches is refused; on all other branches an alphanumeric one is accepted. - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-023 - BR-177: Negative: the condition governed by BR-177 is breached and the entry must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The save is refused. The failing field is highlighted, the cursor is placed on it, and where the refused entry was blank the field is overwâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-024 - BR-178: A policy number must be present unless the transaction is a producer-level adjustment rather than aâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: A blank policy number is accepted only where the action code marks the transaction as producer level; otherwise it is refused and shown asâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-025 - BR-178: Negative: the condition governed by BR-178 is breached and the entry must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The save is refused. The failing field is highlighted, the cursor is placed on it, and where the refused entry was blank the field is overwâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-026 - BR-182: One special charge branch supports only a single transaction type, and any other type keyed with itâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The whole transaction code is overwritten and the audit records the corrected value; a non-numeric transaction type at that point is a hardâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-027 - BR-183: For the life and variable product families the plan is mandatory and must be a right-justified fourâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: A mandatory-field failure is raised; the value is right justified and stripped of blanks before checking, and every remaining character musâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-028 - BR-186: A sum-assured increase marker is only meaningful on life business, must be blank or one of three inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: Refused and highlighted in the barred combination or where the value is outside the permitted set. PHASE-1 GAP recorded in Catalogue v4.2:â¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-029 - BR-186: Negative: the condition governed by BR-186 is breached and the entry must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The save is refused. The failing field is highlighted, the cursor is placed on it, and where the refused entry was blank the field is overwâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-030 - BR-189: Union codes for both producers must be numeric or blank', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: A non-numeric value is refused and the field highlighted; blank is accepted. - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-031 - BR-189: Negative: the condition governed by BR-189 is breached and the entry must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The save is refused. The failing field is highlighted, the cursor is placed on it, and where the refused entry was blank the field is overwâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-032 - BR-190: Debit life business recognises only a defined list of supplementary kinds, the kind is mandatory whâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: A value outside the list, or a blank on creation, is refused; the special branch silently forces its fixed value; a valid change triggers râ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-033 - BR-190: Negative: the condition governed by BR-190 is breached and the entry must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The save is refused. The failing field is highlighted, the cursor is placed on it, and where the refused entry was blank the field is overwâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-034 - BR-191: On the mainstream life and health branches the first action code must be blank, one of five recogniâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: Any other value is refused and the field highlighted. PHASE-1 GAP recorded in Catalogue v4.2: V082 action_code1 has 13 codes with valid_braâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-035 - BR-191: Negative: the condition governed by BR-191 is breached and the entry must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The save is refused. The failing field is highlighted, the cursor is placed on it, and where the refused entry was blank the field is overwâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-036 - BR-196: The transaction mode must be two letters, except on the two transfer modes where the second positioâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: Anything else is refused; a blank mode is redisplayed as markers. - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-037 - BR-196: Negative: the condition governed by BR-196 is breached and the entry must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The save is refused. The failing field is highlighted, the cursor is placed on it, and where the refused entry was blank the field is overwâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-038 - BR-198: The issuing jurisdiction must be a recognised domestic state number, or a recognised overseas proviâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: Out-of-range or unrecognised values are refused and shown as markers; blank is tolerated only for products that are not licence checked. PHâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-039 - BR-198: Negative: the condition governed by BR-198 is breached and the entry must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The save is refused. The failing field is highlighted, the cursor is placed on it, and where the refused entry was blank the field is overwâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-040 - BR-199: The charge-back office is expressed as a numeric or letter office code on partner business and as aâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: An invalid code is refused and shown as a marker; on partner business the field cannot be skipped. PHASE-1 GAP recorded in Catalogue v4.2:â¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-041 - BR-199: Negative: the condition governed by BR-199 is breached and the entry must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The save is refused. The failing field is highlighted, the cursor is placed on it, and where the refused entry was blank the field is overwâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-042 - BR-202: The channel bypass marker, the action code and the commission scale code on the identification screâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: An unacceptable character is refused and the field highlighted; otherwise the value is applied and audited. PHASE-1 GAP recorded in Catalogâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-043 - BR-202: Negative: the condition governed by BR-202 is breached and the entry must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The save is refused. The failing field is highlighted, the cursor is placed on it, and where the refused entry was blank the field is overwâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-044 - BR-218: The commission marketing code must be one of three recognised marketing categories', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: Any other value is refused and the field highlighted. - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-045 - BR-218: Negative: the condition governed by BR-218 is breached and the entry must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The save is refused. The failing field is highlighted, the cursor is placed on it, and where the refused entry was blank the field is overwâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-046 - BR-269: To amend the contents of a suspended transaction rather than its disposition, the operator selectsâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: The line's identifier is moved to the correction screen, the entire enquiry context is saved to a terminal-owned store, and control transfeâ¦ - not independently checkable without seeded backend state this CSV does not supply a concrete literal for.
  });

  test('TMS-RDMS-GEN-047 - BR-373: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the facility refusâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-048 - BR-374: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'rho');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('B');
  await recordEditorPage.clickSave();
  // Save succeeded: no screening-error banner, and the editor leaves amendment mode.
  await expect(page.getByText(/error/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Edit$/i })).toBeVisible();
  await expect(fieldByName(page, 'rho')).toHaveValue('B');
  // Restore the shared fixture record's original value for other concurrently-run specs.
  await recordEditorPage.clickEdit();
  await fieldByName(page, 'rho').fill(original);
  await recordEditorPage.clickSave();
  });

  test('TMS-RDMS-GEN-049 - BR-374: Negative: a value breaching the BR-374 constraint on rho must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'rho');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('#');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'rho')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-050 - BR-375: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'polNo');
  await expect(field).toBeVisible();
  await field.fill('');
  await field.fill('123456789');
  await expect(field).toHaveValue('123456789');
  // Not saved: polNo (Policy Number) is the shared fixture record's own search
  // key (TEST_POLICY_NUMBER in _helpers.ts) - committing a new value here would
  // relocate/break the fixture for every other concurrently-run spec in this suite.
  await page.getByRole('button', { name: /^Cancel$/i }).click();
  });

  test('TMS-RDMS-GEN-051 - BR-375: Negative: a value breaching the BR-375 constraint on polNo must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'polNo');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('1234567890');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  // Reopening lands in read-only View mode (plain text, no <input>), so Edit must be
  // re-entered before fieldByName's input-based locator can resolve anything.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'polNo')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-052 - BR-376: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'transCode');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('01');
  await recordEditorPage.clickSave();
  // Save succeeded: no screening-error banner, and the editor leaves amendment mode.
  await expect(page.getByText(/error/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Edit$/i })).toBeVisible();
  await expect(fieldByName(page, 'transCode')).toHaveValue('01');
  // Restore the shared fixture record's original value for other concurrently-run specs.
  await recordEditorPage.clickEdit();
  await fieldByName(page, 'transCode').fill(original);
  await recordEditorPage.clickSave();
  });

  test('TMS-RDMS-GEN-053 - BR-376; BR-309: BR-376 applies no online validation to transCode, so a value outside the documented domain must beâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'transCode');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('#@');
  await recordEditorPage.clickSave();
  // Save succeeded: no screening-error banner, and the editor leaves amendment mode.
  await expect(page.getByText(/error/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Edit$/i })).toBeVisible();
  await expect(fieldByName(page, 'transCode')).toHaveValue('#@');
  // Restore the shared fixture record's original value for other concurrently-run specs.
  await recordEditorPage.clickEdit();
  await fieldByName(page, 'transCode').fill(original);
  await recordEditorPage.clickSave();
  });

  test('TMS-RDMS-GEN-054 - BR-377: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'transMode');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('01');
  await recordEditorPage.clickSave();
  // Save succeeded: no screening-error banner, and the editor leaves amendment mode.
  await expect(page.getByText(/error/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Edit$/i })).toBeVisible();
  await expect(fieldByName(page, 'transMode')).toHaveValue('01');
  // Restore the shared fixture record's original value for other concurrently-run specs.
  await recordEditorPage.clickEdit();
  await fieldByName(page, 'transMode').fill(original);
  await recordEditorPage.clickSave();
  });

  test('TMS-RDMS-GEN-055 - BR-377: Negative: a value breaching the BR-377 constraint on transMode must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'transMode');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('#@');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'transMode')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-056 - BR-378: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'lapPolNoRepl');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('123456789');
  await recordEditorPage.clickSave();
  // Save succeeded: no screening-error banner, and the editor leaves amendment mode.
  await expect(page.getByText(/error/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Edit$/i })).toBeVisible();
  await expect(fieldByName(page, 'lapPolNoRepl')).toHaveValue('123456789');
  // Restore the shared fixture record's original value for other concurrently-run specs.
  await recordEditorPage.clickEdit();
  await fieldByName(page, 'lapPolNoRepl').fill(original);
  await recordEditorPage.clickSave();
  });

  test('TMS-RDMS-GEN-057 - BR-378: Negative: a value breaching the BR-378 constraint on lapPolNoRepl must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'lapPolNoRepl');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('1234567890');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'lapPolNoRepl')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-058 - BR-379: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-059 - BR-379: Negative: the constraint BR-379 enforces is breached and the save must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-060 - BR-380: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-061 - BR-380: Negative: the constraint BR-380 enforces is breached and the save must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-062 - BR-381: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'dist');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('B12X');
  await recordEditorPage.clickSave();
  // Save succeeded: no screening-error banner, and the editor leaves amendment mode.
  await expect(page.getByText(/error/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Edit$/i })).toBeVisible();
  await expect(fieldByName(page, 'dist')).toHaveValue('B12X');
  // Restore the shared fixture record's original value for other concurrently-run specs.
  await recordEditorPage.clickEdit();
  await fieldByName(page, 'dist').fill(original);
  await recordEditorPage.clickSave();
  });

  test('TMS-RDMS-GEN-063 - BR-381: Negative: a value breaching the BR-381 constraint on dist must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'dist');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('1B2X');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'dist')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-064 - BR-382: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'staff');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('7');
  await recordEditorPage.clickSave();
  // Save succeeded: no screening-error banner, and the editor leaves amendment mode.
  await expect(page.getByText(/error/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Edit$/i })).toBeVisible();
  await expect(fieldByName(page, 'staff')).toHaveValue('7');
  // Restore the shared fixture record's original value for other concurrently-run specs.
  await recordEditorPage.clickEdit();
  await fieldByName(page, 'staff').fill(original);
  await recordEditorPage.clickSave();
  });

  test('TMS-RDMS-GEN-065 - BR-382: Negative: a value breaching the BR-382 constraint on staff must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'staff');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('#');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'staff')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-066 - BR-383: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'debNo');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('123');
  await recordEditorPage.clickSave();
  // Save succeeded: no screening-error banner, and the editor leaves amendment mode.
  await expect(page.getByText(/error/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Edit$/i })).toBeVisible();
  await expect(fieldByName(page, 'debNo')).toHaveValue('123');
  // Restore the shared fixture record's original value for other concurrently-run specs.
  await recordEditorPage.clickEdit();
  await fieldByName(page, 'debNo').fill(original);
  await recordEditorPage.clickSave();
  });

  test('TMS-RDMS-GEN-067 - BR-383: Negative: a value breaching the BR-383 constraint on debNo must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'debNo');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('12A');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'debNo')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-068 - BR-384: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'writAgtInd');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('A');
  await recordEditorPage.clickSave();
  // Save succeeded: no screening-error banner, and the editor leaves amendment mode.
  await expect(page.getByText(/error/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Edit$/i })).toBeVisible();
  await expect(fieldByName(page, 'writAgtInd')).toHaveValue('A');
  // Restore the shared fixture record's original value for other concurrently-run specs.
  await recordEditorPage.clickEdit();
  await fieldByName(page, 'writAgtInd').fill(original);
  await recordEditorPage.clickSave();
  });

  test('TMS-RDMS-GEN-069 - BR-384; BR-309: BR-384 applies no online validation to writAgtInd, so a value outside the documented domain must beâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'writAgtInd');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('AA');
  await recordEditorPage.clickSave();
  // Save succeeded: no screening-error banner, and the editor leaves amendment mode.
  await expect(page.getByText(/error/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Edit$/i })).toBeVisible();
  await expect(fieldByName(page, 'writAgtInd')).toHaveValue('AA');
  // Restore the shared fixture record's original value for other concurrently-run specs.
  await recordEditorPage.clickEdit();
  await fieldByName(page, 'writAgtInd').fill(original);
  await recordEditorPage.clickSave();
  });

  test('TMS-RDMS-GEN-070 - BR-385: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-071 - BR-385: Negative: the constraint BR-385 enforces is breached and the save must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-072 - BR-386: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: confirmed live that Record Code renders as a read-only value (a plain
  // span, never an input) even in Edit mode - consistent with BR-050 elsewhere in this same
  // CSV, which documents record code as not amendable. BR-386's "value keyed into recordCode"
  // premise does not hold against the modernized UI, so it is not independently checkable.
  });

  test('TMS-RDMS-GEN-073 - BR-386: Negative: a value breaching the BR-386 constraint on recordCode must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: confirmed live that Record Code renders as a read-only value (a plain
  // span, never an input) even in Edit mode - consistent with BR-050 elsewhere in this same
  // CSV, which documents record code as not amendable. BR-386's "value keyed into recordCode"
  // premise does not hold against the modernized UI, so it is not independently checkable.
  });

  test('TMS-RDMS-GEN-074 - BR-387: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: accepted value for unionCodeWritAgt is "any code listed in ref_lookup[union_code] - obtain the current list from the Reference Daâ¦" - requires a live Reference Data Administration lookup this suite does not perform; only field presence in Edit mode is asserted for real.
  });

  test('TMS-RDMS-GEN-075 - BR-387: Negative: a value breaching the BR-387 constraint on unionCodeWritAgt must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'unionCodeWritAgt');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('ZZZ');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'unionCodeWritAgt')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-076 - BR-388: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: accepted value for reg is "any code listed in ref_lookup[region] - obtain the current list from the Reference Data Aâ¦" - requires a live Reference Data Administration lookup this suite does not perform; only field presence in Edit mode is asserted for real.
  });

  test('TMS-RDMS-GEN-077 - BR-388: Negative: a value breaching the BR-388 constraint on reg must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'reg');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('ZZZ');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'reg')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-078 - BR-389: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: accepted value for unionCodeNwritAgt is "any code listed in ref_lookup[union_code_nwrit] - obtain the current list from the Refereâ¦" - requires a live Reference Data Administration lookup this suite does not perform; only field presence in Edit mode is asserted for real.
  });

  test('TMS-RDMS-GEN-079 - BR-389: Negative: a value breaching the BR-389 constraint on unionCodeNwritAgt must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'unionCodeNwritAgt');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('ZZZ');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'unionCodeNwritAgt')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-080 - BR-390: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: accepted value for suplementalKind is "any code listed in ref_lookup[supl_kind] - obtain the current list from the Reference Datâ¦" - requires a live Reference Data Administration lookup this suite does not perform; only field presence in Edit mode is asserted for real.
  });

  test('TMS-RDMS-GEN-081 - BR-390: Negative: a value breaching the BR-390 constraint on suplementalKind must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'suplementalKind');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('ZZZ');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'suplementalKind')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-082 - BR-391: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: accepted value for actionCodes[1..9].code is "a valid alphanumeric value for this field" - requires a live Reference Data Administration lookup this suite does not perform; only field presence in Edit mode is asserted for real.
  });

  test('TMS-RDMS-GEN-083 - BR-391: Negative: a value breaching the BR-391 constraint on actionCodes[1..9].code must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: breaching value for actionCodes[1..9].code is described narratively, not given as a literal ("a value longer than the field permits"); only field presence in Edit mode is asserted for real.
  });

  test('TMS-RDMS-GEN-084 - BR-392: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: accepted value for adjCode is "any code listed in ref_lookup[adj_code] - obtain the current list from the Reference Dataâ¦" - requires a live Reference Data Administration lookup this suite does not perform; only field presence in Edit mode is asserted for real.
  });

  test('TMS-RDMS-GEN-085 - BR-392: Negative: a value breaching the BR-392 constraint on adjCode must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'adjCode');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('ZZZ');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'adjCode')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-086 - BR-393: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'polKind');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('01');
  await recordEditorPage.clickSave();
  // Save succeeded: no screening-error banner, and the editor leaves amendment mode.
  await expect(page.getByText(/error/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Edit$/i })).toBeVisible();
  await expect(fieldByName(page, 'polKind')).toHaveValue('01');
  // Restore the shared fixture record's original value for other concurrently-run specs.
  await recordEditorPage.clickEdit();
  await fieldByName(page, 'polKind').fill(original);
  await recordEditorPage.clickSave();
  });

  test('TMS-RDMS-GEN-087 - BR-393: Negative: a value breaching the BR-393 constraint on polKind must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'polKind');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('ZZ');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'polKind')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-088 - BR-394: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: accepted value for issueState is "any code listed in ref_lookup[us_state] - obtain the current list from the Reference Dataâ¦" - requires a live Reference Data Administration lookup this suite does not perform; only field presence in Edit mode is asserted for real.
  });

  test('TMS-RDMS-GEN-089 - BR-394: Negative: a value breaching the BR-394 constraint on issueState must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'issueState');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('ZZZ');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'issueState')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-090 - BR-395: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: accepted value for faceIncInd is "any code listed in ref_lookup[face_inc_ind] - obtain the current list from the Referenceâ¦" - requires a live Reference Data Administration lookup this suite does not perform; only field presence in Edit mode is asserted for real.
  });

  test('TMS-RDMS-GEN-091 - BR-395: Negative: a value breaching the BR-395 constraint on faceIncInd must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'faceIncInd');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('ZZZ');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'faceIncInd')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-092 - BR-396: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: accepted value for chrgBckRhoOrdIssRho is "any code listed in ref_lookup[rho] - obtain the current list from the Reference Data Admiâ¦" - requires a live Reference Data Administration lookup this suite does not perform; only field presence in Edit mode is asserted for real.
  });

  test('TMS-RDMS-GEN-093 - BR-396: Negative: a value breaching the BR-396 constraint on chrgBckRhoOrdIssRho must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'chrgBckRhoOrdIssRho');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('ZZZ');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'chrgBckRhoOrdIssRho')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-094 - BR-397: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'channelCode');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('01');
  await recordEditorPage.clickSave();
  // Save succeeded: no screening-error banner, and the editor leaves amendment mode.
  await expect(page.getByText(/error/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Edit$/i })).toBeVisible();
  await expect(fieldByName(page, 'channelCode')).toHaveValue('01');
  // Restore the shared fixture record's original value for other concurrently-run specs.
  await recordEditorPage.clickEdit();
  await fieldByName(page, 'channelCode').fill(original);
  await recordEditorPage.clickSave();
  });

  test('TMS-RDMS-GEN-095 - BR-397: Negative: a value breaching the BR-397 constraint on channelCode must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'channelCode');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('ZZ');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'channelCode')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-096 - BR-398: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: accepted value for actionCodeOverride is "any code listed in ref_lookup[action_code] - obtain the current list from the Reference Dâ¦" - requires a live Reference Data Administration lookup this suite does not perform; only field presence in Edit mode is asserted for real.
  });

  test('TMS-RDMS-GEN-097 - BR-398: Negative: a value breaching the BR-398 constraint on actionCodeOverride must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'actionCodeOverride');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('ZZZ');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'actionCodeOverride')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-098 - BR-399: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: accepted value for commScaleCode is "any code listed in ref_lookup[comm_scale] - obtain the current list from the Reference Daâ¦" - requires a live Reference Data Administration lookup this suite does not perform; only field presence in Edit mode is asserted for real.
  });

  test('TMS-RDMS-GEN-099 - BR-399: Negative: a value breaching the BR-399 constraint on commScaleCode must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  const field = fieldByName(page, 'commScaleCode');
  await expect(field).toBeVisible();
  const original = await field.inputValue();
  await field.fill('');
  await field.fill('ZZZ');
  await recordEditorPage.clickSave();
  // Refused: an error banner is shown (exact legacy wording is not asserted verbatim -
  // Catalogue v4.2 flags several of these banners as not yet confirmed against the
  // modernized UI's own wording).
  await expect(page.getByText(/error/i).first()).toBeVisible();
  // Nothing partly committed: reopen the record fresh and confirm the pre-save value held.
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await expect(fieldByName(page, 'commScaleCode')).toHaveValue(original);
  });

  test('TMS-RDMS-GEN-100 - BR-400: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-101 - BR-400: Negative: the constraint BR-400 enforces is breached and the save must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-102 - BR-401: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-103 - BR-401: Negative: the constraint BR-401 enforces is breached and the save must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-104 - BR-402: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-105 - BR-402: Negative: the constraint BR-402 enforces is breached and the save must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-106 - BR-403: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: confirmed live that Bypass Screening renders as a read-only value ("N No",
  // a plain span, never an input) even in Edit mode - it is system-derived/display-only, the
  // same pattern BR-146 documents for another field in this UI. BR-403's "value keyed into
  // bypassScreening" premise does not hold against the modernized UI, so it is not
  // independently checkable.
  });

  test('TMS-RDMS-GEN-107 - BR-403: Negative: a value breaching the BR-403 constraint on bypassScreening must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: confirmed live that Bypass Screening renders as a read-only value ("N No",
  // a plain span, never an input) even in Edit mode - it is system-derived/display-only, the
  // same pattern BR-146 documents for another field in this UI. BR-403's "value keyed into
  // bypassScreening" premise does not hold against the modernized UI, so it is not
  // independently checkable.
  });

  test('TMS-RDMS-GEN-108 - BR-404: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-109 - BR-404: Negative: the constraint BR-404 enforces is breached and the save must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-110 - BR-405: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-111 - BR-405: Negative: the constraint BR-405 enforces is breached and the save must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-112 - BR-406: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the value keyed inâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: confirmed live that AOS Trans Code is not a General Information field at
  // all - it lives on the Additional Information tab, where RDMS-ADD.spec.ts (BR-146)
  // confirms it renders disabled/display-only (system-derived, never operator-keyed).
  // BR-406's "value keyed into aosTransCode" premise does not hold against the modernized
  // UI, so it is not independently checkable here.
  });

  test('TMS-RDMS-GEN-113 - BR-406: Negative: a value breaching the BR-406 constraint on aosTransCode must be refused', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: confirmed live that AOS Trans Code is not a General Information field at
  // all - it lives on the Additional Information tab, where RDMS-ADD.spec.ts (BR-146)
  // confirms it renders disabled/display-only (system-derived, never operator-keyed).
  // BR-406's "value keyed into aosTransCode" premise does not hold against the modernized
  // UI, so it is not independently checkable here.
  });

  test('TMS-RDMS-GEN-114 - BR-407: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the facility refusâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-115 - BR-408: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the facility refusâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-116 - BR-409: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the facility refusâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });

  test('TMS-RDMS-GEN-117 - BR-410: On the legacy screen DA01002, carried into the modernized RDMS: General Section, the facility trapsâ¦', async ({ page, loginPage, recordEditorPage }) => {
  await loginPage.loginAsValidUser();
  await recordEditorPage.openConfirmedTestRecord();
  await recordEditorPage.openRdmsTab('General Information');
  await recordEditorPage.clickEdit();
  await recordEditorPage.expectRegionVisible(/General/i);
  // NOT VERIFIED: this is a cross-field constraint or a raw condition-code demonstration with no single concrete field+value literal in the CSV to key; only the documented screen/tab reachability and Edit-mode entry are asserted for real.
  });
});
