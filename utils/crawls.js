// const { chromium } = require('playwright');
// const ExcelJS = require('exceljs');
// const { URL } = require('url');
// const fs = require('fs');
// const path = require('path');

// const websiteList = require('../data/website_url');

// const REQUIRED_UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term'];

// let browser, context, page;
// let baseUrl = '';
// const visitedPages = new Set();
// const results = [];

// // ---------- HELPERS ----------

// function ensureProtocol(raw) {
//   if (!raw) return '';
//   return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
// }

// function normalizeUrl(raw) {
//   try {
//     const u = new URL(raw);
//     const cleanPath = u.pathname.replace(/\/+$/, '');
//     return u.origin + cleanPath;
//   } catch (e) {
//     return raw;
//   }
// }

// function hasDuplicateUTMParams(u) {
//   try {
//     const urlObj = new URL(u);
//     const utms = [...urlObj.searchParams.keys()].filter(k => k.startsWith('utm_'));
//     return new Set(utms).size !== utms.length;
//   } catch (e) {
//     return false;
//   }
// }

// async function safeGoto(page, url, retries = 0) {
//   try {
//     return await page.goto(url, {
//       waitUntil: 'domcontentloaded',
//       timeout: 30000
//     });
//   } catch (e) {
//     if (retries < 2) {
//       console.warn(`⚠️ Retry ${retries + 1} for ${url}`);
//       return await safeGoto(page, url, retries + 1);
//     }
//     console.error(`❌ Failed to load ${url} after retries: ${e.message}`);
//     try {
//       const reportsDir = path.join(process.cwd(), 'reports');
//       fs.mkdirSync(reportsDir, { recursive: true });
//       const fileName = `failed_${Date.now()}.png`;
//       await page.screenshot({ path: path.join(reportsDir, fileName), fullPage: true });
//       console.log(`📸 Screenshot saved: ${fileName}`);
//     } catch (sErr) {
//       console.error(`Error saving screenshot: ${sErr.message}`);
//     }
//     return null;
//   }
// }

// // ---------- CORE CRAWL FUNCTION ----------

// async function _crawl(urlRaw, options = { mode: 'utm', homepage: '', utmParams: '' }) {
//   const url = ensureProtocol(urlRaw);
//   baseUrl = new URL(url).origin;

//   const normalizedUrl = normalizeUrl(url);
//   if (visitedPages.has(normalizedUrl)) {
//     return;
//   }
//   visitedPages.add(normalizedUrl);

//   let gotoUrl = url;
//   if (options.mode === 'utm' && normalizeUrl(url) === normalizeUrl(options.homepage)) {
//     gotoUrl = url + (url.includes('?') ? '&' : '?') + options.utmParams;
//   }

//   console.log(`➡️ Visiting: ${gotoUrl}`);
//   const response = await safeGoto(page, gotoUrl);

//   if (!response) {
//     console.warn(`🚫 No response for ${gotoUrl}`);
//     return;
//   }

//   const currentUrl = page.url();
//   console.log(`📍 Landed on: ${currentUrl}`);

//   const httpStatusCode = response.status();
//   const pageLoadStatus = response.ok() ? 'Pass' : 'Fail';
//   const isBrokenLink = !response.ok();
//   const pageTitle = await page.title();

//   let missingUTM = [], duplicateUTM = false, statusUTM = 'Skipped';

//   if (options.mode === 'utm') {
//     try {
//       const urlObj = new URL(currentUrl);
//       missingUTM = REQUIRED_UTM_PARAMS.filter(p => !urlObj.searchParams.has(p));
//       duplicateUTM = hasDuplicateUTMParams(currentUrl);
//       statusUTM = (missingUTM.length === 0 && !duplicateUTM) ? 'Pass' : 'Fail';
//     } catch (e) {
//       console.error(`Error parsing UTM from ${currentUrl}: ${e.message}`);
//     }
//   }

