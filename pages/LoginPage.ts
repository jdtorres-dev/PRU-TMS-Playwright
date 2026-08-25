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
    await this.page.goto(`${BASE_URL}/login`);
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
