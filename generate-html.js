
// generate-html.js
const fs = require('fs');
const path = require('path');
const reporter = require('cucumber-html-reporter');

async function waitForJsonFile(filePath, timeout = 120000) {
  const start = Date.now();
  while (true) {
    if (fs.existsSync(filePath)) {
      try {
        JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return true;
      } catch {}
    }
    if (Date.now() - start > timeout)
      throw new Error('JSON file not ready in time');
    await new Promise(r => setTimeout(r, 500));
  }
}

(async () => {
  const reportsDir = path.join(__dirname, 'reports');
  const jsonFilePath = path.join(reportsDir, 'cucumber_report.json');
  const htmlReportPath = path.join(reportsDir, 'cucumber_report.html');

  try {
    await waitForJsonFile(jsonFilePath);

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
      brandTitle: 'Cucumber Playwright Tests',
    });

    console.log(` HTML Report generated: ${htmlReportPath}`);
  } catch (err) {
    console.error(' Failed to generate HTML report:', err);
  }
})();
