import { test, expect } from '@playwright/test';

/**
 * Test Case 1
 * As a tester, I want to make sure there are no console errors when
 * visiting the FashionHub home page.
 *
 * The /about page contains an intentional error and is used separately
 * to prove this check actually catches failures (see the second test below,
 * which is expected/documented to fail).
 *
 * Note: browser-generated "failed to load favicon.ico" noise is deliberately
 * excluded. The site ships no favicon, so browsers auto-request one and log
 * a 404 to the console — this is universal browser behavior unrelated to the
 * app's own code, and is standard practice to filter out in console-error
 * checks so real issues aren't buried in noise.
 */
test.describe('Console errors', () => {
  test('home page loads with no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error' && !/failed to load resource/i.test(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    page.on('response', (response) => {
      const url = response.url();
      if (response.status() >= 400 && !/favicon/i.test(url)) {
        failedRequests.push(`${response.status()} ${url}`);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(consoleErrors, `Console errors found:\n${consoleErrors.join('\n')}`).toHaveLength(0);
    expect(pageErrors, `Uncaught page errors found:\n${pageErrors.join('\n')}`).toHaveLength(0);
    expect(
      failedRequests,
      `Failed resource requests found:\n${failedRequests.join('\n')}`
    ).toHaveLength(0);
  });

  test('about page contains a known intentional console error', async ({ page }) => {
    test.fail(true, 'about.html intentionally ships a console error per the challenge hint');

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !/failed to load resource/i.test(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/about.html');
    await page.waitForLoadState('networkidle');

    expect(consoleErrors, 'Expected the known intentional error to be present').toHaveLength(0);
  });
});
