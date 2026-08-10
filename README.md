# FashionHub QA Automation Suite

Cross-browser, multi-environment Playwright + TypeScript test suite covering the four
required test cases for the FashionHub demo app: console-error detection, link status
code validation, login, and a GitHub open-PR CSV export.

## Tech stack

- [Playwright Test](https://playwright.dev/) (TypeScript) — chosen over Cypress for
  native multi-browser support (Chromium, Firefox, WebKit) in a single config, and
  built-in `APIRequestContext` for the non-UI checks (link status codes, GitHub API).
- Page Object Model for UI flows (`src/pages/`)
- Plain TypeScript utility modules for non-UI logic (`src/utils/`), so they're testable
  and reusable outside of a Playwright test if needed.

## Project structure

```
├── playwright.config.ts        # cross-browser projects, reporters, dynamic baseURL
├── env.config.json             # fallback env selector (used only if --env / TEST_ENV absent)
├── src/
│   ├── config/
│   │   ├── environments.json   # local / staging / production URL + repo definitions
│   │   └── env-resolver.ts     # CLI --env > TEST_ENV env var > env.config.json > "local"
│   ├── pages/
│   │   └── LoginPage.ts        # Page Object for the login flow
│   └── utils/
│       ├── linkChecker.ts      # link extraction + status code validation (TC2)
│       └── githubPullRequests.ts  # GitHub REST API client + CSV writer (TC4)
├── tests/
│   ├── console-errors.spec.ts       # TC1
│   ├── link-status-codes.spec.ts    # TC2
│   ├── login.spec.ts                # TC3
│   └── github-pull-requests.spec.ts # TC4
├── Dockerfile                  # official Playwright image, ready for CI
├── Jenkinsfile                 # Jenkins pipeline running the suite via Docker
└── .github/workflows/tests.yml # GitHub Actions alternative CI pipeline
```

## Environment selection

The spec requires the environment to be selectable via CLI **or** config file, with the
system verifying which is present and falling back automatically. Resolution order:

1. **CLI flag**: `--env=<local|staging|production>`
2. **Environment variable**: `TEST_ENV=<name>` (handy for Docker/Jenkins where passing
   raw Playwright CLI flags through multiple layers is awkward)
3. **Config file**: `env.config.json` → `{ "env": "<name>" }`
4. **Default**: `local`

Each environment maps to a base URL and a GitHub repo (for TC4) in
`src/config/environments.json`.

## Setup

```bash
npm ci
npx playwright install --with-deps   # downloads Chromium, Firefox, WebKit
```

## Running the suite

```bash
# Uses env.config.json (defaults to "production")
npm test

# Explicit environment via CLI (takes priority over the config file)
npm run test:local
npm run test:staging
npm run test:production

# Explicit environment via env var (equivalent, useful in CI/Docker)
TEST_ENV=staging npx playwright test

# Single browser
npm run test:chromium

# View the HTML report after a run
npm run report
```

### Running FashionHub locally (for the `local` environment)

```bash
docker run -p 4000:4000 <fashionhub-demo-image>
npm run test:local
```

(Swap in the actual Fashionhub Demo App image referenced in the challenge brief.)

## Test cases

| # | Description | File |
|---|---|---|
| 1 | No console errors on the home page (plus a documented negative-case test against `/about.html`, which intentionally fails) | `tests/console-errors.spec.ts` |
| 2 | Every link on the home page returns 200/30x, never 40x | `tests/link-status-codes.spec.ts` |
| 3 | Customer can log in with `demouser` / `fashion123` | `tests/login.spec.ts` |
| 4 | Open PRs for `appwrite/appwrite` exported to `reports/open-prs-appwrite_appwrite.csv` (name, created date, author) | `tests/github-pull-requests.spec.ts` |

**Note on Test Case 4:** it hits the public, unauthenticated GitHub REST API (60
requests/hour limit). If you hit `403 rate limit exceeded`, set a token:

```bash
GITHUB_TOKEN=ghp_xxx npx playwright test tests/github-pull-requests.spec.ts
```

**Note on selectors in `LoginPage.ts`:** they're written defensively (ID-first, with
fallbacks) based on the field names given in the challenge brief, since I didn't have
direct access to inspect the live DOM while building this. Worth a quick visual check
against the real page before relying on it in CI.

## CI/CD

- **`Dockerfile`** builds on the official `mcr.microsoft.com/playwright` image (browsers
  preinstalled) so pipeline runs are fast and reproducible.
- **`Jenkinsfile`** builds that image and runs the suite in a container, parameterized by
  `TEST_ENV`, publishing the HTML report and JUnit results as build artifacts.
- **`.github/workflows/tests.yml`** is included as an easy-to-verify alternative CI
  pipeline (manually triggerable with an environment picker).

## Design notes / trade-offs

- **Why `APIRequestContext` for link checks instead of navigating to each link**:
  navigating via `page.goto()` for every link on a page with many anchors is slow and
  triggers full page loads/JS execution we don't need — we only care about the HTTP
  status. `request.get()` is faster and matches the spec's literal wording ("fetch each
  link... to verify that the page returns...").
- **Why TC1's negative test uses `test.fail()`**: the challenge hints that `/about.html`
  has a known, intentional error, which is a great way to prove the console-error check
  actually detects failures rather than trivially passing. Marking it `test.fail()` keeps
  the suite green overall while documenting and asserting on the expected failure.
- **Staging URL**: `https://staging-env/fashionhub/` in the brief is a placeholder,
  non-resolvable domain — kept as config-only so the suite is ready to point at a real
  staging host by editing one line in `environments.json`.

## Known issues found by the suite

- **Broken reference to the domain root**: `tests/console-errors.spec.ts` and
  `tests/link-status-codes.spec.ts` both fail consistently, in all 3 browsers,
  on the exact same URL: `https://pocketaces2.github.io/` returns a 404. Something
  on the home page references the bare GitHub Pages domain root instead of
  `https://pocketaces2.github.io/fashionhub/`. Since this is a project site (not
  a user/org root site), the bare root doesn't resolve. Two independent checks —
  a live network-response listener and an explicit link crawler — catch it
  identically, across all three browser engines, which is strong evidence this
  is a genuine site defect rather than a test issue.
