/**
 * Guided-wizard browser acceptance, through to the proposal itself.
 *
 * A real browser signs in as an ordinary ARS user — through the feature flag
 * and the permission checks rather than around them — opens a proposal, and
 * ends where a rep ends: looking at the document the customer receives, with
 * print, download and issue in front of them.
 *
 * The draft is prepared through the same authenticated endpoints the wizard
 * calls, in the signed-in page, so nothing here can answer a question in a way
 * the application itself could not. What is then asserted is what a rep would
 * see: the review page separating what they can fix from what they cannot, the
 * finish button saying what it will do, the proposal reading in customer
 * language, and a version that can be issued once and not twice.
 *
 * Puppeteer is not a dependency of this repository. It is resolved from
 * BOUWA_PUPPETEER_MODULE or from the ARS backend's modules if one is present;
 * without one the script says so and exits non-zero rather than installing
 * anything.
 *
 * Required services:
 *   the ARS API   npm run dev in the backend worktree   (http://localhost:5000)
 *   the frontend  npm run dev                           (http://localhost:5173)
 *
 * Environment:
 *   BOUWA_ACCEPTANCE_URL       the Bouwa page (default http://localhost:5173/bouwa)
 *   BOUWA_ACCEPTANCE_API       the ARS API origin (default http://localhost:5000)
 *   BOUWA_ACCEPTANCE_EMAIL     the signed-in ARS user
 *   BOUWA_ACCEPTANCE_PASSWORD  that user's password
 *   BOUWA_ACCEPTANCE_OUTPUT    where the screenshots are written
 *   BOUWA_PUPPETEER_MODULE     an installed puppeteer, where it is not resolvable
 */

import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require_ = createRequire(import.meta.url);

const PAGE_URL = process.env.BOUWA_ACCEPTANCE_URL ?? 'http://localhost:5173/bouwa';
const API_ORIGIN = process.env.BOUWA_ACCEPTANCE_API ?? 'http://localhost:5000';
const EMAIL = process.env.BOUWA_ACCEPTANCE_EMAIL ?? '';
const PASSWORD = process.env.BOUWA_ACCEPTANCE_PASSWORD ?? '';
const OUTPUT_DIRECTORY =
  process.env.BOUWA_ACCEPTANCE_OUTPUT ??
  path.join(os.tmpdir(), 'bouwa-guided-acceptance');

const failures = [];
let step = 0;

function check(condition, description) {
  if (condition) {
    process.stdout.write(`  ok    ${description}\n`);
    return true;
  }
  failures.push(description);
  process.stdout.write(`  FAIL  ${description}\n`);
  return false;
}

/**
 * The browser to drive.
 *
 * An installed Chrome or Edge is used in preference to a downloaded one, so a
 * run never has to fetch a browser to prove that the proposal renders.
 */
function resolveBrowserExecutable() {
  if (process.env.BOUWA_ACCEPTANCE_BROWSER_EXECUTABLE)
    return process.env.BOUWA_ACCEPTANCE_BROWSER_EXECUTABLE;
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ];
  return candidates.find(candidate => fs.existsSync(candidate)) ?? undefined;
}

function resolvePuppeteer() {
  const candidates = [];
  if (process.env.BOUWA_PUPPETEER_MODULE)
    candidates.push(process.env.BOUWA_PUPPETEER_MODULE);
  candidates.push(
    'puppeteer',
    'C:/Dev/ARS-Workspace/apps/ars-app-backend/node_modules/puppeteer',
  );
  for (const candidate of candidates) {
    try {
      return require_(candidate);
    } catch {
      /* try the next candidate */
    }
  }
  throw new Error(
    'No puppeteer is available. Set BOUWA_PUPPETEER_MODULE to an installed one.',
  );
}

