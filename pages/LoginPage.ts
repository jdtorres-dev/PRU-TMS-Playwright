import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { BASE_URL, VALID_USERNAME, VALID_PASSWORD } from '../test-data/constants';

/**
 * Sign-in screen and the profile-menu sign-out action that ends a session. Every test case
 * in this suite requires an authenticated session first (per each row's own Preconditions
 * column) - loginAsValidUser() is that shared login sequence: navigate to /login, sign in
 * as the confirmed admin/admin (ROLE_OPERATOR) account, and land on Error Manager
 * (CB Records) at /errors.
 */
export class LoginPage extends BasePage {
  usernameField(): Locator {
    return this.page.getByLabel(/^Username$/i);
  }

  passwordField(): Locator {
    return this.page.getByLabel(/^Password$/i);
  }

  signInButton(): Locator {
    return this.page.getByRole('button', { name: /^Sign In$/i });
  }

  credentialsBanner(): Locator {
    return this.page.getByText('Invalid username or password.', { exact: true });
  }

  usernameRequiredError(): Locator {
    return this.page.getByText('Username is required.', { exact: true });
  }

  passwordRequiredError(): Locator {
    return this.page.getByText('Password is required.', { exact: true });
  }

  mfaOtpPrompt(): Locator {
    return this.page.getByText(
      /\b(MFA|OTP|one[- ]?time (passcode|password|code)|verification code|two[- ]?factor)\b/i,
    );
  }

  async goto(): Promise<void> {
    // waitUntil: 'domcontentloaded' rather than the default 'load' - live-confirmed (2026-09-11,
    // via a Playwright trace's own network log) that the default can hang indefinitely: it
    // requires every last resource the page requests (including non-critical ones) to finish,
    // and a single stalled request on this shared demo environment blocks goto() itself from
    // ever resolving, before the test even gets a chance to wait on a real element. The
    // signInButton() assertion below does the actual "is this screen ready" check via its own
    // independent polling, so goto() only needs the DOM to exist, not every asset to finish.
    await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await expect(this.signInButton()).toBeVisible();
  }

  async submitLogin(username: string, password: string): Promise<void> {
    if (username) await this.usernameField().fill(username);
    if (password) await this.passwordField().fill(password);
    await this.signInButton().click();
  }

  async loginAsValidUser(): Promise<void> {
    await this.goto();
    await this.submitLogin(VALID_USERNAME, VALID_PASSWORD);
    await this.page.waitForURL(/\/errors/);
  }

  async openProfileMenu(): Promise<void> {
    await this.page.getByRole('button', { name: 'Open profile menu' }).click();
  }

  async logout(): Promise<void> {
    await this.openProfileMenu();
    await this.page.getByRole('menuitem', { name: 'Sign Out' }).click();
  }
}