//   results.push({
//     url: currentUrl,
//     missingUTM,
//     duplicateUTM,
//     status: statusUTM,
//     httpStatusCode,
//     pageLoadStatus,
//     isBrokenLink,
//     pageTitle
//   });

//   await page.evaluate(() => {
//     document.querySelectorAll('a[target="_blank"]').forEach(a => a.removeAttribute('target'));
//   });

//   let links = [];
//   try {
//     links = await page.$$eval('a[href]', anchors => anchors.map(a => a.href.trim()).filter(h => !!h));
//   } catch (e) {
//     console.error(`Error extracting links from ${currentUrl}: ${e.message}`);
//   }

//   const uniqueLinks = [...new Set(links)].filter(link => {
//     try {
//       const uo = new URL(link);
//       return uo.origin === baseUrl;
//     } catch {
//       return false;
//     }
//   });

//   for (const link of uniqueLinks) {
//     await _crawl(link, options);
//     try {
//       await page.goBack({ waitUntil: 'domcontentloaded' });
//     } catch (e) {
//       console.warn(`Could not go back from ${page.url()}: ${e.message}`);
//     }
//   }
// }

// // ---------- PUBLIC MODE METHODS ----------

// async function crawlForUTMValidation(rawUrl) {
//   const url = ensureProtocol(rawUrl);
//   visitedPages.clear();

//   const utmParams = 'utm_source=test&utm_medium=automation&utm_campaign=check&utm_term=validation';

//   await _crawl(url, {
//     mode: 'utm',
//     homepage: url,
//     utmParams
//   });
// }

// async function crawlForBrokenLinks(rawUrl) {
//   const url = ensureProtocol(rawUrl);
//   visitedPages.clear();

//   await _crawl(url, { mode: 'broken' });
// }

// async function crawlForLinkExport(rawUrl) {
//   const url = ensureProtocol(rawUrl);
//   visitedPages.clear();

//   await _crawl(url, { mode: 'links' });
// }

// // ---------- BROWSER SETUP / TEARDOWN ----------

// async function startBrowserAndSetup() {
//   browser = await chromium.launch({ headless: false });
//   context = await browser.newContext();
//   page = await context.newPage();
// }

// async function teardownBrowser() {
//   if (browser) {
//     await browser.close();
//   }
// }

// // ---------- REPORTS ----------

// async function generateUTMReport() {
//   const workbook = new ExcelJS.Workbook();
//   const ws = workbook.addWorksheet('UTM Report');

//   ws.columns = [
//     { header: 'URL', key: 'url', width: 80 },
//     { header: 'Missing UTM Params', key: 'missingUTM', width: 40 },
//     { header: 'Duplicate UTM Params', key: 'duplicateUTM', width: 20 },
//     { header: 'HTTP Status Code', key: 'httpStatusCode', width: 15 },
//     { header: 'Status', key: 'status', width: 15 }
//   ];

//   results.forEach(r => {
//     if (r.status !== 'Skipped') {
//       ws.addRow({
//         url: r.url,
//         missingUTM: r.missingUTM && r.missingUTM.length ? r.missingUTM.join(', ') : 'None',
//         duplicateUTM: r.duplicateUTM ? 'Yes' : 'No',
//         httpStatusCode: r.httpStatusCode,
//         status: r.status
//       });
//     }
//   });

//   const dir = path.join(process.cwd(), 'reports');
//   fs.mkdirSync(dir, { recursive: true });
//   const filePath = path.join(dir, 'utm_report.xlsx');
//   await workbook.xlsx.writeFile(filePath);
//   console.log(`✅ UTM report saved to ${filePath}`);
// }

// // ✅ NEW: Export all links (not just broken)
// async function generateAllLinksReport() {
//   const workbook = new ExcelJS.Workbook();
//   const ws = workbook.addWorksheet('All Links');