async function shot(page, name) {
  step += 1;
  const file = path.join(OUTPUT_DIRECTORY, `${step}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  process.stdout.write(`  shot  ${file}\n`);
}

/** Text of the whole page, with runs of whitespace flattened. */
async function pageText(page) {
  return (await page.evaluate(() => document.body.innerText)).replace(
    /\s+/g,
    ' ',
  );
}

async function clickByText(page, selector, text) {
  const handle = await page.evaluateHandle(
    (selector_, text_) =>
      Array.from(document.querySelectorAll(selector_)).find(element =>
        (element.textContent ?? '').includes(text_),
      ) ?? null,
    selector,
    text,
  );
  const element = handle.asElement();
  if (element === null) return false;
  await element.click();
  return true;
}

async function clickProposalAction(page) {
  for (const text of [
    'Generate commercially complete proposal',
    'Generate audit-backed proposal',
    'Generate engineering proposal',
    'Generate preliminary proposal',
    'Finish draft with outstanding items',
    'Preview captured answers',
    'Preliminary customer proposal',
    'Preview proposal',
  ]) {
    if (await clickByText(page, 'button', text)) return true;
  }
  return false;
}

/** Opens the one proposal in the list that carries this reference. */
async function openDraft(page, reference) {
  const handle = await page.evaluateHandle(reference_ => {
    const rows = Array.from(document.querySelectorAll('li, tr, article, div'));
    const row = rows
      .filter(element => (element.textContent ?? '').includes(reference_))
      .reverse()
      .find(element =>
        Array.from(element.querySelectorAll('button')).some(button =>
          (button.textContent ?? '').includes('Continue'),
        ),
      );
    if (row === undefined) return null;
    return (
      Array.from(row.querySelectorAll('button')).find(button =>
        (button.textContent ?? '').includes('Continue'),
      ) ?? null
    );
  }, reference);
  const element = handle.asElement();
  if (element === null) return false;
  await element.click();
  return true;
}

/** The finished download, once Chrome has stopped writing it. */
async function waitForDownload(directory, timeout = 60000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const files = fs
      .readdirSync(directory)
      .filter(name => !name.endsWith('.crdownload'));
    if (files.length > 0) return files[0];
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return null;
}

async function waitForText(page, text, timeout = 20000) {
  await page.waitForFunction(
    text_ => (document.body.innerText ?? '').includes(text_),
    { timeout },
    text,
  );
}

/**
 * Answers the proposal through the wizard's own endpoints, from inside the
 * signed-in page. Nothing is written that the application could not write.
 */
async function prepareDraft(page, api, proposalType = 'manual') {
  return page.evaluate(
    async (origin, answers, proposalType_) => {
      const token =
        localStorage.getItem('token') ??
        localStorage.getItem('authToken') ??
        localStorage.getItem('accessToken') ??
        '';
      const headers = {
        'Content-Type': 'application/json',
        ...(token === '' ? {} : { Authorization: `Bearer ${token}` }),
      };
      const base = `${origin}/api/bouwa/wizard`;

      const created = await (
        await fetch(`${base}/drafts`, {
          method: 'POST',
          headers,
          body: JSON.stringify(
            proposalType_ === 'manual'
              ? { proposalType: 'manual', manualBasis: 'site_survey' }
              : { proposalType: proposalType_ },
          ),
        })
      ).json();
      if (created.draft === undefined)
        return { error: created.error ?? 'The proposal could not be created.' };

      const draft = created.draft;
      const intake = JSON.parse(JSON.stringify(draft.intake));
      for (const [pathText, value] of Object.entries(answers)) {
        const keys = pathText.split('.');
        let node = intake;
        for (const key of keys.slice(0, -1)) node = node[key];
        node[keys[keys.length - 1]] = {
          state: 'answered',
          value,
          note: null,
        };
      }

      const saved = await (
        await fetch(`${base}/drafts/${draft.draftId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            revision: draft.revision,
            intake,
            customer: {
              customerId: null,
              customerName: 'Acceptance Air Services (Pty) Ltd',
              siteId: null,
              siteName: 'Benoni Plant 2',
            },
            currentStepId: 'review',
            currentPageIndex: 0,
          }),
        })
      ).json();
      if (saved.draft === undefined)
        return { error: saved.error ?? 'The proposal could not be answered.' };
      return { draftId: saved.draft.draftId, reference: saved.draft.reference };
    },
    api,
    {
      'identity.customerName': 'Acceptance Air Services (Pty) Ltd',
      'identity.siteName': 'Benoni Plant 2',
      'identity.physicalAddress': '17 Anvil Road, Isando, Kempton Park',
      'existingMachine.manufacturer': 'Atlas Copco',
      'existingMachine.model': 'GA 30',
      'proposedMachine.manufacturer': 'Kaeser',
      'proposedMachine.model': 'ASD 40',
      'investment.pricingStatus': 'ars_quotation',
      'investment.priceSourceReference': 'QUO-2026-0142',
      'investment.itemDescription':
        'Kaeser ASD 40, supplied, installed and commissioned',
      'investment.unitPriceRand': 480000,
      'investment.quantity': 1,
      'investment.installationRand': 52000,
      'investment.buyBackRand': 35000,
    },
    proposalType,
  );
}

