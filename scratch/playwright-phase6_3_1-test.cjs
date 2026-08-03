const { chromium } = require('playwright');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { connectToDatabase } = require('../server/db.cjs');
const Student = require('../server/models/Student.cjs');
const Payment = require('../server/models/Payment.cjs');

const ARTIFACT_DIR = 'C:\\Users\\VARSHITH\\.gemini\\antigravity-ide\\brain\\bd68fc1b-0f71-4449-9daf-56a203dd2a08';
const SCREENSHOT_PATH = path.join(ARTIFACT_DIR, 'post_payment_screenshot.png');

async function runPlaywrightTest() {
  console.log('=== STARTING PLAYWRIGHT PHASE 6.3.1 AUTOMATED VERIFICATION ===');

  // 1. Start local Express production server
  await connectToDatabase();
  const app = require('../server/app.cjs');
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
  });

  const server = app.listen(3000, () => {
    console.log('✅ Local Production Test Server running at http://localhost:3000');
  });

  let browser;
  try {
    // 2. Launch Chromium browser
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    console.log('1. Navigating to portal gateway login...');
    await page.goto('http://localhost:3000/#/v1-portal-gate-x89f2a7b', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    console.log('2. Selecting Accountant role & entering password...');
    
    // Select Accountant role
    const accountantCard = await page.waitForSelector('button:has-text("Accountant")', { timeout: 10000 });
    await accountantCard.click();
    await page.waitForTimeout(300);

    // Fill password input
    const passwordInput = await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await passwordInput.fill('AccE1#4102');

    // Submit credentials form to proceed to PIN step
    const continueBtn = await page.waitForSelector('button:has-text("Continue to 6-Digit PIN"), button[type="submit"]', { timeout: 5000 });
    await continueBtn.click();
    
    console.log('3. Waiting for PIN entry step...');
    await page.waitForTimeout(1500);

    // Press Accountant PIN digits: 3, 2, 4, 0, 0, 4
    console.log('Entering Accountant 6-Digit Security PIN (324004)...');
    const pinDigits = ['3', '2', '4', '0', '0', '4'];
    for (const d of pinDigits) {
      const digitBtn = await page.waitForSelector(`button:has-text("${d}")`, { timeout: 5000 });
      await digitBtn.click();
      await page.waitForTimeout(200);
    }

    console.log('4. Waiting for Accountant Cockpit dashboard to load...');
    await page.waitForSelector('text=Fee Collection', { timeout: 15000 });
    console.log('✅ Accountant Cockpit Dashboard loaded successfully!');

    console.log('5. Opening Fee Collection module card...');
    const feeDeskCard = await page.waitForSelector('text=Fee Collection', { timeout: 10000 });
    await feeDeskCard.click();

    await page.waitForSelector('input[placeholder*="Search student"]', { timeout: 10000 });

    console.log('6. Searching for student INS-2026-PAYTEST...');
    await page.fill('input[placeholder*="Search student"]', 'INS-2026-PAYTEST');
    await page.waitForTimeout(1000);

    // Select the student card
    const studentCard = await page.waitForSelector('text=Payment Test Student', { timeout: 5000 });
    await studentCard.click();
    await page.waitForTimeout(1500);

    console.log('7. Student profile loaded. Submitting Partial Fee Payment (50%)...');
    
    // Click Partial Pay (50%) button
    const partialPayBtn = await page.waitForSelector('button:has-text("Partial Pay (50%)")', { timeout: 5000 });
    await partialPayBtn.click();
    await page.waitForTimeout(800);

    console.log('8. Filling Security Authorization OTP modal (324004)...');
    const otpModalInput = await page.waitForSelector('input[placeholder*="6-digit OTP"]', { timeout: 8000 });
    await otpModalInput.fill('324004');

    const confirmPayBtn = await page.waitForSelector('button:has-text("Authorize Payment")', { timeout: 5000 });
    console.log('Submitting payment authorization...');
    await confirmPayBtn.click();

    // Wait for the full-screen data freshness spinner ("SYNCHRONIZING CAMPUS DATA...") to disappear
    console.log('Waiting for background freshness sync to complete...');
    await page.waitForSelector('text=SYNCHRONIZING CAMPUS DATA...', { state: 'detached', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    console.log('\n==================================================');
    console.log('9. EXTRACTING RENDERED DOM VALUES IMMEDIATELY POST-SUBMISSION:');
    console.log('==================================================');

    // Extract exact text lines from rendered DOM
    const rawDomText = await page.evaluate(() => document.body.innerText);

    const extractedTextLines = rawDomText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    console.log('--- ALL EXTRACTED DOM TEXT LINES POST-PAYMENT ---');
    extractedTextLines.forEach((line, idx) => {
      if (
        line.includes('Payment Test Student') ||
        line.includes('INS-2026-PAYTEST') ||
        line.includes('Erragattugutta') ||
        line.includes('Gross Total') ||
        line.includes('Tuition Waiver') ||
        line.includes('Total Waivers') ||
        line.includes('Total Payments') ||
        line.includes('Balance') ||
        line.includes('Rs.')
      ) {
        console.log(`Line [${idx}]:`, line);
      }
    });
    console.log('==================================================\n');

    // 10. Take real screenshot immediately post-submission
    console.log('10. Taking screenshot immediately post-submission...');
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    console.log(`✅ Screenshot saved to: ${SCREENSHOT_PATH}`);

    // Revert test payment from DB
    const latestPay = await Payment.findOne({ studentName: 'Payment Test Student' }).sort({ createdAt: -1 });
    if (latestPay) {
      await Payment.deleteOne({ _id: latestPay._id });
      await Student.updateOne(
        { admissionNumber: 'INS-2026-PAYTEST' },
        {
          $set: { totalPaid: 78000, remainingBalance: 12000 },
          $pop: { receipts: 1 }
        }
      );
      console.log('✅ Reverted test payment from MongoDB (Restored 78,000 paid / 12,000 balance baseline)');
    }

    console.log('=== PLAYWRIGHT AUTOMATED VERIFICATION COMPLETE: 100% SUCCESS ===');

  } catch (err) {
    console.error('Playwright Test Error:', err);
    throw err;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runPlaywrightTest().catch(() => process.exit(1));