//   ws.columns = [
//     { header: 'URL', key: 'url', width: 80 },
//     { header: 'HTTP Status Code', key: 'httpStatusCode', width: 15 },
//     { header: 'Status', key: 'pageLoadStatus', width: 15 },
//     { header: 'Page Title', key: 'pageTitle', width: 40 },
//     { header: 'Broken Link', key: 'isBrokenLink', width: 15 }
//   ];

//   results.forEach(r => {
//     ws.addRow({
//       url: r.url,
//       httpStatusCode: r.httpStatusCode,
//       pageLoadStatus: r.pageLoadStatus,
//       pageTitle: r.pageTitle || 'N/A',
//       isBrokenLink: r.isBrokenLink ? 'Yes' : 'No'
//     });
//   });

//   const dir = path.join(process.cwd(), 'reports');
//   fs.mkdirSync(dir, { recursive: true });
//   const filePath = path.join(dir, 'all_links_report.xlsx');
//   await workbook.xlsx.writeFile(filePath);
//   console.log(`✅ All links report saved to ${filePath}`);
// }

// async function generateLinksExport() {
//   const workbook = new ExcelJS.Workbook();
//   const wsInternal = workbook.addWorksheet('Internal Links');
//   const wsExternal = workbook.addWorksheet('External Links');

//   wsInternal.columns = [{ header: 'URL', key: 'url', width: 80 }];
//   wsExternal.columns = [{ header: 'URL', key: 'url', width: 80 }];

//   results.forEach(r => {
//     try {
//       const u = new URL(r.url);
//       if (u.origin === baseUrl) {
//         wsInternal.addRow({ url: r.url });
//       } else {
//         wsExternal.addRow({ url: r.url });
//       }
//     } catch (e) {
//       // skip invalid URL
//     }
//   });

//   const dir = path.join(process.cwd(), 'reports');
//   fs.mkdirSync(dir, { recursive: true });
//   const filePath = path.join(dir, 'links_export.xlsx');
//   await workbook.xlsx.writeFile(filePath);
//   console.log(`✅ Links export saved to ${filePath}`);
// }

// // ---------- EXPORTS ----------

// module.exports = {
//   websiteList,
//   crawlForUTMValidation,
//   crawlForBrokenLinks,
//   crawlForLinkExport,
//   startBrowserAndSetup,
//   teardownBrowser,
//   generateUTMReport,
//   generateAllLinksReport, // ✅ updated report
//   generateLinksExport,
//   getResults: () => results
// };



const { chromium } = require('playwright');
const ExcelJS = require('exceljs');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const websiteList = require('../data/website_url');

const REQUIRED_UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term'];

let browser, context, page;
let baseUrl = '';
const visitedPages = new Set();
const results = [];

// ---------- HELPERS ----------

function ensureProtocol(raw) {
  if (!raw) return '';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function normalizeUrl(raw) {
  try {
    const u = new URL(raw);
    const cleanPath = u.pathname.replace(/\/+$/, '');
    return u.origin + cleanPath;
  } catch (e) {
    return raw;
  }
}

function hasDuplicateUTMParams(u) {
  try {
    const urlObj = new URL(u);
    const utms = [...urlObj.searchParams.keys()].filter(k => k.startsWith('utm_'));
    return new Set(utms).size !== utms.length;
  } catch (e) {
    return false;
  }
}

async function safeGoto(page, url, retries = 0) {
  try {
    return await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
  } catch (e) {
    if (retries < 2) {
      console.warn(`⚠️ Retry ${retries + 1} for ${url}`);
      return await safeGoto(page, url, retries + 1);
    }
    console.error(`❌ Failed to load ${url} after retries: ${e.message}`);
    try {
      const reportsDir = path.join(process.cwd(), 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });
      const fileName = `failed_${Date.now()}.png`;
      await page.screenshot({ path: path.join(reportsDir, fileName), fullPage: true });
      console.log(`📸 Screenshot saved: ${fileName}`);
    } catch (sErr) {
      console.error(`Error saving screenshot: ${sErr.message}`);
    }
    return null;
  }
}