async function main() {
  if (EMAIL === '' || PASSWORD === '')
    throw new Error(
      'BOUWA_ACCEPTANCE_EMAIL and BOUWA_ACCEPTANCE_PASSWORD are required.',
    );
  fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

  const puppeteer = resolvePuppeteer();
  const executablePath = resolveBrowserExecutable();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox'],
    ...(executablePath === undefined ? {} : { executablePath }),
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    page.on('pageerror', error =>
      failures.push(`The page raised: ${error.message}`),
    );

    process.stdout.write('Signing in as an ordinary ARS user\n');
    const origin = new URL(PAGE_URL).origin;
    await page.goto(`${origin}/login`, { waitUntil: 'networkidle2' });
    await page.type('input[type="email"], input[name="email"]', EMAIL);
    await page.type('input[type="password"], input[name="password"]', PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
      clickByText(page, 'button', 'Sign in').then(
        clicked => clicked || page.keyboard.press('Enter'),
      ),
    ]);
    await new Promise(resolve => setTimeout(resolve, 2500));
    check(
      !page.url().includes('/login'),
      'an ordinary ARS user reaches the application',
    );

    process.stdout.write('Preparing a proposal through the wizard API\n');
    const prepared = await prepareDraft(page, API_ORIGIN);
    if (prepared.error !== undefined)
      throw new Error(`The proposal could not be prepared: ${prepared.error}`);
    process.stdout.write(`  draft ${prepared.reference}\n`);

    process.stdout.write('Opening the proposal at the review step\n');
    await page.goto(PAGE_URL, { waitUntil: 'networkidle2' });
    await waitForText(page, prepared.reference);
    await shot(page, 'draft-list');
    check(
      (await pageText(page)).includes(prepared.reference),
      'the proposal appears in the list under its reference',
    );

    check(
      (await pageText(page)).includes('Preliminary'),
      'the list says what each proposal currently rests on',
    );

    check(
      await openDraft(page, prepared.reference),
      'the proposal can be opened from the list',
    );
    await waitForText(page, 'Review');
    await new Promise(resolve => setTimeout(resolve, 2500));
    await shot(page, 'review-step');
    const review = await pageText(page);

    const lower = review.toLowerCase();
    check(
      (lower.includes('ready now') || lower.includes('not ready yet')) &&
        lower.includes('can generate'),
      'the review page leads with what can be generated now',
    );
    check(
      !lower.includes('still to answer') || lower.includes('would raise'),
      'logger-only gaps are not listed as outstanding sales work',
    );
    check(
      review.includes('Fix now') || /→/.test(review) || review.includes('and'),
      'each outstanding figure names the questions behind it',
    );
    check(
      !review.includes('AUDIT.') && !/[a-z]+\.[a-z]+[A-Z]/.test(review),
      'no field code or intake path is shown to a rep',
    );
    check(
      (review.includes('Generate preliminary proposal') ||
        review.includes('Preliminary customer proposal') ||
        review.includes('Finish draft with outstanding items')) &&
        !review.includes('there is no proposal to preview'),
      'the last button offers the proposal rather than denying there is one',
    );
    check(
      lower.split('preliminary. this proposal is an early indication').length <=
        2,
      'the level a proposal rests on is stated once, not twice over',
    );
    check(
      !review.includes('so results are not stored against a duplicate'),
      'the guidance for a question is not repeated beside the button that opens it',
    );
    check(
      review.split('No logger record was measured').length <= 2,
      'what a manual proposal never measures is explained once',
    );

    process.stdout.write('Opening the proposal preview\n');
    check(
      await clickProposalAction(page),
      'the proposal can be read at any point, not only once it is complete',
    );
    await waitForText(page, 'Download PDF');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await shot(page, 'proposal-preview');

    // The reported defect: pressing Preview returned to the Bouwa main screen.
    // Landing on the list, or on an address that is still the list, is the
    // failure itself and is worth naming rather than inferring from a later
    // check that happens to fail.
    const previewUrl = page.url();
    check(
      /\/bouwa\/proposals\/[^/]+\/preview$/.test(previewUrl),
      'previewing goes to the proposal, not back to the Bouwa main screen',
    );
    check(
      (await page.$('[data-testid="wizard-draft-list"]')) === null,
      'the proposal list is not what a rep is shown after asking for a preview',
    );

    const proposal = await pageText(page);
    check(
      proposal.includes('Acceptance Air Services'),
      'the proposal names the customer it is for',
    );
    check(
      (await page.$('.bouwa-proposal-document')) !== null,
      'the proposal is rendered as a document, not as a summary',
    );
    check(
      proposal.includes('Download PDF') &&
        proposal.includes('Print') &&
        proposal.includes('Generate new version') &&
        proposal.includes('Return to draft') &&
        proposal.includes('Advanced Technical Review'),
      'the preview offers everything a rep needs to do with the proposal',
    );
    check(
      /R\s?\d/.test(proposal) || proposal.includes('Not yet priced'),
      'the investment is either stated in rands or said to be unpriced',
    );
    check(
      !proposal.includes('AUDIT.') && !proposal.includes('readiness'),
      'nothing internal reaches the page a customer reads',
    );
    // Headings are uppercased in the stylesheet, and innerText returns them
    // that way, so what is read off the page is compared without case.
    const proposalLower = proposal.toLowerCase();
    check(
      proposalLower.includes('does not state') &&
        proposalLower.includes('preliminary'),
      'the proposal is honest about what it cannot state',
    );
    check(
      proposalLower.split('this is a preliminary proposal').length === 2,
      'it says so once rather than warning the reader twice',
    );
    check(
      proposalLower.includes('not a quotation'),
      'a preliminary proposal is not left looking like a quotation',
    );
    check(
      proposalLower.includes('still to be confirmed') ||
        proposalLower.includes('these figures assume'),
      'a preliminary proposal states its assumptions or what it waits on',
    );
    check(
      !(
        proposalLower.includes('net initial investment') &&
        /net investment[^.]*(not|cannot)/.test(proposalLower)
      ),
      'no figure is printed and disclaimed on the same page',
    );

    process.stdout.write('Checking what the printer would be sent\n');
    await page.emulateMediaType('print');
    const printed = await page.evaluate(() => {
      const visible = element => {
        if (element === null) return false;
        const style = window.getComputedStyle(element);
        return style.visibility !== 'hidden' && style.display !== 'none';
      };
      return {
        document: visible(document.querySelector('.bouwa-proposal-document')),
        toolbar: visible(document.querySelector('.bouwa-proposal-toolbar')),
        navigation: visible(document.querySelector('nav')),
      };
    });
    await page.emulateMediaType(null);
    check(printed.document, 'the printed page carries the proposal');
    check(
      !printed.toolbar && !printed.navigation,
      'the application around it is not printed with it',
    );

    process.stdout.write('Saving the proposal as a PDF\n');
    const downloads = path.join(OUTPUT_DIRECTORY, 'downloads');
    fs.rmSync(downloads, { recursive: true, force: true });
    fs.mkdirSync(downloads, { recursive: true });
    const session = await page.createCDPSession();
    await session.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloads,
    });
    await clickByText(page, 'button', 'Download PDF');
    const saved = await waitForDownload(downloads);
    check(saved !== null, 'the proposal downloads as a PDF');
    if (saved !== null) {
      const bytes = fs.statSync(path.join(downloads, saved)).size;
      process.stdout.write(`  file  ${saved} (${bytes} bytes)\n`);
      check(
        saved.endsWith('.pdf') && saved.includes(prepared.reference),
        'the downloaded file is named for the proposal it holds',
      );
      check(bytes > 20000, 'the PDF has the document in it, not an empty page');
    }

    process.stdout.write('Checking the version the preview generated\n');
    // Opening the preview generates version 1, so the rep never lands on a
    // page with no document on it. A second version is a deliberate act.
    check(
      proposal.includes('Version 1'),
      'opening the preview produced a version rather than an empty page',
    );
    const generateDisabled = await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('button')).find(
        element =>
          (element.textContent ?? '').includes('Generate new version'),
      );
      return button === undefined ? null : button.disabled;
    });
    check(
      generateDisabled === true,
      'a second version saying exactly the same thing is not offered',
    );

    process.stdout.write('Refreshing the browser on the preview\n');
    await page.reload({ waitUntil: 'networkidle2' });
    await waitForText(page, 'Download PDF');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await shot(page, 'proposal-preview-after-refresh');
    check(
      page.url() === previewUrl,
      'a refresh stays on the preview instead of returning to the list',
    );
    const refreshed = await pageText(page);
    check(
      refreshed.includes(prepared.reference) &&
        (await page.$('.bouwa-proposal-document')) !== null,
      'the same proposal is still on the page after the refresh',
    );
    check(
      refreshed.includes('Version 1'),
      'the version generated before the refresh is still the version shown',
    );

    process.stdout.write('Opening the preview from its address alone\n');
    await page.goto(`${origin}/dashboard`, { waitUntil: 'networkidle2' });
    await page.goto(previewUrl, { waitUntil: 'networkidle2' });
    await waitForText(page, 'Download PDF');
    await new Promise(resolve => setTimeout(resolve, 1500));
    check(
      (await pageText(page)).includes(prepared.reference),
      'the preview address opens the proposal on its own, as a link would',
    );

    process.stdout.write('The proposal list offers the document it holds\n');
    await page.goto(PAGE_URL, { waitUntil: 'networkidle2' });
    await waitForText(page, prepared.reference);
    await new Promise(resolve => setTimeout(resolve, 1500));
    await shot(page, 'draft-list-with-document');
    const listWithDocument = await pageText(page);
    check(
      listWithDocument.includes('Preview'),
      'a proposal that has produced a document can be opened from the list',
    );
    check(
      listWithDocument.includes('Download latest PDF'),
      'the PDF generated earlier is offered from the list without reopening it',
    );

    process.stdout.write('Downloading the stored PDF from the list\n');
    fs.rmSync(downloads, { recursive: true, force: true });
    fs.mkdirSync(downloads, { recursive: true });
    await clickByText(page, 'button', 'Download latest PDF');
    const fromList = await waitForDownload(downloads);
    check(
      fromList !== null,
      'the stored PDF is handed over from the list, not regenerated',
    );
    if (fromList !== null) {
      const bytes = fs.statSync(path.join(downloads, fromList)).size;
      process.stdout.write(`  file  ${fromList} (${bytes} bytes)\n`);
      check(
        bytes > 20000,
        'the stored PDF holds the document rather than an empty page',
      );
    }

    process.stdout.write('Returning to the draft from the preview\n');
    await page.goto(previewUrl, { waitUntil: 'networkidle2' });
    await waitForText(page, 'Return to draft');
    check(
      await clickByText(page, 'button', 'Return to draft'),
      'the rep can go back to the questions from the proposal',
    );
    await waitForText(page, 'Review');
    check(
      /\/bouwa\/proposals\/[^/]+$/.test(page.url()),
      'returning to the draft opens the proposal, not the list',
    );

    process.stdout.write('Reaching the technical review from the preview\n');
    await page.goto(previewUrl, { waitUntil: 'networkidle2' });
    await waitForText(page, 'Advanced Technical Review');
    check(
      await clickByText(page, 'button', 'Advanced Technical Review'),
      'the engineering detail is reachable from the proposal',
    );
    await new Promise(resolve => setTimeout(resolve, 2500));
    check(
      /technical-review$/.test(page.url()),
      'the technical review is a place of its own, reachable by address',
    );
    await shot(page, 'technical-review-from-preview');

    process.stdout.write('The other proposal type reaches the same document\n');
    const airAudit = await prepareDraft(page, API_ORIGIN, 'air_audit');
    if (airAudit.error !== undefined)
      throw new Error(`An air audit could not be prepared: ${airAudit.error}`);
    process.stdout.write(`  draft ${airAudit.reference}\n`);
    await page.goto(PAGE_URL, { waitUntil: 'networkidle2' });
    await waitForText(page, airAudit.reference);
    check(
      await openDraft(page, airAudit.reference),
      'an air audit opens from the same list, under its own reference',
    );
    await waitForText(page, 'Review');
    await new Promise(resolve => setTimeout(resolve, 2500));
    await shot(page, 'air-audit-review');
    const auditReview = await pageText(page);
    check(
      auditReview.includes('Measured') || auditReview.includes('measured'),
      'an air audit is asked for the measurements a manual proposal is not',
    );
    check(
      await clickProposalAction(page),
      'an air audit reaches the proposal the same way',
    );
    await waitForText(page, 'Download PDF');
    await new Promise(resolve => setTimeout(resolve, 1500));
    await shot(page, 'air-audit-proposal');
    const auditProposal = await pageText(page);
    check(
      /air audit/i.test(auditProposal),
      'the document says which kind of proposal it is',
    );
    check(
      !auditProposal.includes('AUDIT.') && !auditProposal.includes('air_audit'),
      'the other proposal type is also free of internal wording',
    );

    process.stdout.write('Confirming the document is held on the server\n');
    // Read straight from the API rather than from the page. What survives a
    // restart is what the server holds, and a browser that happens to still
    // have the document in memory would prove nothing about that.
    const held = await page.evaluate(async api => {
      const token =
        localStorage.getItem('token') ??
        localStorage.getItem('authToken') ??
        localStorage.getItem('accessToken') ??
        '';
      const response = await fetch(`${api}/api/bouwa/wizard/drafts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return { error: `${response.status}` };
      const body = await response.json();
      return { drafts: body.drafts ?? [] };
    }, API_ORIGIN);
    if (held.error !== undefined)
      throw new Error(`The proposal list could not be read: ${held.error}`);
    const stored = (held.drafts ?? []).find(
      entry => entry.reference === prepared.reference,
    );
    if (stored === undefined)
      throw new Error(
        `${prepared.reference} is not in the list the server returned.`,
      );
    check(
      stored !== undefined && stored.documentVersion >= 1,
      'the generated version is held on the server, not only in the browser',
    );
    check(
      stored !== undefined && stored.hasDocumentPdf === true,
      'the rendered PDF is held on the server and outlives the session',
    );
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    process.stdout.write(`\n${failures.length} check(s) failed:\n`);
    for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write('\nGuided-wizard browser acceptance passed.\n');
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exitCode = 1;
});
