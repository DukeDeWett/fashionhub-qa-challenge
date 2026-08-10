import { test, expect } from '@playwright/test';
import { collectPageLinks, checkLinkStatus, isClientError } from '../src/utils/linkChecker';

/**
 * Test Case 2
 * As a tester, I want to check if a page is returning the expected status code.
 * Every <a href> found on the home page must resolve to 200 or 30x, and never 40x.
 */
test.describe('Link status codes', () => {
  test('all links on the home page resolve to 200/30x and never 40x', async ({ page, request }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const links = await collectPageLinks(page);
    expect(links.length, 'Expected to find at least one link on the page').toBeGreaterThan(0);

    const results = await Promise.all(links.map((href) => checkLinkStatus(request, href)));

    const clientErrors = results.filter((r) => r.status !== null && isClientError(r.status));
    const unreachable = results.filter((r) => r.status === null);
    const failures = [...clientErrors, ...unreachable];

    if (failures.length > 0) {
      const report = failures
        .map((f) => `  - ${f.href} -> ${f.status ?? 'ERROR'}${f.error ? ` (${f.error})` : ''}`)
        .join('\n');
      console.log(`Link check failures:\n${report}`);
    }

    expect(failures, JSON.stringify(failures, null, 2)).toHaveLength(0);
  });
});
