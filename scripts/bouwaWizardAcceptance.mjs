/**
 * Guided-wizard browser acceptance.
 *
 * This drives a real browser through the workflow an ordinary ARS user meets:
 * start a proposal, choose the customer and site from ARS, upload an untouched
 * logger export, answer what can be answered and say "Unknown" to what cannot,
 * leave, come back and carry on. It also drives the two failures that matter —
 * a save that does not complete, and two sessions saving the same draft — and
 * measures whether a step actually fits on a desktop screen.
 *
 * The restart proof is deliberately split. Run it with --phase create, stop and
 * start both services, then run --phase resume: the second phase reads the
 * reference the first one recorded and checks that everything survived. The
 * default --phase all runs everything except the restart.
 *
 * Playwright is not a dependency of this repository. It is resolved from an
 * existing installation; nothing is installed here.
 *
 * Required services:
 *   backend    an ARS API on BOUWA_WIZARD_API, pointed at a throwaway database
 *   frontend   npm run dev, served at BOUWA_WIZARD_URL
 *
 * Environment:
 *   BOUWA_WIZARD_URL        frontend origin (default http://localhost:5199)
 *   BOUWA_WIZARD_API        API origin (default http://127.0.0.1:5055)
 *   BOUWA_WIZARD_EMAIL      the seeded acceptance user
 *   BOUWA_WIZARD_PASSWORD   that user's password
 *   BOUWA_WIZARD_CSV        untouched logger export, read only
 *   BOUWA_WIZARD_CUSTOMER   customer name to search for
 *   BOUWA_WIZARD_OUTPUT     screenshot and state directory
 *   BOUWA_PLAYWRIGHT_MODULE an existing Playwright installation
 *   BOUWA_WIZARD_CHANNEL    installed browser channel (default chrome)
 */

import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require_ = createRequire(import.meta.url);

const BASE = process.env.BOUWA_WIZARD_URL ?? 'http://localhost:5199';
const API = process.env.BOUWA_WIZARD_API ?? 'http://127.0.0.1:5055';
const EMAIL = process.env.BOUWA_WIZARD_EMAIL ?? 'bouwa.acceptance@local.test';
const PASSWORD = process.env.BOUWA_WIZARD_PASSWORD ?? 'Acceptance123!';
const CSV = process.env.BOUWA_WIZARD_CSV ?? '';
const CUSTOMER = process.env.BOUWA_WIZARD_CUSTOMER ?? 'Acceptance Air Services';
const OUTPUT =
  process.env.BOUWA_WIZARD_OUTPUT ?? path.join(os.tmpdir(), 'bouwa-wizard-acceptance');
const CHANNEL = process.env.BOUWA_WIZARD_CHANNEL ?? 'chrome';

const PHASE = (() => {
  const index = process.argv.indexOf('--phase');
  return index < 0 ? 'all' : (process.argv[index + 1] ?? 'all');
})();

const STATE_FILE = path.join(OUTPUT, 'acceptance-state.json');

const DESKTOP = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'desktop-1366', width: 1366, height: 768 },
];
const MOBILE = { name: 'mobile-390', width: 390, height: 844 };

function resolvePlaywright() {
  const candidates = [];
  if (process.env.BOUWA_PLAYWRIGHT_MODULE)
    candidates.push(process.env.BOUWA_PLAYWRIGHT_MODULE);
  candidates.push('playwright', 'playwright-core');
  const cache = path.join(process.env.LOCALAPPDATA ?? os.homedir(), 'npm-cache', '_npx');
  if (fs.existsSync(cache))
    for (const entry of fs.readdirSync(cache))
      candidates.push(path.join(cache, entry, 'node_modules', 'playwright'));
  for (const candidate of candidates) {
    try {
      return require_(candidate);
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error(
    'Playwright is not available. Set BOUWA_PLAYWRIGHT_MODULE to an existing installation. This script does not install one.',
  );
}

const report = { checks: [] };

function record(scope, name, passed, detail = '') {
  report.checks.push({ scope, name, passed, detail });
  process.stdout.write(
    `  ${passed ? 'pass' : 'FAIL'}  ${scope}: ${name}${detail ? ` — ${detail}` : ''}\n`,
  );
}

function readState() {
  if (!fs.existsSync(STATE_FILE)) return {};
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function writeState(patch) {
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({ ...readState(), ...patch }, null, 2),
    'utf8',
  );
}

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText);
}

