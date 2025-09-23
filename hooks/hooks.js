const { BeforeAll, AfterAll, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const sites = require('../data/website_url.js');
const reporter = require('cucumber-html-reporter'); // Importing the HTML reporter

setDefaultTimeout(60 * 1000); // 60 seconds timeout

let browser;
let context;
let page;
let siteStatus = [];

BeforeAll(async () => {
  browser = await chromium.launch({ headless: true });
});

Before(async function (scenario) {
  const scenarioName = scenario.pickle.name.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Get timestamp for unique video names
  const videosPath = path.join(process.cwd(), 'videos', `${scenarioName}_${timestamp}`); // Use scenario name + timestamp for unique folder
  fs.mkdirSync(videosPath, { recursive: true });

  // Save timestamp on the this context to use it in After hook
  this.timestamp = timestamp;
  this.scenarioName = scenarioName;

  context = await browser.newContext({
    recordVideo: {
      dir: videosPath,
      size: { width: 1280, height: 720 },
    },
  });

  page = await context.newPage();
  this.page = page;
  this.pageStatuses = [];

  page.on('response', response => {
    this.pageStatuses.push({
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
    });
  });
});

After(async function (scenario) {
  this.pageStatuses.forEach(entry => {
    siteStatus.push({
      site: this.siteConfig.site,
      page: this.scenarioName,
      url: entry.url,
      status: entry.status,
      statusText: entry.statusText,
    });
  });

  // Save screenshot if the scenario failed
  if (scenario.result.status === 'FAILED') {
    const screenshotsDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }

    const screenshotPath = path.join(screenshotsDir, `${this.scenarioName}_${this.timestamp}.png`);
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Screenshot saved at: ${screenshotPath}`);
  }

  // Use dynamic video file path based on timestamp stored in Before hook
  const videoPath = path.join(process.cwd(), 'videos', `${this.scenarioName}_${this.timestamp}`, 'video.mp4');
  if (fs.existsSync(videoPath)) {
    console.log(`Video saved at: ${videoPath}`);
  }

  await context.close();
});

AfterAll(async () => {
  if (siteStatus.length === 0) {
    console.warn('⚠️ No site status data collected, skipping report generation.');
    await browser.close();
    return;
  }

  const wb = xlsx.utils.book_new();
  const groupedBySite = siteStatus.reduce((acc, curr) => {
    if (!acc[curr.site]) {
      acc[curr.site] = [];
    }
    acc[curr.site].push(curr);
    return acc;
  }, {});

  function sanitizeSheetName(name) {
    return name.replace(/[:\\\/\?\*\[\]]/g, '_').substring(0, 31);
  }

  for (const [site, data] of Object.entries(groupedBySite)) {
    const ws = xlsx.utils.json_to_sheet(data);
    const sheetName = sanitizeSheetName(site);
    xlsx.utils.book_append_sheet(wb, ws, sheetName);
  }

  const reportsDir = path.join(process.cwd(), 'reports');
  const excelReportPath = path.join(reportsDir, 'site_status_report.xlsx');

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  xlsx.writeFile(wb, excelReportPath);
  console.log(`✅ Excel Report generated: ${excelReportPath}`);

  // 🔽 HTML Report Configuration
  const htmlReportPath = path.join(reportsDir, 'cucumber_report.html');

  // Ensure cucumber_report.json exists
  const jsonFilePath = path.join(reportsDir, 'cucumber_report.json');
  if (!fs.existsSync(jsonFilePath)) {
    console.warn('⚠️ JSON report file not found. Skipping HTML report generation.');
    await browser.close();
    return;
  }

  reporter.generate({
    theme: 'bootstrap',
    jsonFile: jsonFilePath,
    output: htmlReportPath,
    reportSuiteAsScenarios: true,
    launchReport: false,
    metadata: {
      "Test Environment": "STAGING",
      "Browser": "Chromium",
      "Platform": process.platform,
      "Executed": "Automated",
    },
  });

  console.log(`✅ HTML Report generated: ${htmlReportPath}`);

  await browser.close();
});
