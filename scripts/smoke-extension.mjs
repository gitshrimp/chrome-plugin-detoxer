import path from 'node:path';
import { chromium } from 'playwright';

const extensionPath = path.join(process.cwd(), 'Detoxer');

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
  await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });

  const title = await page.title();
  if (!title || !/example/i.test(title)) {
    throw new Error(`Unexpected page title after extension load: ${title}`);
  }

  console.log('Extension smoke test passed.');
  console.log(`Service worker: ${serviceWorkerUrl}`);
} finally {
  await context.close();
}
