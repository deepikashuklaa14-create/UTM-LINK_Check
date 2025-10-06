const { Then } = require('@cucumber/cucumber');
const crawls = require('../../utils/crawls');

Then('I start crawling all configured websites for UTM parameters', { timeout: 5000000 }, async function () {
  console.log('** Starting UTM validation crawl **');
  await crawls.startBrowserAndSetup();
  for (const url of crawls.websiteList) {
    console.log(`UTM: crawling ${url}`);
    await crawls.crawlForUTMValidation(url);
  }
  await crawls.teardown();
});

Then('I start crawling all configured websites for Broken Link', { timeout: 5000000 }, async function () {
  console.log('** Starting Broken Link crawl **');
  await crawls.startBrowserAndSetup();
  for (const url of crawls.websiteList) {
    console.log(`Broken: crawling ${url}`);
    await crawls.crawlForBrokenLinks(url);
  }
  await crawls.teardown();
});

Then('I generate a UTM parameter report', { timeout: 5000000 }, async function () {
  console.log('** Generating UTM Report **');
  await crawls.generateUTMReport();
});

Then('I generate a broken link report', { timeout: 5000000 }, async function () {
  console.log('** Generating Broken Link Report **');
  await crawls.generateAllLinksReport();
});
