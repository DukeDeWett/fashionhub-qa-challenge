import { APIRequestContext, Page } from '@playwright/test';

export interface LinkCheckResult {
  href: string;
  status: number | null;
  ok: boolean;
  error?: string;
}

/**
 * Collects every distinct, non-empty <a href="..."> on the current page and
 * resolves them to absolute URLs against the page's own base URL.
 */
export async function collectPageLinks(page: Page): Promise<string[]> {
  const rawHrefs = await page.$$eval('a[href]', (anchors) =>
    anchors
      .map((a) => a.getAttribute('href'))
      .filter((href): href is string => !!href && href.trim().length > 0)
  );

  const pageUrl = page.url();
  const resolved = rawHrefs
    .filter((href) => !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:'))
    .map((href) => {
      try {
        return new URL(href, pageUrl).toString();
      } catch {
        return null;
      }
    })
    .filter((href): href is string => href !== null);

  return Array.from(new Set(resolved));
}

/**
 * Requests a URL and reports its status code without following Playwright's
 * automatic navigation (so anchors on the same page, external links, and
 * fragment links can all be validated cheaply via an API request context).
 */
export async function checkLinkStatus(
  request: APIRequestContext,
  url: string
): Promise<LinkCheckResult> {
  try {
    const response = await request.get(url, { maxRedirects: 5 });
    const status = response.status();
    return { href: url, status, ok: isAcceptableStatus(status) };
  } catch (error) {
    return { href: url, status: null, ok: false, error: (error as Error).message };
  }
}

/**
 * Per Test Case 2: 200 or 30x are acceptable, 40x is a failure.
 * (5xx isn't mentioned in the spec; we treat it as a failure too since it's
 * neither 200 nor 30x, but we flag it distinctly in the reporting.)
 */
export function isAcceptableStatus(status: number): boolean {
  return status === 200 || (status >= 300 && status < 400);
}

export function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}
