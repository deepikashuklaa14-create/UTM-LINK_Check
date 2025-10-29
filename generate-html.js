// const fs = require('fs');
// const path = require('path');
// const reporter = require('cucumber-html-reporter');

// async function waitForJsonFile(filePath, timeout = 120000) {
//   const start = Date.now();
//   while (true) {
//     if (fs.existsSync(filePath)) {
//       try {
//         JSON.parse(fs.readFileSync(filePath, 'utf-8'));
//         return true;
//       } catch {}
//     }
//     if (Date.now() - start > timeout) throw new Error('JSON file not ready in time');
//     await new Promise(r => setTimeout(r, 500));
//   }
// }

// (async () => {
//   const jsonFilePath = path.join(__dirname, 'reports', 'cucumber_report.json');
//   const htmlReportPath = path.join(__dirname, 'reports', 'cucumber_report.html');

//   try {
//     await waitForJsonFile(jsonFilePath);

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
//       brandTitle: 'Cucumber Playwright Tests',
//       screenshotsDirectory: 'videos', // video folder
//     });

//     console.log(`✅ HTML Report generated: ${htmlReportPath}`);
//   } catch (err) {
//     console.error('❌ Failed to generate HTML report:', err);
//   }
// })();



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
    if (Date.now() - start > timeout) throw new Error('JSON file not ready in time');
    await new Promise(r => setTimeout(r, 500));
  }
}

(async () => {
  const jsonFilePath = path.join(__dirname, 'reports', 'cucumber_report.json');
  const htmlReportPath = path.join(__dirname, 'reports', 'cucumber_report.html');
  const videosDir = path.join(__dirname, 'videos');

  try {
    await waitForJsonFile(jsonFilePath);

    // 1️⃣ Generate the standard HTML report first
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

    // 2️⃣ Inject video elements if any videos exist
    if (fs.existsSync(videosDir)) {
      const videos = fs.readdirSync(videosDir).filter(f => f.endsWith('.mp4'));
      if (videos.length > 0) {
        let html = fs.readFileSync(htmlReportPath, 'utf-8');

        const videoSection = `
          <h2 style="margin-top: 2em;">🎥 Test Videos</h2>
          ${videos.map(v => `
            <div style="margin-bottom: 1em;">
              <h4>${v}</h4>
              <video controls width="800">
                <source src="../videos/${v}" type="video/mp4">
                Your browser does not support HTML5 video.
              </video>
            </div>
          `).join('\n')}
        `;

        // Inject before closing body tag
        html = html.replace('</body>', `${videoSection}\n</body>`);
        fs.writeFileSync(htmlReportPath, html, 'utf-8');
        console.log(` Embedded ${videos.length} videos into report.`);
      } else {
        console.log(' No video files found in videos directory.');
      }
    }

    console.log(` HTML Report generated: ${htmlReportPath}`);
  } catch (err) {
    console.error(' Failed to generate HTML report:', err);
  }
})();
