import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require_ = createRequire(import.meta.url);

function resolvePlaywright() {
  for (const candidate of [process.env.BOUWA_PLAYWRIGHT_MODULE, 'playwright', 'playwright-core'].filter(Boolean)) {
    try { return require_(candidate); } catch { /* continue */ }
  }
  const cache = path.join(process.env.LOCALAPPDATA ?? os.homedir(), 'npm-cache', '_npx');
  if (fs.existsSync(cache)) {
    for (const entry of fs.readdirSync(cache)) {
      try { return require_(path.join(cache, entry, 'node_modules', 'playwright')); } catch { /* continue */ }
    }
  }
  throw new Error('Playwright is not available; no package will be installed by this check.');
}

const { chromium } = resolvePlaywright();
const origin = process.env.BOUWA_PILOT_ACCEPTANCE_URL ?? 'http://127.0.0.1:4177';

function user(isSuperAdmin) {
  return {
    _id: isSuperAdmin ? 'super-admin-browser' : 'ordinary-browser',
    email: isSuperAdmin ? 'super@example.test' : 'ordinary@example.test',
    firstName: isSuperAdmin ? 'Super' : 'Ordinary',
    lastName: 'Tester',
    role: { _id: 'role', name: isSuperAdmin ? 'super_admin' : 'user', isActive: true },
    permissions: isSuperAdmin ? [] : ['jobs.read'],
    isActive: true,
    isSuperAdmin,
    createdAt: '2026-08-06T00:00:00.000Z',
    updatedAt: '2026-08-06T00:00:00.000Z',
    passwordSet: true,
    emailVerified: true,
    locationTrackingEnabled: false,
  };
}

async function stateCase(browser, name, featureEnabled, isSuperAdmin, expectedAllowed) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  const requestFailures = [];
  const consoleErrors = [];
  let accessStateServed = false;
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', (request) => requestFailures.push(`${request.url()} (${request.failure()?.errorText ?? 'failed'})`));
  await page.addInitScript(() => localStorage.setItem('authToken', 'browser-test-token'));
  await page.route('http://localhost:5000/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { user: user(isSuperAdmin) } }) });
    }
    if (url.pathname === '/api/bouwa-pilot-access') {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const allowed = featureEnabled && isSuperAdmin;
      const reason = featureEnabled ? (isSuperAdmin ? 'allowed' : 'super_admin_required') : 'feature_flag_disabled';
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { featureKey: 'bouwa', featureEnabled, isSuperAdmin, allowed, reason } }) });
      accessStateServed = true;
      return;
    }
    let data = {};
    if (url.pathname === '/api/jobs/stats') data = { totalJobs: 0, activeJobs: 0, totalValue: 0, overdueReminders: 0, approachingReminders: 0, jobsByStatus: {}, jobsByBranch: {} };
    else if (url.pathname === '/api/jobs/overdue') data = { jobs: [], count: 0, overdueCount: 0, approachingCount: 0 };
    else if (url.pathname === '/api/reference/statuses') data = { statuses: [] };
    else if (url.pathname === '/api/reference/branches') data = { branches: [] };
    else if (url.pathname === '/api/reference/customers') data = { customers: [], pagination: { page: 1, pages: 1, total: 0 } };
    else if (url.pathname === '/api/reference/rep-codes') data = { repCodes: [] };
    else if (url.pathname === '/api/reference/technicians') data = { technicians: [] };
    else if (url.pathname === '/api/reference/admin-codes') data = { adminCodes: [] };
    else if (url.pathname === '/api/machine-reading-submissions') data = { submissions: [] };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
  });

  await page.goto(`${origin}/dashboard`);
  await page.waitForLoadState('domcontentloaded');
  for (let attempt = 0; attempt < 80 && !accessStateServed; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!accessStateServed) throw new Error(`${name}: frontend never requested authoritative pilot state.`);
  const nav = page.locator('a[href="/bouwa"]');
  if (expectedAllowed) {
    try {
      await nav.first().waitFor({ timeout: 8000 });
    } catch {
      const visibleText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300);
      throw new Error(`${name}: allowed navigation did not render; visible page was: ${visibleText}; page errors: ${pageErrors.join(' | ')}; console errors: ${consoleErrors.join(' | ')}`);
    }
  }
  else await page.waitForTimeout(750);
  const navVisible = await nav.count() > 0;
  if (navVisible !== expectedAllowed) throw new Error(`${name}: navigation visibility differed from authoritative state.`);
  if (!isSuperAdmin) await page.locator('a[href="/jobs"]').first().waitFor({ timeout: 8000 });

  await page.addInitScript(() => {
    window.__bouwaProtectedFlash = false;
    const startObserver = () => new MutationObserver(() => {
      if (/Machine Spec Library|Templates & Assumptions/.test(document.body?.innerText ?? '')) window.__bouwaProtectedFlash = true;
    }).observe(document.documentElement, { childList: true, subtree: true });
    if (document.documentElement) startObserver();
    else document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  });
  await page.goto(`${origin}/bouwa`);
  if (expectedAllowed) {
    await page.getByText('Machine Spec Library', { exact: true }).first().waitFor();
  } else {
    try {
      await page.getByText('Access Restricted', { exact: true }).waitFor({ timeout: 8000 });
    } catch {
      const visibleText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300);
      throw new Error(`${name}: denial page did not render at ${page.url()}; visible page was: ${visibleText}; page errors: ${pageErrors.join(' | ')}; console errors: ${consoleErrors.join(' | ')}; request failures: ${requestFailures.join(' | ')}`);
    }
    const flashed = await page.evaluate(() => window.__bouwaProtectedFlash === true);
    if (flashed) throw new Error(`${name}: protected Bouwa UI flashed before denial.`);
  }
  process.stdout.write(`pass: ${name}\n`);
  await context.close();
}

const installedChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const executablePath = process.env.BOUWA_ACCEPTANCE_BROWSER_EXECUTABLE ??
  (fs.existsSync(installedChrome) ? installedChrome : undefined);
const browser = await chromium.launch({ headless: true, executablePath });
try {
  await stateCase(browser, 'flag disabled / Super Admin', false, true, false);
  await stateCase(browser, 'flag enabled / non-Super-Admin', true, false, false);
  await stateCase(browser, 'flag enabled / Super Admin', true, true, true);
} finally {
  await browser.close();
}
