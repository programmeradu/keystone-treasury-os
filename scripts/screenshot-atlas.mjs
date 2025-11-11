import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer';

const FORCED_PORT = 3013; // avoid env-provided PORT collisions
const PORT = FORCED_PORT;
const URL = `http://127.0.0.1:${PORT}/atlas`;

async function waitForUrl(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return true;
    } catch (_) {
      // ignore until server is up
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function main() {
  // Ensure build exists
  if (!fs.existsSync(path.join(process.cwd(), '.next'))) {
    console.error('Missing .next build. Run: npm run build');
    process.exit(1);
  }

  // Start Next server
  console.log('Starting Next.js server...');
  const env = { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' };
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    stdio: 'inherit',
    env,
  });

  try {
    await waitForUrl(`http://127.0.0.1:${PORT}`);
    console.log('Server is up, taking screenshot...');

    const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    await page.goto(URL, { waitUntil: 'networkidle2' });

    // Give client-only providers a moment to hydrate
    await new Promise(r => setTimeout(r, 1500));

    const outDir = path.join(process.cwd(), 'docs', 'screenshots');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'atlas-working.png');

    await page.screenshot({ path: outPath, fullPage: true });
    console.log('Saved screenshot to', outPath);

    await browser.close();
  } finally {
    // Kill server
    server.kill('SIGTERM');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
