const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function run() {
    const url = process.argv[2] || 'http://localhost:3000/auth';
    const name = process.argv[3] || 'screenshot';

    // Path to the artifacts directory
    const artifactsDir = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\c31948ca-1530-4171-98e2-20da79724a9b';
    const outputPath = path.join(artifactsDir, `${name}_${Date.now()}.png`);

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Wait an extra second for animations
    await new Promise(r => setTimeout(r, 1500));

    console.log(`Saving screenshot to ${outputPath}...`);
    await page.screenshot({ path: outputPath, fullPage: true });

    await browser.close();
    console.log('Done!');
}

run().catch(console.error);
