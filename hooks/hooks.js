// hooks.js
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
  const videoDir = path.join(process.cwd(), 'videos', `${scenarioName}_${timestamp}`);

  fs.mkdirSync(videoDir, { recursive: true });

  const context = await browser.newContext({
    recordVideo: {
      dir: videoDir,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();
  this.context = context;
  this.page = page;
  this.videoDir = videoDir;
  this.scenarioName = scenarioName;
});

After(async function () {
  const video = await this.page.video();
  const videoPath = await video.path();
  await this.context.close();

  if (fs.existsSync(videoPath)) {
    const relativeVideoPath = path.relative(process.cwd(), videoPath).replace(/\\/g, '/');

    // Embed video directly into the Cucumber JSON (HTML-supported)
    const videoHtml = `
      <div style="margin-top:10px">
        <strong>📹 Test Video:</strong><br/>
        <video width="480" height="270" controls>
          <source src="${relativeVideoPath}" type="video/webm">
          Your browser does not support the video tag.
        </video>
      </div>
    `;

    this.attach(videoHtml, 'text/html');
  }
});

AfterAll(async () => {
  await browser.close();
});
