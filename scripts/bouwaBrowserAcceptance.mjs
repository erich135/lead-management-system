/**
 * Bouwa end-to-end browser acceptance.
 *
 * This drives a real browser through the whole workflow: sign in, upload an
 * untouched logger export, watch the mandatory intake block what it should,
 * answer the operating hours, and re-analyse so the annualisation that was
 * unavailable becomes available for a stated reason.
 *
 * The same run serves both mounts. `local` opens the development route and
 * signs in against the local identity registry. `authenticated` signs in as an
 * ordinary ARS user and opens the Air Audit Workflow inside the Bouwa module.
 * The checks are identical on purpose: the two mounts differ only in how the
 * workspace is reached.
 *
 * Playwright is not a dependency of this repository. The script uses a
 * Playwright module that is already present on the machine, resolved from
 * BOUWA_PLAYWRIGHT_MODULE, from the repository if one is ever added, or from
 * the npm exec cache. Without one, it reports the requirement and exits
 * non-zero rather than installing anything.
 *
 * Required services:
 *   local mount          npm run bouwa:local   (http://127.0.0.1:4310)
 *   authenticated mount  the ARS API           (http://localhost:5000)
 *   frontend             npm run dev           (http://localhost:5173)
 *
 * Environment:
 *   BOUWA_ACCEPTANCE_MOUNT      local (default) or authenticated
 *   BOUWA_ACCEPTANCE_URL        page under test
 *   BOUWA_ACCEPTANCE_IDENTITY   local mount: configured local identity id
 *   BOUWA_ACCEPTANCE_SECRET     local mount: that identity's local secret
 *   BOUWA_ACCEPTANCE_API        authenticated mount: ARS API origin
 *   BOUWA_ACCEPTANCE_EMAIL      authenticated mount: ARS user
 *   BOUWA_ACCEPTANCE_PASSWORD   authenticated mount: that user's password
 *   BOUWA_ACCEPTANCE_CSV        untouched logger export, read only
 *   BOUWA_ACCEPTANCE_OUTPUT     screenshot directory
 *   BOUWA_ACCEPTANCE_BROWSER_CHANNEL     installed browser channel, if used
 *   BOUWA_ACCEPTANCE_BROWSER_EXECUTABLE  browser binary, if it is not the default
 */

import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require_ = createRequire(import.meta.url);

const MOUNT = process.env.BOUWA_ACCEPTANCE_MOUNT ?? 'local';
const AUTHENTICATED = MOUNT === 'authenticated';
const PAGE_URL =
  process.env.BOUWA_ACCEPTANCE_URL ??
  (AUTHENTICATED
    ? 'http://localhost:5173/bouwa'
    : 'http://localhost:5173/bouwa/logger-analysis-local');
const IDENTITY = process.env.BOUWA_ACCEPTANCE_IDENTITY ?? '';
const SECRET = process.env.BOUWA_ACCEPTANCE_SECRET ?? '';
const API_ORIGIN = process.env.BOUWA_ACCEPTANCE_API ?? 'http://localhost:5000';
const EMAIL = process.env.BOUWA_ACCEPTANCE_EMAIL ?? '';
const PASSWORD = process.env.BOUWA_ACCEPTANCE_PASSWORD ?? '';
const CSV_PATH = process.env.BOUWA_ACCEPTANCE_CSV ?? '';
const OUTPUT_DIRECTORY =
  process.env.BOUWA_ACCEPTANCE_OUTPUT ??
  path.join(os.tmpdir(), 'bouwa-acceptance');

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

function resolvePlaywright() {
  const candidates = [];
  if (process.env.BOUWA_PLAYWRIGHT_MODULE)
    candidates.push(process.env.BOUWA_PLAYWRIGHT_MODULE);
  candidates.push('playwright', 'playwright-core');
  for (const candidate of candidates) {
    try {
      return require_(candidate);
    } catch {
      /* try the next candidate */
    }
  }
  const cache = path.join(
    process.env.LOCALAPPDATA ?? os.homedir(),
    'npm-cache',
    '_npx',
  );
  if (fs.existsSync(cache)) {
    for (const entry of fs.readdirSync(cache)) {
      const module_ = path.join(cache, entry, 'node_modules', 'playwright');
      if (fs.existsSync(module_)) {
        try {
          return require_(module_);
        } catch {
          /* try the next cache entry */
        }
      }
    }
  }
  throw new Error(
    'Playwright is not available. Set BOUWA_PLAYWRIGHT_MODULE to an existing Playwright installation. This script does not install one.',
  );
}

class Report {
  constructor() {
    this.checks = [];
  }

  record(scope, name, passed, detail) {
    this.checks.push({ scope, name, passed, detail: detail ?? '' });
    const mark = passed ? 'pass' : 'FAIL';
    const suffix = detail ? ` — ${detail}` : '';
    process.stdout.write(`  ${mark}  ${scope}: ${name}${suffix}\n`);
  }

