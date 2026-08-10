import { test, expect } from '@playwright/test';
import path from 'path';
import { fetchOpenPullRequests, toCsv, writeCsvReport } from '../src/utils/githubPullRequests';
import { getEnvironmentConfig } from '../src/config/env-resolver';

/**
 * Test Case 4
 * As a product owner, I want to see how many open pull requests there are
 * for our product. Output is a CSV of PR name, created date, and author.
 *
 * Uses appwrite/appwrite as the example product, per the challenge.
 */
test.describe('GitHub open pull requests report', () => {
  test('exports open PRs to CSV with name, created date, author', async ({ request }) => {
    const { githubRepo } = getEnvironmentConfig();

    const pullRequests = await fetchOpenPullRequests(request, githubRepo);
    console.log(`Found ${pullRequests.length} open PR(s) for ${githubRepo}`);

    const csv = toCsv(pullRequests);
    expect(csv.split('\n')[0]).toBe('PR Name,Created Date,Author');

    const outputPath = path.resolve('reports', `open-prs-${githubRepo.replace('/', '_')}.csv`);
    writeCsvReport(pullRequests, outputPath);
    console.log(`CSV report written to ${outputPath}`);

    // Sanity checks on shape rather than an exact count, since the number of
    // open PRs on a live repo changes constantly.
    expect(Array.isArray(pullRequests)).toBe(true);
    for (const pr of pullRequests) {
      expect(pr.name.length).toBeGreaterThan(0);
      expect(pr.author.length).toBeGreaterThan(0);
      expect(() => new Date(pr.createdDate).toISOString()).not.toThrow();
    }
  });
});