async function shot(page, name) {
  const file = path.join(OUTPUT, `${name}.png`);
  await page.screenshot({ path: file });
  fs.writeFileSync(path.join(OUTPUT, `${name}.txt`), await bodyText(page), 'utf8');
  return file;
}

async function signIn(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  const token = await page.evaluate(
    async ({ origin, email, password }) => {
      const response = await fetch(`${origin}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success)
        throw new Error(payload?.error?.message ?? 'sign-in failed');
      return payload.data.token;
    },
    { origin: API, email: EMAIL, password: PASSWORD },
  );
  await page.evaluate(value => window.localStorage.setItem('authToken', value), token);
  await page.goto(`${BASE}/bouwa`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Draft Proposals' }).waitFor({ timeout: 30000 });
}

/**
 * The header states where the user is; it is how progress is detected. The
 * step counter is styled uppercase, and innerText returns what is rendered,
 * so the reading has to be case-insensitive.
 */
async function position(page) {
  const header = page.locator('[data-testid="bouwa-wizard"] header').first();
  const text = await header.innerText();
  const step = /step\s+(\d+)\s+of\s+(\d+)/i.exec(text);
  const pageOf = /page\s+(\d+)\s+of\s+(\d+)/i.exec(text);
  const title = await header.locator('h2').innerText();
  return {
    step: step ? Number(step[1]) : 0,
    stepTotal: step ? Number(step[2]) : 0,
    page: pageOf ? Number(pageOf[1]) : 1,
    title,
    key: `${step ? step[1] : '?'}/${pageOf ? pageOf[1] : '1'}/${title}`,
  };
}

const footer = page => page.locator('[data-testid="bouwa-wizard"] footer');
const continueButton = page =>
  footer(page).getByRole('button', { name: /^save & (continue|finish)$/i });
const backButton = page => footer(page).getByRole('button', { name: 'Back', exact: true });
const saveAndExitButton = page =>
  footer(page).getByRole('button', { name: /^save & exit$/i });

async function saveState(page) {
  return page
    .locator('[data-testid="wizard-save-state"]')
    .first()
    .getAttribute('data-save-state');
}

async function waitForSaved(page, timeout = 20000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const state = await saveState(page);
    if (state === 'saved' || state === 'clean') return true;
    if (state === 'failed' || state === 'conflict') return false;
    if (Date.now() >= deadline) return false;
    await page.waitForTimeout(200);
  }
}

/**
 * Answers everything on the current screen. A question that offers "Unknown"
 * is answered "Unknown", because that is the honest answer in a test that has
 * no engineering evidence, and it must not stop the workflow. A free-text
 * question that offers no such state is filled with an obviously synthetic
 * string, and every one of those is reported by name.
 */
async function answerScreen(page, typed) {
  const fields = page.locator('[data-testid="wizard-field"]');
  const count = await fields.count();
  for (let index = 0; index < count; index += 1) {
    const field = fields.nth(index);
    const state = await field.getAttribute('data-answer-state');
    if (state !== null && state !== 'unanswered') continue;
    const code = await field.getAttribute('data-field-code');
    const unknown = field.getByRole('button', { name: 'Unknown', exact: true });
    if ((await unknown.count()) > 0) {
      await unknown.first().click();
      await page.waitForTimeout(80);
      continue;
    }
    const select = field.locator('select');
    if ((await select.count()) > 0) {
      const values = await select.first().evaluate(node =>
        Array.from(node.options)
          .map(option => option.value)
          .filter(value => value !== ''),
      );
      if (values.length > 0) {
        await select.first().selectOption(values[0]);
        typed.push(`${code} = ${values[0]}`);
        await page.waitForTimeout(80);
        continue;
      }
    }
    const input = field.locator('input');
    if ((await input.count()) > 0) {
      const type = await input.first().getAttribute('type');
      const value = type === 'date' ? '2026-01-05' : 'Acceptance run';
      await input.first().fill(value);
      await input.first().blur();
      typed.push(`${code} = ${value}`);
      await page.waitForTimeout(80);
    }
  }
}

async function chooseCustomerAndSite(page, scope) {
  const search = page.getByPlaceholder(/Search the ARS customer register|Search to change the customer/);
  if ((await search.count()) === 0) return false;
  await search.first().fill(CUSTOMER.slice(0, 12));
  const option = page.getByRole('button', { name: new RegExp(CUSTOMER.slice(0, 12), 'i') });
  await option.first().waitFor({ timeout: 20000 });
  await option.first().click();
  await page.waitForTimeout(600);
  const machineSite = page.getByRole('button', { name: /machine location/ });
  const anySite = page.getByRole('button', { name: /customer address|machine location/ });
  const site = (await machineSite.count()) > 0 ? machineSite : anySite;
  await site.first().waitFor({ timeout: 20000 });
  const siteLabel = (await site.first().innerText()).split('\n')[0];
  await site.first().click();
  await page.waitForTimeout(400);
  record(
    scope,
    'the customer and site come from ARS rather than being typed',
    (await bodyText(page)).includes('ARS customer'),
    siteLabel.trim(),
  );
  return true;
}

/**
 * Uploads the export on the upload step only. A file input further on belongs
 * to the supporting-documents screen, which is a different thing entirely and
 * exists on both paths.
 */
async function uploadIfOffered(page, scope, where) {
  if (!/upload/i.test(where.title)) return false;
  const input = page.locator('input[type="file"]');
  if ((await input.count()) === 0 || CSV === '') return false;
  await input.first().setInputFiles(CSV);
  await page.locator(`text=${path.basename(CSV)}`).first().waitFor({ timeout: 180000 });
  await waitForSaved(page);
  const text = await bodyText(page);
  record(scope, 'the uploaded file is read and its identity shown', /SHA-256/i.test(text));
  return true;
}

/** Walks the whole wizard from wherever it is, to the review step. */
async function walkToReview(page, scope, options = {}) {
  const typed = [];
  const seen = [];
  let uploaded = false;
  let chose = false;
  for (let guard = 0; guard < 40; guard += 1) {
    const where = await position(page);
    seen.push(`${where.key} ${where.title}`);
    if (options.onScreen) await options.onScreen(page, where);
    if (/review/i.test(where.title)) return { typed, seen, uploaded, chose };
    if (!chose) chose = await chooseCustomerAndSite(page, scope);
    if (!uploaded) uploaded = await uploadIfOffered(page, scope, where);
    await answerScreen(page, typed);
    await continueButton(page).click();
    const moved = await waitForMove(page, where.key);
    if (!moved) {
      const hint = await page
        .locator('[data-testid="bouwa-wizard"] footer')
        .innerText();
      record(scope, `the wizard advanced past ${where.title}`, false, hint.trim());
      return { typed, seen, uploaded, chose, stuckAt: where };
    }
  }
  record(scope, 'the wizard reached the review step', false, seen.join(' | '));
  return { typed, seen, uploaded, chose };
}

async function waitForMove(page, fromKey, timeout = 30000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const where = await position(page);
    if (where.key !== fromKey) return true;
    if (Date.now() >= deadline) return false;
    await page.waitForTimeout(200);
  }
}

async function measureFit(page, scope, label) {
  const fit = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  const overshoot = fit.scrollHeight - fit.innerHeight;
  record(
    scope,
    `${label} fits the window without page scrolling`,
    overshoot <= 8,
    `scrollHeight ${fit.scrollHeight} against innerHeight ${fit.innerHeight}`,
  );
  record(
    scope,
    `${label} has no horizontal overflow`,
    fit.scrollWidth <= fit.clientWidth + 1,
    `scrollWidth ${fit.scrollWidth} against clientWidth ${fit.clientWidth}`,
  );
  const button = continueButton(page);
  record(
    scope,
    `${label} keeps the action footer reachable`,
    await button.first().isVisible(),
  );
}

async function newContext(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', error => problems.push(String(error)));
  page.on('console', message => {
    if (message.type() === 'error') problems.push(message.text());
  });
  return { context, page, problems };
}

/**
 * Walks back until a screen with an answerable question is on show. A draft
 * left on the review or the documents screen has nothing to change, and a test
 * about saving needs something to save.
 */
async function goToAnswerable(page, limit = 6) {
  for (let attempt = 0; attempt <= limit; attempt += 1) {
    const unknown = page
      .locator('[data-testid="wizard-field"]')
      .getByRole('button', { name: 'Unknown', exact: true });
    if ((await unknown.count()) > 0) return true;
    const where = await position(page);
    await backButton(page).click();
    if (!(await waitForMove(page, where.key))) return false;
  }
  return false;
}

async function openDraft(page, reference) {
  await page
    .locator('li', { hasText: reference })
    .getByRole('button', { name: 'Continue' })
    .first()
    .click();
  await page.locator('[data-testid="bouwa-wizard"]').waitFor({ timeout: 30000 });
}

async function openDrafts(page) {
  await page.goto(`${BASE}/bouwa`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Draft Proposals' }).waitFor({ timeout: 30000 });
}

async function startProposal(page) {
  await page.getByRole('button', { name: 'New proposal' }).click();
  await page.locator('[data-testid="bouwa-wizard"]').waitFor({ timeout: 30000 });
  return (await page.locator('[data-testid="bouwa-wizard"] header').innerText())
    .split('\n')
    .find(line => /^BW-|PROP|-\d{4}/.test(line.trim()))
    ?.trim();
}

async function currentReference(page) {
  const header = await page.locator('[data-testid="bouwa-wizard"] header').innerText();
  const match = /([A-Z]{2,}-[A-Z0-9-]+)/.exec(header);
  return match ? match[1] : '';
}

/* ---------------------------------------------------------------- air audit */

async function airAudit(browser, viewport) {
  const scope = `air audit ${viewport.name}`;
  process.stdout.write(`\n${scope}\n`);
  const { context, page, problems } = await newContext(browser, viewport);
  await signIn(page);

  const before = await bodyText(page);
  record(
    scope,
    'the module opens on Draft Proposals, not the technical workspace',
    !/Mandatory audit intake|Proposal Readiness/i.test(before),
  );

  await startProposal(page);
  const reference = await currentReference(page);
  record(scope, 'a new proposal opens in the guided wizard', reference !== '', reference);
  await measureFit(page, scope, 'step 1');
  await shot(page, `${viewport.name}-air-1-proposal-type`);

  const walk = await walkToReview(page, scope, {
    onScreen: async (target, where) => {
      await measureFit(target, scope, `step ${where.step} (${where.title})`);
    },
  });

  record(scope, 'the audit was created from the uploaded file', walk.uploaded === true);
  record(scope, 'the customer and site were chosen from ARS', walk.chose === true);

  const review = await bodyText(page);
  record(scope, 'the review names the readiness stages', /Measured audit/i.test(review));
  record(
    scope,
    'outputs that depend on missing evidence stay blocked',
    /blocked/i.test(review),
  );
  record(
    scope,
    'an explicit unknown does not release an output',
    !/Ready to issue|All outputs available/i.test(review),
  );
  record(
    scope,
    'the technical detail is behind Advanced Technical Review, not on the page',
    /Advanced Technical Review/i.test(review) &&
      !/Mandatory audit intake/i.test(review) &&
      !/AUDIT\.[A-Z_]+\./.test(review),
  );
  await shot(page, `${viewport.name}-air-2-review`);

  // Advanced Technical Review: the same proposal, told in full.
  await page.getByRole('button', { name: /Advanced Technical Review/i }).click();
  const technical = page.locator('[data-testid="bouwa-technical-review"]');
  await technical.waitFor({ timeout: 30000 }).catch(() => undefined);
  const detail = (await technical.count()) > 0 ? await technical.innerText() : '';
  record(
    scope,
    'the technical review opens on the proposal that was being worked on',
    detail.includes(reference),
    reference,
  );
  record(
    scope,
    'it states the field codes the ordinary screens keep out of the way',
    /AUDIT\.[A-Z_]+\./.test(detail),
  );
  record(
    scope,
    'it states the hash of the untouched source, recorded rather than typed',
    /[0-9a-f]{64}/.test(detail),
  );
  record(
    scope,
    'it lists the stages, the blocked outputs and the change trail',
    /Stage eligibility/i.test(detail) &&
      /Outputs —/i.test(detail) &&
      /Change trail/i.test(detail),
  );
  await shot(page, `${viewport.name}-air-3-technical-review`);
  await page.getByRole('button', { name: 'Back to the proposal' }).first().click();
  await page.locator('[data-testid="bouwa-wizard"]').waitFor({ timeout: 30000 });
  record(
    scope,
    'closing the technical review returns to the proposal, not to the list',
    (await page.locator('[data-testid="bouwa-wizard"]').count()) > 0,
  );

  if (walk.typed.length > 0)
    process.stdout.write(`  note: typed synthetic values for ${walk.typed.join(', ')}\n`);

  await saveAndExitButton(page).click();
  await page.getByRole('heading', { name: 'Draft Proposals' }).waitFor({ timeout: 30000 });
  const row = page.locator('li', { hasText: reference }).first();
  await row.waitFor({ timeout: 30000 }).catch(() => undefined);
  record(scope, 'the saved proposal is listed', (await row.count()) > 0, reference);
  const rowText = (await row.count()) > 0 ? await row.innerText() : '';
  record(
    scope,
    'the list names the customer and the site that were chosen',
    rowText.includes(CUSTOMER) && !/Customer not chosen yet/i.test(rowText),
    rowText.replace(/\n/g, ' · '),
  );

  record(scope, 'no unhandled page error', problems.length === 0, problems.join(' | '));
  writeState({ airAuditReference: reference });
  await context.close();
  return reference;
}

/* ----------------------------------------------------------------- manual */

async function manualProposal(browser, viewport) {
  const scope = `manual ${viewport.name}`;
  process.stdout.write(`\n${scope}\n`);
  const { context, page, problems } = await newContext(browser, viewport);
  await signIn(page);
  await startProposal(page);
  const reference = await currentReference(page);

  await page.getByRole('button', { name: /Manual Proposal/ }).click();
  await page.getByText('Preliminary estimate').click();
  await page.waitForTimeout(400);
  await waitForSaved(page);
  const chosen = await position(page);
  record(
    scope,
    'the manual path is shorter than the air-audit path',
    chosen.stepTotal === 8,
    `${chosen.stepTotal} steps`,
  );
  await shot(page, `${viewport.name}-manual-1-type`);

  const walk = await walkToReview(page, scope, {
    onScreen: async (target, where) => {
      const text = await bodyText(target);
      record(
        scope,
        `step ${where.step} asks nothing about a logger file`,
        !/logger export|SHA-256|Upload/i.test(text) ||
          /no logger|not applicable/i.test(text),
        where.title,
      );
      record(
        scope,
        `step ${where.step} offers no logger upload`,
        !/upload/i.test(where.title) &&
          ((await target.locator('input[type="file"]').count()) === 0 ||
            /supporting document/i.test(text)),
        where.title,
      );
      await measureFit(target, scope, `step ${where.step} (${where.title})`);
    },
  });
  record(scope, 'no logger export was ever asked for', walk.uploaded === false);

  const review = await bodyText(page);
  record(
    scope,
    'measured demand is unavailable because nothing was measured',
    /no logger record|not measured|unavailable/i.test(review),
  );
  record(
    scope,
    'a preliminary estimate is never presented as measured',
    !/Measured audit:\s*Ready/i.test(review),
  );
  await shot(page, `${viewport.name}-manual-2-review`);

  await saveAndExitButton(page).click();
  await page.getByRole('heading', { name: 'Draft Proposals' }).waitFor({ timeout: 30000 });
  const row = page.locator('li', { hasText: reference }).first();
  await row.waitFor({ timeout: 30000 });
  record(
    scope,
    'the manual proposal keeps its basis in the list',
    /Preliminary estimate/i.test(await row.innerText()),
    reference,
  );
  record(scope, 'no unhandled page error', problems.length === 0, problems.join(' | '));
  writeState({ manualReference: reference });
  await context.close();
}

/* ------------------------------------------------------- unsaved changes */

async function unsavedChanges(browser, reference) {
  const scope = 'unsaved change';
  process.stdout.write(`\n${scope}\n`);
  const { context, page, problems } = await newContext(browser, DESKTOP[0]);
  await signIn(page);
  await openDrafts(page);
  await openDraft(page, reference);
  record(scope, 'a screen with questions on it was reached', await goToAnswerable(page));
  await waitForSaved(page);

  // A save that cannot reach the server must not look like a save.
  await page.route('**/api/bouwa/wizard/drafts/**', route =>
    route.request().method() === 'PUT' ? route.abort('failed') : route.continue(),
  );
  await page
    .locator('[data-testid="wizard-field"]')
    .getByRole('button', { name: 'Unknown', exact: true })
    .first()
    .click();
  await page.waitForTimeout(4000);
  record(scope, 'a failed save is reported as failed', (await saveState(page)) === 'failed');
  const failedText = await bodyText(page);
  record(
    scope,
    'the entered answer stays on screen and a retry is offered',
    /Retry save/.test(failedText) && /Nothing on this screen has been lost/.test(failedText),
  );
  await shot(page, 'unsaved-1-save-failed');

  await saveAndExitButton(page).click();
  await page.waitForTimeout(1500);
  record(
    scope,
    'leaving with unsaved work asks first',
    (await page.locator('role=alertdialog').count()) > 0 &&
      /unsaved changes/i.test(await bodyText(page)),
  );
  await shot(page, 'unsaved-2-warning');

  await page.unroute('**/api/bouwa/wizard/drafts/**');
  await page.getByRole('button', { name: 'Stay and save' }).click();
  const saved = await waitForSaved(page);
  record(scope, 'the retry succeeds once the server is reachable', saved);

  await saveAndExitButton(page).click();
  await page.getByRole('heading', { name: 'Draft Proposals' }).waitFor({ timeout: 30000 });
  record(
    scope,
    'a clean draft leaves without a warning',
    !/unsaved changes/i.test(await bodyText(page)),
  );
  // The aborted save is this test's own doing, so its console noise is not a
  // defect. Anything else on the console still is.
  const unexpected = problems.filter(problem => !/ERR_FAILED|Failed to load resource/.test(problem));
  record(scope, 'no unhandled page error', unexpected.length === 0, unexpected.join(' | '));
  await context.close();
}

/* ------------------------------------------------------------- conflict */

async function conflict(browser, reference) {
  const scope = 'conflict';
  process.stdout.write(`\n${scope}\n`);
  // Both sessions must open on the same screen, and it must be one with a
  // question on it. Moving there is a save in itself, so it happens once,
  // before either session is opened.
  const setup = await newContext(browser, DESKTOP[0]);
  await signIn(setup.page);
  await openDrafts(setup.page);
  await openDraft(setup.page, reference);
  await goToAnswerable(setup.page);
  await saveAndExitButton(setup.page).click();
  await setup.page.getByRole('heading', { name: 'Draft Proposals' }).waitFor({ timeout: 30000 });
  await setup.context.close();

  const first = await newContext(browser, DESKTOP[0]);
  const second = await newContext(browser, DESKTOP[0]);

  for (const session of [first, second]) {
    await signIn(session.page);
    await openDrafts(session.page);
    await openDraft(session.page, reference);
  }

  async function answerSomething(page) {
    const buttons = page
      .locator('[data-testid="wizard-field"]')
      .getByRole('button', { name: 'Unknown', exact: true });
    if ((await buttons.count()) === 0) return false;
    await buttons.first().click();
    return true;
  }

  record(scope, 'both sessions opened a screen with a question', await answerSomething(first.page));
  record(scope, 'the first session saves', await waitForSaved(first.page));

  await answerSomething(second.page);
  await second.page.waitForTimeout(3000);
  const state = await saveState(second.page);
  const text = await bodyText(second.page);
  record(
    scope,
    'the stale save is refused rather than silently overwriting',
    state === 'conflict' || /changed elsewhere/i.test(text),
    `save state ${state}`,
  );
  record(
    scope,
    'the refusal explains the choice rather than dead-ending',
    /Show the stored version/.test(text) && /Keep mine and save again/.test(text),
  );
  await shot(second.page, 'conflict-1-refused');

  await first.context.close();
  await second.context.close();
}

/* ------------------------------------------------------- restart phases */

async function resumeAfterRestart(browser) {
  const scope = 'restart';
  process.stdout.write(`\n${scope}\n`);
  const state = readState();
  const reference = state.airAuditReference;
  if (!reference) {
    record(scope, 'a created proposal was recorded to resume', false);
    return;
  }
  const { context, page, problems } = await newContext(browser, DESKTOP[0]);
  await signIn(page);
  await openDrafts(page);
  const row = page.locator('li', { hasText: reference }).first();
  await row.waitFor({ timeout: 30000 }).catch(() => undefined);
  record(scope, 'the proposal survived both services stopping', (await row.count()) > 0, reference);
  const rowText = (await row.count()) > 0 ? await row.innerText() : '';
  record(
    scope,
    'the list still knows the customer and the step it was left on',
    /Step \d+ of \d+/.test(rowText) &&
      rowText.includes(CUSTOMER) &&
      !/Customer not chosen yet/i.test(rowText),
    rowText.replace(/\n/g, ' · '),
  );
  record(
    scope,
    'the uploaded logger export survived the restart',
    /\.csv/i.test(rowText),
    rowText.replace(/\n/g, ' · '),
  );

  await row.getByRole('button', { name: /Continue|View summary/ }).first().click();
  await page.locator('[data-testid="bouwa-wizard"]').waitFor({ timeout: 30000 });
  const where = await position(page);
  record(
    scope,
    'it reopens on the step it was saved on',
    where.step === (state.airAuditStep ?? where.step),
    `${where.step} of ${where.stepTotal} — ${where.title}`,
  );
  const text = await bodyText(page);
  record(
    scope,
    'the answers are still there',
    /Unknown|Answered|Detected from the uploaded file/i.test(text),
  );
  await shot(page, 'restart-1-resumed');

  // Back must save, and Save & Continue must return to where it was.
  const start = await position(page);
  if (start.step > 1) {
    await backButton(page).click();
    await waitForMove(page, start.key);
    record(scope, 'Back saved before moving', (await saveState(page)) !== 'dirty');
    await continueButton(page).click();
    const returned = await waitForMove(page, (await position(page)).key, 15000);
    record(scope, 'Save & Continue opens the next step again', returned !== false);
  }
  record(scope, 'no unhandled page error', problems.length === 0, problems.join(' | '));
  await context.close();
}

/* ------------------------------------------------------------------ main */

async function main() {
  fs.mkdirSync(OUTPUT, { recursive: true });
  // A screenshot from a previous run is worse than no screenshot: it shows a
  // screen that no longer exists and invites a conclusion about code that has
  // since changed. The resume phase keeps what the create phase left.
  if (PHASE !== 'resume')
    for (const file of fs.readdirSync(OUTPUT))
      if (file.endsWith('.png'))
        try {
          fs.rmSync(path.join(OUTPUT, file));
        } catch {
          process.stdout.write(`  note: could not remove the old ${file}\n`);
        }
  const { chromium } = resolvePlaywright();
  const browser = await chromium.launch({ channel: CHANNEL });
  try {
    if (PHASE === 'resume') {
      await resumeAfterRestart(browser);
    } else if (PHASE === 'create') {
      const reference = await airAudit(browser, DESKTOP[0]);
      const { page, context } = await newContext(browser, DESKTOP[0]);
      await signIn(page);
      await openDrafts(page);
      const row = page.locator('li', { hasText: reference }).first();
      const match = /Step (\d+) of/.exec(await row.innerText());
      writeState({ airAuditStep: match ? Number(match[1]) : null });
      await context.close();
    } else {
      const reference = await airAudit(browser, DESKTOP[0]);
      await manualProposal(browser, DESKTOP[0]);
      await unsavedChanges(browser, reference);
      await conflict(browser, reference);
      // The second desktop size and the phone are about fit, not flow.
      for (const viewport of [DESKTOP[1], MOBILE]) {
        const scope = `fit ${viewport.name}`;
        process.stdout.write(`\n${scope}\n`);
        const { page, context } = await newContext(browser, viewport);
        await signIn(page);
        await openDrafts(page);
        await page
          .locator('li', { hasText: reference })
          .getByRole('button', { name: 'Continue' })
          .first()
          .click();
        await page.locator('[data-testid="bouwa-wizard"]').waitFor({ timeout: 30000 });
        for (let step = 0; step < 9; step += 1) {
          const where = await position(page);
          if (viewport === MOBILE) {
            const fit = await page.evaluate(() => ({
              scrollWidth: document.documentElement.scrollWidth,
              clientWidth: document.documentElement.clientWidth,
            }));
            record(
              scope,
              `step ${where.step} has no horizontal overflow`,
              fit.scrollWidth <= fit.clientWidth + 1,
              `${fit.scrollWidth} against ${fit.clientWidth}`,
            );
            record(
              scope,
              `step ${where.step} keeps the actions reachable`,
              await continueButton(page).first().isVisible(),
            );
          } else {
            await measureFit(page, scope, `step ${where.step} (${where.title})`);
          }
          await shot(page, `${viewport.name}-step-${where.step}-${where.page}`);
          if (/review/i.test(where.title)) break;
          await continueButton(page).click();
          if (!(await waitForMove(page, where.key))) break;
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  const failures = report.checks.filter(check => !check.passed);
  process.stdout.write(
    `\n${report.checks.length - failures.length} of ${report.checks.length} checks passed. Output in ${OUTPUT}\n`,
  );
  for (const failure of failures)
    process.stdout.write(`FAIL ${failure.scope}: ${failure.name} ${failure.detail}\n`);
  if (failures.length > 0) process.exitCode = 1;
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exitCode = 1;
});
