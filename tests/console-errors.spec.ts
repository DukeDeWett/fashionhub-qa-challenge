import { test, expect } from '@playwright/test';

/**
 * Test Case 1
 * As a tester, I want to make sure there are no console errors when
 * visiting the FashionHub home page.
 *
 * The /about page contains an intentional error and is used separately
 * to prove this check actually catches failures (see console-errors.spec.ts
 * "about page" test below, which is expected/documented to fail).
 */
test.describe('Console errors', () => {
  test('home page loads with no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(consoleErrors, `Console errors found:\n${consoleErrors.join('\n')}`).toHaveLength(0);
    expect(pageErrors, `Uncaught page errors found:\n${pageErrors.join('\n')}`).toHaveLength(0);
  });

  /**
   * Documents the hinted-at negative case: the about page ships an
   * intentional error, so this test is EXPECTED to fail. Kept as `test.fail()`
   * so the suite still reports green overall while proving the check works.
   */
  test('about page contains a known intentional console error', async ({ page }) => {
    test.fail(true, 'about.html intentionally ships a console error per the challenge hint');

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/about.html');
    await page.waitForLoadState('networkidle');

    expect(consoleErrors, 'Expected the known intentional error to be present').toHaveLength(0);
  });
});
