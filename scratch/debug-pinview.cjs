const { chromium } = require('playwright');
const express = require('express');
const path = require('path');
const { connectToDatabase } = require('../server/db.cjs');

async function debugPinView() {
  await connectToDatabase();
  const app = require('../server/app.cjs');
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
  });

  const server = app.listen(3003, async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('PAGE UNCAUGHT ERROR:', err));

    console.log('Navigating to gateway...');
    await page.goto('http://localhost:3003/#/v1-portal-gate-x89f2a7b');
    await page.waitForTimeout(3000);

    await browser.close();
    server.close();
    process.exit(0);
  });
}

debugPinView();
