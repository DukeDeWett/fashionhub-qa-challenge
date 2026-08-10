import { test } from '@playwright/test';
import { LoginPage } from '../src/pages/LoginPage';

/**
 * Test Case 3
 * As a customer, I want to verify I can log in to FashionHub.
 */
test.describe('Login', () => {
  test('customer can log in with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto('login.html');
    await loginPage.login('demouser', 'fashion123');
    await loginPage.expectLoggedIn();
  });
});
