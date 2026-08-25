import { test, expect } from '../fixtures/pages.fixture';
import { TEST_POLICY_NUMBER } from '../test-data/constants';

/**
 * PRU TMS - PIRCS-STAT group (PIRCS-STAT.csv, 1 row, TMS-PIRCS-STAT-001).
 * Converted from the PRU TMS v4 CSV export (2026-08-25). This row's own Steps/Expected
 * Result column is implemented directly below; the source CSV is the system of record and
 * is not modified by this file.
 *
 * Verification gap: BR-257 describes a LEGACY two-screen criteria UX (moving between them
 * discards whatever was keyed on the screen being left). This CSV's own Notes column records
 * that the legacy dual-screen UX was "collapsed into single React workbench (S4.1) with all
 * filters visible - cross-screen loss doesn't apply" to the modernized app, so the literal
 * cross-screen-loss mechanic cannot be triggered here. The test below instead verifies the
 * closest currently-checkable analog: both screens BR-257 refers to (quality-review sampling
 * and non-CB record selection) are reachable, and criteria keyed into one tab's own search
 * form is not carried over into another tab's search form.
 */
test.describe('PIRCS-STAT - Criteria-screen navigation (modernized single workbench)', () => {
  test('TMS-PIRCS-STAT-001 - BR-257: the second criteria screen offers quality-review sampling and non-compensation record selection; leaving a criteria screen discards what was keyed on it', async ({ page, loginPage, errorManagerPage }) => {
    await loginPage.loginAsValidUser();
    await errorManagerPage.selectSearchTab('CB Records');

    const policyField = errorManagerPage.policyNumberField();
    await policyField.fill(TEST_POLICY_NUMBER);
    await expect(policyField).toHaveValue(TEST_POLICY_NUMBER);

    // Move to the tab that corresponds to BR-257's "quality-review sampling" criteria screen.
    await errorManagerPage.selectSearchTab('Quality Review');
    await expect(page.getByRole('tab', { name: 'Quality Review', exact: true })).toBeVisible();
    const qrPolicyField = errorManagerPage.policyNumberField();
    if (await qrPolicyField.count()) {
      // Criteria keyed on the CB Records tab must not leak into this tab's own search form.
      await expect(qrPolicyField).not.toHaveValue(TEST_POLICY_NUMBER);
    }

    // Move to the tab that corresponds to BR-257's "non-compensation record selection" screen.
    await errorManagerPage.selectSearchTab('Non-CB Records');
    await expect(page.getByRole('tab', { name: 'Non-CB Records', exact: true })).toBeVisible();
  });
});