// ---------- CORE CRAWL FUNCTION ----------

async function _crawl(urlRaw, options = { mode: 'utm', homepage: '', utmParams: '' }) {
  const url = ensureProtocol(urlRaw);
  baseUrl = new URL(url).origin;

  const normalizedUrl = normalizeUrl(url);
  if (visitedPages.has(normalizedUrl)) {
    return;
  }
  visitedPages.add(normalizedUrl);

  let gotoUrl = url;
  if (options.mode === 'utm' && normalizeUrl(url) === normalizeUrl(options.homepage)) {
    gotoUrl = url + (url.includes('?') ? '&' : '?') + options.utmParams;
  }

  console.log(`➡️ Visiting: ${gotoUrl}`);
  const response = await safeGoto(page, gotoUrl);

  if (!response) {
    console.warn(`🚫 No response for ${gotoUrl}`);
    return;
  }

  const currentUrl = page.url();
  console.log(`📍 Landed on: ${currentUrl}`);

  const httpStatusCode = response.status();
  const pageLoadStatus = response.ok() ? 'Pass' : 'Fail';
  const isBrokenLink = !response.ok();

  // ✅ NEW: Get all `alt` tags from <img>
  let altTags = [];
  try {
    altTags = await page.$$eval('img[alt]', imgs =>
      imgs.map(img => img.getAttribute('alt')).filter(Boolean)
    );
  } catch (e) {
    console.error(`Error extracting alt tags from ${currentUrl}: ${e.message}`);
  }

const h1Tags = await page.$$eval('h1', headings => headings.map(h => h.textContent.trim()));
const pageAltText = h1Tags.length > 0 ? h1Tags.join(', ') : 'No H1 tags found';
  // const pageAltText = altTags.length > 0 ? altTags.join(', ') : 'No alt tags found';

  let missingUTM = [], duplicateUTM = false, statusUTM = 'Skipped';

  if (options.mode === 'utm') {
    try {
      const urlObj = new URL(currentUrl);
      missingUTM = REQUIRED_UTM_PARAMS.filter(p => !urlObj.searchParams.has(p));
      duplicateUTM = hasDuplicateUTMParams(currentUrl);
      statusUTM = (missingUTM.length === 0 && !duplicateUTM) ? 'Pass' : 'Fail';
    } catch (e) {
      console.error(`Error parsing UTM from ${currentUrl}: ${e.message}`);
    }
  }

  results.push({
    url: currentUrl,
    missingUTM,
    duplicateUTM,
    status: statusUTM,
    httpStatusCode,
    pageLoadStatus,
    isBrokenLink,
    pageTitle: pageAltText  // ✅ Replacing with alt tags
  });

  await page.evaluate(() => {
    document.querySelectorAll('a[target="_blank"]').forEach(a => a.removeAttribute('target'));
  });

  let links = [];
  try {
    links = await page.$$eval('a[href]', anchors => anchors.map(a => a.href.trim()).filter(h => !!h));
  } catch (e) {
    console.error(`Error extracting links from ${currentUrl}: ${e.message}`);
  }

  const uniqueLinks = [...new Set(links)].filter(link => {
    try {
      const uo = new URL(link);
      return uo.origin === baseUrl;
    } catch {
      return false;
    }
  });

  for (const link of uniqueLinks) {
    await _crawl(link, options);
    try {
      await page.goBack({ waitUntil: 'domcontentloaded' });
    } catch (e) {
      console.warn(`Could not go back from ${page.url()}: ${e.message}`);
    }
  }
}

// ---------- PUBLIC MODE METHODS ----------

