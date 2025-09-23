const { Then } = require('@cucumber/cucumber');
const crawls = require('../../utils/crawls');

Then('I start crawling all configured websites for UTM parameters', { timeout: 600000 }, async function () {
  console.log('** Starting UTM validation crawl **');
  await crawls.startBrowserAndSetup();
  for (const url of crawls.websiteList) {
    console.log(`UTM: crawling ${url}`);
    await crawls.crawlForUTMValidation(url);
  }
  await crawls.teardownBrowser();
});

Then('I start crawling all configured websites for Broken Link', { timeout: 600000 }, async function () {
  console.log('** Starting Broken Link crawl **');
  await crawls.startBrowserAndSetup();
  for (const url of crawls.websiteList) {
    console.log(`Broken: crawling ${url}`);
    await crawls.crawlForBrokenLinks(url);
  }
  await crawls.teardownBrowser();
});

Then('I start crawling all configured websites for Checking Internal and External Links', { timeout: 600000 }, async function () {
  console.log('** Starting Link Export crawl **');
  await crawls.startBrowserAndSetup();
  for (const url of crawls.websiteList) {
    console.log(`LinksExport: crawling ${url}`);
    await crawls.crawlForLinkExport(url);
  }
  await crawls.teardownBrowser();
});

Then('I generate a UTM parameter report', async function () {
  console.log('** Generating UTM Report **');
  await crawls.generateUTMReport();
});

Then('I generate a broken link report', async function () {
  console.log('** Generating Broken Link Report **');
  await crawls.generateAllLinksReport();
});

Then('I export all internal and external links', async function () {
  console.log('** Generating Links Export **');
  await crawls.generateLinksExport();
});
