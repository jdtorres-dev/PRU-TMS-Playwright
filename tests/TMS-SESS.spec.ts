import { test, expect } from '../fixtures/pages.fixture';
import { VALID_USERNAME, VALID_PASSWORD } from '../test-data/constants';

/**
 * PRU TMS - TMS-SESS group (TMS-SESS.csv, 1 row, TMS-TMS-SESS-001 - the CSV's own Test Case
 * ID column literally carries the doubled "TMS-TMS-SESS-001" prefix, reproduced verbatim).
 * Converted from the PRU TMS v4 CSV export (2026-08-25). The source CSV is the system of
 * record and is not modified by this file.
 *
 * Verification gap: BR-025 governs a legacy "training mode" that reads/writes a terminal's
 * temporary practice queue instead of the live file. This CSV's own Notes column records
 * "Training mode not carried into modernization; devs use dev-profile with
 * InMemoryUserDetailsManager instead" - there is no training-mode concept in this app to
 * place a record into, so the rule's actual queue-routing behavior and its QIDERR message
 * cannot be triggered or observed here. What IS checkable, consistent with that finding: no
 * training-mode indicator/banner is exposed anywhere in the sign-in or post-login flow.
 */
test.describe('TMS-SESS - Training-mode isolation', () => {
  test("TMS-TMS-SESS-001 - BR-025: work done in training mode is never written to live business files; the trainee's record is held in temporary storage only", async ({ page, loginPage }) => {
    const trainingIndicator = () => page.getByText(/training/i);

    await loginPage.goto();
    await expect(trainingIndicator()).toHaveCount(0);

    await loginPage.submitLogin(VALID_USERNAME, VALID_PASSWORD);
    await page.waitForURL(/\/errors/);
    await expect(trainingIndicator()).toHaveCount(0);
  });
});