async function crawlForUTMValidation(rawUrl) {
  const url = ensureProtocol(rawUrl);
  visitedPages.clear();

  const utmParams = 'utm_source=test&utm_medium=automation&utm_campaign=check&utm_term=validation';

  await _crawl(url, {
    mode: 'utm',
    homepage: url,
    utmParams
  });
}

async function crawlForBrokenLinks(rawUrl) {
  const url = ensureProtocol(rawUrl);
  visitedPages.clear();

  await _crawl(url, { mode: 'broken' });
}

async function crawlForLinkExport(rawUrl) {
  const url = ensureProtocol(rawUrl);
  visitedPages.clear();

  await _crawl(url, { mode: 'links' });
}

// ---------- BROWSER SETUP / TEARDOWN ----------

async function startBrowserAndSetup() {
  browser = await chromium.launch({ headless: false });
  context = await browser.newContext();
  page = await context.newPage();
}

async function teardownBrowser() {
  if (browser) {
    await browser.close();
  }
}

// ---------- REPORTS ----------

async function generateUTMReport() {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('UTM Report');

  ws.columns = [
    { header: 'URL', key: 'url', width: 80 },
    { header: 'Missing UTM Params', key: 'missingUTM', width: 40 },
    { header: 'Duplicate UTM Params', key: 'duplicateUTM', width: 20 },
    { header: 'HTTP Status Code', key: 'httpStatusCode', width: 15 },
    { header: 'Status', key: 'status', width: 15 }
  ];

  results.forEach(r => {
    if (r.status !== 'Skipped') {
      ws.addRow({
        url: r.url,
        missingUTM: r.missingUTM && r.missingUTM.length ? r.missingUTM.join(', ') : 'None',
        duplicateUTM: r.duplicateUTM ? 'Yes' : 'No',
        httpStatusCode: r.httpStatusCode,
        status: r.status
      });
    }
  });

  const dir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'utm_report.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ UTM report saved to ${filePath}`);
}

async function generateAllLinksReport() {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('All Links');

  ws.columns = [
    { header: 'URL', key: 'url', width: 80 },
    { header: 'HTTP Status Code', key: 'httpStatusCode', width: 15 },
    { header: 'Status', key: 'pageLoadStatus', width: 15 },
    { header: 'Alt Tags (from images)', key: 'pageTitle', width: 50 }, // ✅ Updated
    { header: 'Broken Link', key: 'isBrokenLink', width: 15 }
  ];

  results.forEach(r => {
    ws.addRow({
      url: r.url,
      httpStatusCode: r.httpStatusCode,
      pageLoadStatus: r.pageLoadStatus,
      pageTitle: r.pageTitle || 'No alt tags found',
      isBrokenLink: r.isBrokenLink ? 'Yes' : 'No'
    });
  });

  const dir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'all_links_report.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ All links report saved to ${filePath}`);
}

async function generateLinksExport() {
  const workbook = new ExcelJS.Workbook();
  const wsInternal = workbook.addWorksheet('Internal Links');
  const wsExternal = workbook.addWorksheet('External Links');

  wsInternal.columns = [{ header: 'URL', key: 'url', width: 80 }];
  wsExternal.columns = [{ header: 'URL', key: 'url', width: 80 }];

  results.forEach(r => {
    try {
      const u = new URL(r.url);
      if (u.origin === baseUrl) {
        wsInternal.addRow({ url: r.url });
      } else {
        wsExternal.addRow({ url: r.url });
      }
    } catch (e) {
      // skip invalid URL
    }
  });

  const dir = path.join(process.cwd(), 'reports');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'links_export.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ Links export saved to ${filePath}`);
}

// ---------- EXPORTS ----------

module.exports = {
  websiteList,
  crawlForUTMValidation,
  crawlForBrokenLinks,
  crawlForLinkExport,
  startBrowserAndSetup,
  teardownBrowser,
  generateUTMReport,
  generateAllLinksReport, // ✅ updated report
  generateLinksExport,
  getResults: () => results
};
