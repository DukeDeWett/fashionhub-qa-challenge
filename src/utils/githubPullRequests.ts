import { APIRequestContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export interface PullRequestSummary {
  name: string;
  createdDate: string;
  author: string;
}

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Fetches ALL open pull requests for a repo (paginated, 100 per page) using
 * the public GitHub REST API. An optional token can be supplied via the
 * GITHUB_TOKEN env var to raise the rate limit (60/hr unauthenticated vs
 * 5000/hr authenticated) — not required for the challenge to pass.
 */
export async function fetchOpenPullRequests(
  request: APIRequestContext,
  repo: string
): Promise<PullRequestSummary[]> {
  const results: PullRequestSummary[] = [];
  let page = 1;
  const perPage = 100;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  while (true) {
    const response = await request.get(
      `${GITHUB_API_BASE}/repos/${repo}/pulls?state=open&per_page=${perPage}&page=${page}`,
      { headers }
    );

    if (!response.ok()) {
      throw new Error(
        `GitHub API request failed with status ${response.status()} for repo "${repo}". ` +
          `Body: ${await response.text()}`
      );
    }

    const batch = (await response.json()) as Array<{
      title: string;
      created_at: string;
      user: { login: string } | null;
    }>;

    if (batch.length === 0) break;

    for (const pr of batch) {
      results.push({
        name: pr.title,
        createdDate: pr.created_at,
        author: pr.user?.login ?? 'unknown',
      });
    }

    if (batch.length < perPage) break;
    page += 1;
  }

  return results;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(pullRequests: PullRequestSummary[]): string {
  const header = 'PR Name,Created Date,Author';
  const rows = pullRequests.map(
    (pr) => `${csvEscape(pr.name)},${csvEscape(pr.createdDate)},${csvEscape(pr.author)}`
  );
  return [header, ...rows].join('\n');
}

export function writeCsvReport(pullRequests: PullRequestSummary[], outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, toCsv(pullRequests), 'utf-8');
}
