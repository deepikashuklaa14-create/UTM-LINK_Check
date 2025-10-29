// const {BeforeAll, AfterAll, Before, After, setDefaultTimeout,
//   Status
// } = require('@cucumber/cucumber');
// const { chromium } = require('playwright');
// const fs = require('fs');
// const path = require('path');
// const reporter = require('cucumber-html-reporter');

// setDefaultTimeout(60 * 60 * 1000); // 40 minutes

// let browser;
// let context;
// let page;
// let siteStatus = [];

// BeforeAll(async () => {
//   browser = await chromium.launch({ headless: false });
// });

// Before(async function (scenario) {
//   const scenarioName = scenario.pickle.name.replace(/[^a-zA-Z0-9]/g, '_');
//   const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Get timestamp for unique video names
//   const videosPath = path.join(process.cwd(), 'videos', `${scenarioName}_${timestamp}`); // Use scenario name + timestamp for unique folder
//   fs.mkdirSync(videosPath, { recursive: true });

//   // Save timestamp on the this context to use it in After hook
//   this.timestamp = timestamp;
//   this.scenarioName = scenarioName;

//   context = await browser.newContext({
//     recordVideo: {
//       dir: videosPath,
//       size: { width: 1280, height: 720 },
//     },
//   });

//   page = await context.newPage();
//   this.page = page;
//   this.pageStatuses = [];

//   page.on('response', response => {
//     this.pageStatuses.push({
//       url: response.url(),
//       status: response.status(),
//       statusText: response.statusText(),
//     });
//   });
// });

// After(async function (scenario) {
//   this.pageStatuses.forEach(entry => {
//     siteStatus.push({
//       site: this.siteConfig ? this.siteConfig.site : 'Unknown',
//       page: this.scenarioName,
//       url: entry.url,
//       status: entry.status,
//       statusText: entry.statusText,
//     });
//   });

//   // Use dynamic video file path based on timestamp stored in Before hook
//   const videoPath = path.join(process.cwd(), 'videos', `${this.scenarioName}_${this.timestamp}`, 'video.mp4');
//   if (fs.existsSync(videoPath)) {
//     console.log(`Video saved at: ${videoPath}`);
//   }

//   await context.close();
// });

// // AfterAll(async () => {
// //   const reportsDir = path.join(process.cwd(), 'reports');

// //   // Ensure reports directory exists
// //   if (!fs.existsSync(reportsDir)) {
// //     fs.mkdirSync(reportsDir, { recursive: true });
// //   }

// //   const htmlReportPath = path.join(reportsDir, 'cucumber_report.html');
// //   const jsonFilePath = path.join(reportsDir, 'cucumber_report.json');

// //   if (!fs.existsSync(jsonFilePath)) {
// //     console.warn('JSON report file not found. Skipping HTML report generation.');
// //     await browser.close();
// //     return;
// //   }

// //   try {
// //     reporter.generate({
// //       theme: 'bootstrap',
// //       jsonFile: jsonFilePath,
// //       output: htmlReportPath,
// //       reportSuiteAsScenarios: true,
// //       launchReport: false,
// //       metadata: {
// //         "Test Environment": "STAGING",
// //         "Browser": "Chromium",
// //         "Platform": process.platform,
// //         "Executed": "Automated",
// //       },
// //     });
// //     console.log(` HTML Report generated: ${htmlReportPath}`);
// //   } catch (error) {
// //     console.error(' Failed to generate HTML report:', error);
// //   }
// //   await browser.close();
// // });

// async function waitForJsonFile(filePath, timeout = 30000) {
//   const start = Date.now();
//   while (true) {
//     if (fs.existsSync(filePath)) {
//       try {
//         const raw = fs.readFileSync(filePath, 'utf-8');
//         JSON.parse(raw); // If valid, exit loop
//         return true;
//       } catch (err) {
//         // JSON is invalid/incomplete, continue waiting
//       }
//     }
//     if (Date.now() - start > timeout) {
//       throw new Error('JSON file not ready in time');
//     }
//     await new Promise(r => setTimeout(r, 100)); // wait 100ms before retry
//   }
// }


// AfterAll(async () => {
//   const reportsDir = path.join(process.cwd(), 'reports');
//   if (!fs.existsSync(reportsDir)) {
//     fs.mkdirSync(reportsDir, { recursive: true });
//   }

//   const htmlReportPath = path.join(reportsDir, 'cucumber_report.html');
//   const jsonFilePath = path.join(reportsDir, 'cucumber_report.json');

//   try {
//     await waitForJsonFile(jsonFilePath); // now this works

//     reporter.generate({
//       theme: 'bootstrap',
//       jsonFile: jsonFilePath,
//       output: htmlReportPath,
//       reportSuiteAsScenarios: true,
//       launchReport: false,
//       metadata: {
//         "Test Environment": "STAGING",
//         "Browser": "Chromium",
//         "Platform": process.platform,
//         "Executed": "Automated",
//       },
//     });
//     console.log(`HTML Report generated: ${htmlReportPath}`);
//   } catch (error) {
//     console.error(' Failed to generate HTML report:', error);
//   }

//   await browser.close();
// });




const { BeforeAll, AfterAll, Before, After, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

setDefaultTimeout(60 * 60 * 1000); // 1 hour

let browser;

BeforeAll(async () => {
  browser = await chromium.launch({ headless: false });
});

Before(async function (scenario) {
  const scenarioName = scenario.pickle.name.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const videoPath = path.join(process.cwd(), 'videos', `${scenarioName}_${timestamp}`);
  fs.mkdirSync(videoPath, { recursive: true });

  const context = await browser.newContext({
    recordVideo: {
      dir: videoPath,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();
  this.context = context;
  this.page = page;
  this.scenarioName = scenarioName;
  this.videoPath = videoPath;
});

After(async function () {
  // Save video path to scenario data for report
  const videoFile = await this.page.video().path();
  if (!this.attachments) this.attachments = [];
  this.attachments.push({ name: 'video', path: videoFile });

  await this.context.close();
});

AfterAll(async () => {
  await browser.close();
});

