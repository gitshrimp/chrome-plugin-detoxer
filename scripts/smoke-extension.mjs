import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const sourceExtensionPath = path.join(process.cwd(), 'Detoxer');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'detoxer-extension-'));
const extensionPath = path.join(tempRoot, 'Detoxer');
fs.cpSync(sourceExtensionPath, extensionPath, { recursive: true });

const manifestPath = path.join(extensionPath, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.host_permissions = Array.from(new Set([...(manifest.host_permissions ?? []), 'http://127.0.0.1/*']));
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

const html = `<!doctype html>
<html>
  <body>
    <main>
      <h1>Discussion</h1>
      <p id="safe">This is a long but friendly comment that should remain visible after the extension runs because it is harmless and boring.</p>
      <p id="toxic">You are a toxic idiot and this long abusive comment should be filtered out by the extension once the user clicks it.</p>
      <p id="short">Too short.</p>
      <div style="height: 2000px"></div>
    </main>
  </body>
</html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const testUrl = `http://127.0.0.1:${port}/`;

const context = await chromium.launchPersistentContext('', {
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});

try {
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker', { timeout: 15000 });
  }

  const serviceWorkerUrl = background.url();
  if (!serviceWorkerUrl.startsWith('chrome-extension://')) {
    throw new Error(`Unexpected service worker URL: ${serviceWorkerUrl}`);
  }

  const page = await context.newPage();

  await page.route('https://commentanalyzer.googleapis.com/**', async (route) => {
    const body = route.request().postDataJSON();
    const text = body?.comment?.text ?? '';
    const toxic = /toxic|idiot|stupid|hate/i.test(text);
    const value = toxic ? 0.95 : 0.05;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        attributeScores: {
          TOXICITY: { summaryScore: { value } },
          INSULT: { summaryScore: { value } },
          IDENTITY_ATTACK: { summaryScore: { value: 0.01 } },
        },
      }),
    });
  });

  await page.goto(testUrl, { waitUntil: 'domcontentloaded' });
  await page.mouse.wheel(0, 1500);
  await page.bringToFront();

  const tabId = await background.evaluate(async () => {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return tabs[0]?.id ?? null;
  });
  if (typeof tabId !== 'number') {
    throw new Error('Could not determine Chromium tab id for test page');
  }

  await background.evaluate(async ({ tabId }) => {
    await chrome.scripting.executeScript({
      target: { tabId },
      function: filtertoxicity,
    });
  }, { tabId });

  await page.waitForFunction(() => {
    const safe = document.querySelector('#safe')?.textContent ?? '';
    const toxic = document.querySelector('#toxic')?.textContent ?? '';
    return safe.length > 0 && toxic === '';
  }, { timeout: 15000 });

  const safeText = await page.locator('#safe').textContent();
  const toxicText = await page.locator('#toxic').textContent();
  if (!safeText || !/friendly comment/i.test(safeText)) {
    throw new Error(`Safe text was unexpectedly modified: ${safeText}`);
  }
  if (toxicText !== '') {
    throw new Error(`Toxic text was not filtered: ${toxicText}`);
  }

  console.log('Extension user-flow smoke test passed.');
  console.log(`Service worker: ${serviceWorkerUrl}`);
} finally {
  await context.close();
  server.close();
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
