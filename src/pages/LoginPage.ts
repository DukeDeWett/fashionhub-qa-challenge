import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Selectors kept resilient (id-first, label fallback) since we don't control the app markup.
    this.usernameInput = page.locator('#username, input[name="username"]').first();
    this.passwordInput = page.locator('#password, input[name="password"]').first();
    this.submitButton = page.locator(
      'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Log in")'
    ).first();
  }

  async goto(path = 'login.html') {
    await this.page.goto(path);
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectLoggedIn() {
    // The app doesn't give us a documented "success" element, so we assert on
    // the most reliable signal available: we've navigated away from the login
    // page and/or a logout affordance or account context is now visible.
    await expect(this.page).not.toHaveURL(/login\.html/, { timeout: 10_000 });
  }
}