  get failures() {
    return this.checks.filter(check => !check.passed);
  }
}

const report = new Report();

function requireEnvironment() {
  const missing = [];
  if (AUTHENTICATED) {
    if (!EMAIL) missing.push('BOUWA_ACCEPTANCE_EMAIL');
    if (!PASSWORD) missing.push('BOUWA_ACCEPTANCE_PASSWORD');
  } else {
    if (!IDENTITY) missing.push('BOUWA_ACCEPTANCE_IDENTITY');
    if (!SECRET) missing.push('BOUWA_ACCEPTANCE_SECRET');
  }
  if (!CSV_PATH) missing.push('BOUWA_ACCEPTANCE_CSV');
  if (missing.length)
    throw new Error(`Set ${missing.join(', ')} before running acceptance.`);
  if (!fs.existsSync(CSV_PATH))
    throw new Error(`The logger export ${CSV_PATH} does not exist.`);
}

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText);
}

async function horizontalOverflow(page) {
  return page.evaluate(() => {
    const element = document.documentElement;
    return {
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    };
  });
}

async function shot(page, viewport, name) {
  const file = path.join(
    OUTPUT_DIRECTORY,
    `${MOUNT}-${viewport.name}-${name}.png`,
  );
  await page.screenshot({ path: file, fullPage: true });
  fs.writeFileSync(
    path.join(OUTPUT_DIRECTORY, `${MOUNT}-${viewport.name}-${name}.txt`),
    await bodyText(page),
    'utf8',
  );
  return file;
}

async function openSection(page, label) {
  const header = page.locator('button[aria-expanded]', { hasText: label });
  const first = header.first();
  if ((await first.getAttribute('aria-expanded')) === 'false')
    await first.click();
  await page.waitForTimeout(150);
}

async function answerState(page, code, state) {
  await page.selectOption(`[aria-label="${code} answer state"]`, state);
  await page.waitForTimeout(150);
}

async function answerValue(page, code, value) {
  const control = page.locator(`[aria-label="${code} value"]`);
  const tag = await control.evaluate(node => node.tagName.toLowerCase());
  if (tag === 'select') await control.selectOption(value);
  else {
    await control.fill(value);
    await control.blur();
  }
  await page.waitForTimeout(150);
}

/** Waits for the page to catch up with the backend rather than guessing a delay. */
async function waitForBodyText(page, pattern, timeout = 20000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (pattern.test(await bodyText(page))) return true;
    if (Date.now() >= deadline) return false;
    await page.waitForTimeout(250);
  }
}

async function waitForSaved(page) {
  await page
    .locator('text=Saved on the local service')
    .first()
    .waitFor({ timeout: 20000 });
  await page.waitForTimeout(400);
}

async function analyse(page) {
  await page.getByRole('button', { name: /Analyse locally/ }).click();
  await page
    .locator('text=Dataset overview')
    .first()
    .waitFor({ timeout: 180000 });
  await page.waitForTimeout(500);
}

async function signInLocally(page) {
  await page.locator('text=Local identity required').waitFor({ timeout: 30000 });
  await page.selectOption('select', IDENTITY);
  await page.locator('input[type="password"]').fill(SECRET);
  await page.getByRole('button', { name: /Sign in|Open the/i }).click();
}

/**
 * Signs in the way the application does, then hands the browser the same token
 * the login screen would have stored. The point of the run is the workflow, not
 * the login form, and the token is what the module actually carries.
 */
