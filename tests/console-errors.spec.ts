import { test, expect, Page } from '@playwright/test';

/**
 * Test Case 1
 * As a tester, I want to make sure there are no console errors when
 * visiting the FashionHub home page.
 *
 * Detection strategy: rather than pattern-matching on generic console text
 * (which is too coarse — different failures can share the same generic
 * browser wording like "Failed to load resource: 404"), we track the exact
 * URL of every failed network response via the 'response' event, and treat
 * genuine JS-level console.error()/uncaught-exception messages separately.
 * The only thing we deliberately exclude is the favicon: the site ships no
 * favicon.ico, so every browser auto-requests one and logs a 404 — universal
 * browser behavior unrelated to the app's own code, not a real bug.
 */
async function collectPageIssues(page: Page, path: string) {
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

  await page.goto(path);
  await page.waitForLoadState('networkidle');

  return { consoleErrors, pageErrors, failedRequests };
}

test.describe('Console errors', () => {
  test('home page loads with no console errors', async ({ page }) => {
    const { consoleErrors, pageErrors, failedRequests } = await collectPageIssues(page, '/');

    // Note: this is expected to fail against the current live site. A resource
    // referencing the bare domain root (https://pocketaces2.github.io/ instead
    // of .../fashionhub/) 404s on load — a genuine defect, documented in the
    // README under "Known issues found by the suite", and also caught
    // independently by tests/link-status-codes.spec.ts.
    expect(consoleErrors, `Console errors found:\n${consoleErrors.join('\n')}`).toHaveLength(0);
    expect(pageErrors, `Uncaught page errors found:\n${pageErrors.join('\n')}`).toHaveLength(0);
    expect(
      failedRequests,
      `Failed resource requests found:\n${failedRequests.join('\n')}`
    ).toHaveLength(0);
  });

  /**
   * Documents the hinted-at negative case: the about page ships an
   * intentional error, so this test is EXPECTED to fail. Kept as `test.fail()`
   * so the suite still reports green overall while proving the check works.
   */
  test('about page contains a known intentional console error', async ({ page }) => {
    test.fail(true, 'about.html intentionally ships an error per the challenge hint');

    const { consoleErrors, pageErrors, failedRequests } = await collectPageIssues(
      page,
      '/about.html'
    );
    const totalIssues = consoleErrors.length + pageErrors.length + failedRequests.length;

    expect(
      totalIssues,
      `Expected the known intentional error to be present.\n` +
        `Console errors: ${JSON.stringify(consoleErrors)}\n` +
        `Page errors: ${JSON.stringify(pageErrors)}\n` +
        `Failed requests: ${JSON.stringify(failedRequests)}`
    ).toBe(0);
  });
});