async function signInToArs(page) {
  const token = await page.evaluate(
    async ({ origin, email, password }) => {
      const response = await fetch(`${origin}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload?.error?.message ?? 'ARS sign-in failed.');
      return payload.data.token;
    },
    { origin: API_ORIGIN, email: EMAIL, password: PASSWORD },
  );
  await page.evaluate(value => {
    window.localStorage.setItem('authToken', value);
  }, token);
  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: 'Air Audit Workflow' })
    .first()
    .click();
}

async function openWorkspace(page) {
  if (AUTHENTICATED) await signInToArs(page);
  else await signInLocally(page);
  await page
    .locator('text=Select a DS400 export')
    .first()
    .waitFor({ timeout: 30000 });
}

/**
 * The blocked list only means something read on its own: a name that appears
 * anywhere on a long page proves nothing about whether it was released.
 */
function blockedOutputSection(body) {
  const start = body.search(/outputs blocked/i);
  if (start < 0) return '';
  const rest = body.slice(start);
  const end = rest.search(/evidence still outstanding|change trail/i);
  return end < 0 ? rest : rest.slice(0, end);
}

function textCheck(scope, name, haystack, pattern, shouldMatch = true) {
  const found = pattern.test(haystack);
  report.record(
    scope,
    name,
    found === shouldMatch,
    found === shouldMatch ? '' : `pattern ${pattern} ${found ? 'matched' : 'did not match'}`,
  );
}

async function runViewport(browser, viewport) {
  const scope = `${MOUNT} ${viewport.name}`;
  process.stdout.write(
    `\n${MOUNT} mount, ${viewport.name} ${viewport.width}x${viewport.height}\n`,
  );

  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(String(error)));
  page.on('requestfailed', request =>
    failedRequests.push(`${request.method()} ${request.url()}`),
  );
  page.on('response', response => {
    if (response.status() >= 400 && response.url().includes('/api/'))
      failedRequests.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await openWorkspace(page);
  report.record(
    scope,
    AUTHENTICATED
      ? '1 the workflow opens on the authenticated /bouwa route'
      : '1 the workflow opens on the development route',
    true,
    page.url(),
  );

  // The intake is mandatory from the start: it is present before any file is
  // uploaded, and it already says what is missing.
  await page
    .locator('text=Mandatory audit intake')
    .first()
    .waitFor({ timeout: 30000 });
  await page
    .locator('text=Current stage:')
    .first()
    .waitFor({ timeout: 30000 });
  const beforeUpload = await bodyText(page);
  report.record(scope, '5 audit intake is mandatory before analysis', true);
  textCheck(
    scope,
    '6 missing fields are listed',
    beforeUpload,
    /outputs blocked/i,
  );
  textCheck(
    scope,
    '16 readiness stage is shown',
    beforeUpload,
    /Current stage:/,
  );
  await shot(page, viewport, '1-intake-before-upload');

  // Steps 3 and 4: the untouched export parses.
  await page.setInputFiles('input[type="file"]', CSV_PATH);
  await analyse(page);
  const analysed = await bodyText(page);
  textCheck(scope, '4 file parsing succeeds', analysed, /Dataset overview/);
  textCheck(scope, '10 measured demand stays visible', analysed, /Measured demand/);
  textCheck(
    scope,
    '13 cut-off status is visible',
    analysed,
    /cut-off/i,
  );
  textCheck(
    scope,
    '14 configured cut-off is separate from the observed minimum',
    analysed,
    /Observed minimum positive flow/,
  );
  textCheck(
    scope,
    '15 annualisation is unavailable before hours are answered',
    analysed,
    /annualisation factor[\s\S]{0,400}unavailable/i,
  );
  textCheck(
    scope,
    '12 an unavailable value carries a backend reason',
    analysed,
    /Annual operating hours are not confirmed/i,
  );
  textCheck(scope, 'no NaN is rendered', analysed, /\bNaN\b/, false);
  textCheck(scope, 'no Infinity is rendered', analysed, /\bInfinity\b/, false);
  textCheck(
    scope,
    '19 no legacy frontend saving, payback or ROI figure appears',
    analysed,
    /(R\s?[\d ,.]+\s*(?:per year|\/year|saving))|(\bpayback\b[^.\n]{0,40}\d+(?:[.,]\d+)?\s*(?:years|months))|(\bROI\b[^.\n]{0,40}\d+(?:[.,]\d+)?\s*%)/i,
    false,
  );
  await shot(page, viewport, '2-measured-demand');

  // Step 11: a valid zero must read as zero, not as unavailable.
  const zeroFigures = await page.evaluate(() =>
    Array.from(document.querySelectorAll('*'))
      .filter(node => node.children.length === 0)
      .map(node => node.textContent?.trim() ?? '')
      .filter(text => /^0(?:[.,]0+)?\s*\S*$/.test(text)).length,
  );
  report.record(
    scope,
    '11 a valid zero is presented as zero',
    zeroFigures > 0,
    `${zeroFigures} zero-valued figure(s)`,
  );

  // Steps 7 to 9: a controlled selection and an explicit unknown answer.
  await openSection(page, 'Operating conditions');
  textCheck(
    scope,
    '8 conditional fields are present in the opened section',
    await bodyText(page),
    /Annual operating hours/i,
  );
  await answerState(page, 'AUDIT.OPERATING.ANNUAL_HOURS', 'unknown_confirmation_required');
  await waitForSaved(page);
  const withUnknown = await bodyText(page);
  textCheck(
    scope,
    '9 an explicit unknown answer records a blocker',
    withUnknown,
    /Unknown — confirmation required|Confirmation required/i,
  );
  await shot(page, viewport, '3-unknown-answer');

  // Step 16 and 15: answering the hours changes readiness, and re-analysing
  // releases the annualisation the backend previously refused.
  await answerState(page, 'AUDIT.OPERATING.ANNUAL_HOURS', 'answered');
  await answerValue(page, 'AUDIT.OPERATING.ANNUAL_HOURS', '6000');
  await answerState(page, 'AUDIT.OPERATING.ANNUAL_HOURS_STATUS', 'answered');
  await answerValue(
    page,
    'AUDIT.OPERATING.ANNUAL_HOURS_STATUS',
    'confirmed_by_customer',
  );
  await waitForSaved(page);

  // The hours are answered, but a customer-confirmed figure still owes the
  // document it was confirmed from, and the panel must say so rather than
  // reporting the hours field as confirmed while showing nothing wired.
  const named = await waitForBodyText(
    page,
    /annual operating hours\s*\n\s*not wired[\s\S]{0,300}evidence/i,
  );
  report.record(
    scope,
    'withheld hours name the answer that withheld them',
    named,
  );
  await shot(page, viewport, '3b-hours-awaiting-evidence');

  await answerState(page, 'AUDIT.OPERATING.ANNUAL_HOURS_EVIDENCE', 'answered');
  await answerValue(
    page,
    'AUDIT.OPERATING.ANNUAL_HOURS_EVIDENCE',
    'Customer production schedule 2026',
  );
  await waitForSaved(page);
  const wired = await bodyText(page);
  textCheck(
    scope,
    '7 a controlled selection is accepted and wired',
    wired,
    /inputs the calculation will use[\s\S]{0,400}6000 h\/y/i,
  );

  await page.setInputFiles('input[type="file"]', CSV_PATH);
  await analyse(page);
  const reanalysed = await bodyText(page);
  textCheck(
    scope,
    '15 annualisation becomes available once the hours are confirmed',
    reanalysed,
    /annualisation factor[\s\S]{0,400}unavailable/i,
    false,
  );
  const blocked = blockedOutputSection(reanalysed);
  textCheck(
    scope,
    '17 engineering comparison stays blocked while bases are unconfirmed',
    blocked,
    /engineering comparison/i,
  );
  for (const output of [
    'annual electricity cost',
    'monetary saving',
    'simple payback',
    'simple annual return',
  ])
    textCheck(
      scope,
      `18 ${output} stays blocked while tariff evidence is incomplete`,
      blocked,
      new RegExp(output, 'i'),
    );
  textCheck(
    scope,
    '21 the site-corrected capacity stays blocked on CALC-049',
    blocked,
    /site-corrected machine capacity/i,
  );
  textCheck(scope, 'no NaN after re-analysis', reanalysed, /\bNaN\b/, false);
  textCheck(
    scope,
    'no Infinity after re-analysis',
    reanalysed,
    /\bInfinity\b/,
    false,
  );
  await shot(page, viewport, '4-readiness-after-hours');

  // Long text and long hashes must not push the page sideways.
  const overflow = await horizontalOverflow(page);
  report.record(
    scope,
    'no horizontal overflow',
    overflow.scrollWidth <= overflow.clientWidth + 1,
    `scrollWidth ${overflow.scrollWidth} against clientWidth ${overflow.clientWidth}`,
  );

  await openSection(page, 'Tariff and electricity bill');
  const tariffOverflow = await horizontalOverflow(page);
  report.record(
    scope,
    'no horizontal overflow with a long form open',
    tariffOverflow.scrollWidth <= tariffOverflow.clientWidth + 1,
    `scrollWidth ${tariffOverflow.scrollWidth} against clientWidth ${tariffOverflow.clientWidth}`,
  );
  await shot(page, viewport, '5-tariff-section');

  report.record(
    scope,
    '20 no unhandled page exception',
    pageErrors.length === 0,
    pageErrors.join(' | '),
  );
  report.record(
    scope,
    'console errors: 0',
    consoleErrors.length === 0,
    consoleErrors.join(' | '),
  );
  report.record(
    scope,
    'failed required API requests: 0',
    failedRequests.length === 0,
    failedRequests.join(' | '),
  );

  await context.close();
}

async function main() {
  requireEnvironment();
  fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
  const { chromium } = resolvePlaywright();
  const browser = await chromium.launch({
    channel: process.env.BOUWA_ACCEPTANCE_BROWSER_CHANNEL || undefined,
    executablePath: process.env.BOUWA_ACCEPTANCE_BROWSER_EXECUTABLE || undefined,
  });
  try {
    for (const viewport of VIEWPORTS) await runViewport(browser, viewport);
  } finally {
    await browser.close();
  }

  process.stdout.write(
    `\n${report.checks.length - report.failures.length} of ${report.checks.length} acceptance checks passed. Screenshots in ${OUTPUT_DIRECTORY}\n`,
  );
  if (report.failures.length) {
    for (const failure of report.failures)
      process.stdout.write(
        `FAIL ${failure.scope}: ${failure.name} ${failure.detail}\n`,
      );
    process.exitCode = 1;
  }
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exitCode = 1;
});
