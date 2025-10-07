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
const visitedLinks = new Set();
const results = [];

let workbook, sheet, reportFilePath;

function ensureProtocol(raw) {
  if (!raw) return '';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function normalizeUrl(raw) {
  try {
    const u = new URL(raw);
    const cleanPath = u.pathname.replace(/\/+$/, '');
    return u.origin + cleanPath;
  } catch {
    return raw;
  }
}

function hasDuplicateUTMParams(u) {
  try {
    const urlObj = new URL(u);
    const utms = [...urlObj.searchParams.keys()].filter(k => k.startsWith('utm_'));
    return new Set(utms).size !== utms.length;
  } catch {
    return false;
  }
}

async function safeGoto(page, url, retries = 0) {
  try {
    return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (e) {
    if (retries < 2) {
      console.warn(`Retry ${retries + 1} for ${url}`);
      return await safeGoto(page, url, retries + 1);
    }
    console.error(`❌ Failed to load ${url}: ${e.message}`);
    try {
      const reportsDir = path.join(process.cwd(), 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });
      const fileName = `failed_${Date.now()}.png`;
      await page.screenshot({ path: path.join(reportsDir, fileName), fullPage: true });
      console.log(`📸 Screenshot saved: ${fileName}`);
    } catch (sErr) {
      console.error(`⚠️ Error saving screenshot: ${sErr.message}`);
    }
    return null;
  }
}

async function initExcelReport(mode = 'utm') {
  workbook = new ExcelJS.Workbook();
  sheet = workbook.addWorksheet(mode === 'utm' ? 'UTM Validation' : 'All Links');

  const columns = mode === 'utm'
    ? [
        { header: 'URL', key: 'url', width: 80 },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Missing UTM Parameters', key: 'missingUTM', width: 40 },
        { header: 'Duplicate UTM Parameters', key: 'duplicateUTM', width: 20 },
        { header: 'Page Load Status', key: 'pageLoadStatus', width: 20 },
        { header: 'HTTP Status Code', key: 'httpStatusCode', width: 20 },
        { header: 'Broken Link', key: 'isBrokenLink', width: 20 },
        { header: 'Page Title', key: 'pageTitle', width: 40 },
        { header: 'Link Type', key: 'type', width: 20 }
      ]
    : [
        { header: 'URL', key: 'url', width: 80 },
        { header: 'Link Type', key: 'type', width: 20 },
        { header: 'HTTP Status Code', key: 'httpStatusCode', width: 20 },
        { header: 'Page Load Status', key: 'pageLoadStatus', width: 20 },
        { header: 'Broken Link', key: 'isBrokenLink', width: 20 },
        { header: 'Page Title', key: 'pageTitle', width: 40 }
      ];

  sheet.columns = columns;

  sheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const domain = new URL('https://placeholder.com').hostname.replace(/\./g, '_');
  const fileName = `${mode}_live_export_${domain}_${Date.now()}.xlsx`;
  reportFilePath = path.join(process.cwd(), 'reports', fileName);
  fs.mkdirSync(path.dirname(reportFilePath), { recursive: true });

  await workbook.xlsx.writeFile(reportFilePath);
}

async function appendToExcel(rowData) {
  if (!sheet || !reportFilePath) return;

  if (Array.isArray(rowData.missingUTM)) {
    rowData.missingUTM = rowData.missingUTM.length ? rowData.missingUTM.join(', ') : '';
  }
  if (typeof rowData.duplicateUTM === 'boolean') {
    rowData.duplicateUTM = rowData.duplicateUTM ? 'Yes' : 'No';
  }
  if (typeof rowData.isBrokenLink === 'boolean') {
    rowData.isBrokenLink = rowData.isBrokenLink ? 'Yes' : 'No';
  }

  const row = sheet.addRow(rowData);

  // Apply conditional formatting based on Pass/Fail
  const applyColor = (cell, value) => {
    if (value === 'Pass') {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFCCFFCC' } // green
      };
    } else if (value === 'Fail') {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFC7CE' } // red
      };
    }
  };

  row.eachCell((cell, colNumber) => {
    const key = sheet.columns[colNumber - 1]?.key;
    const value = rowData[key];
    if (['status', 'pageLoadStatus'].includes(key)) {
      applyColor(cell, value);
    }
    if (key === 'isBrokenLink' && (value === 'Yes' || value === 'No')) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: value === 'Yes' ? 'FFFFC7CE' : 'FFCCFFCC' }
      };
    }
  });

  const tempPath = reportFilePath + '.tmp';
  await workbook.xlsx.writeFile(tempPath);
  fs.renameSync(tempPath, reportFilePath);
}

async function _crawl(urlRaw, options = { mode: 'utm', homepage: '', utmParams: '' }) {
  const url = ensureProtocol(urlRaw);
  baseUrl = new URL(url).origin;

  const normalizedUrl = normalizeUrl(url);
  if (visitedPages.has(normalizedUrl)) return;
  visitedPages.add(normalizedUrl);

  let gotoUrl = url;
  const isHomepage = normalizeUrl(url) === normalizeUrl(options.homepage);

  if (options.mode === 'utm' && isHomepage) {
    gotoUrl = url + (url.includes('?') ? '&' : '?') + options.utmParams;
  }

  console.log(`➡️ Visiting: ${gotoUrl}`);
  const response = await safeGoto(page, gotoUrl);
  if (!response) {
    const failRow = {
      url: gotoUrl,
      status: 'Fail',
      missingUTM: REQUIRED_UTM_PARAMS.join(', '),
      duplicateUTM: 'N/A',
      httpStatusCode: 'N/A',
      pageLoadStatus: 'Fail',
      isBrokenLink: true,
      pageTitle: '',
      type: options.mode === 'utm' ? 'internal' : ''
    };
    results.push(failRow);
    await appendToExcel(failRow);
    return;
  }

  try {
    await page.evaluate(() => {
      document.querySelectorAll('a[target="_blank"]').forEach(a => a.removeAttribute('target'));
    });
  } catch (err) {
    console.warn('⚠️ Skipping target removal:', err.message);
  }

  const currentUrl = page.url();
  const httpStatusCode = response.status();
  const pageLoadStatus = response.ok() ? 'Pass' : 'Fail';
  const isBrokenLink = !response.ok();

  const h1Tags = await page.$$eval('h1', headings => headings.map(h => h.textContent.trim()));
  const pageTitle = h1Tags.length ? h1Tags.join(', ') : 'Title Not Found';

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

  const row = {
    url: currentUrl,
    status: statusUTM,
    missingUTM,
    duplicateUTM,
    httpStatusCode,
    pageLoadStatus,
    isBrokenLink,
    pageTitle,
    type: options.mode === 'utm' ? (new URL(currentUrl).origin === baseUrl ? 'internal' : 'external') : undefined
  };

  if (options.mode !== 'utm' || !results.some(r => r.url === row.url)) {
    results.push(row);
    await appendToExcel(row);
  }

  let links = [];
  try {
    links = await page.$$eval('a[href]', anchors =>
      anchors.map(a => a.href.trim()).filter(h => h && h.startsWith('http'))
    );
  } catch (e) {
    console.error(`Error extracting links: ${e.message}`);
  }

  const uniqueLinks = [...new Set(links)].filter(link => {
    return !visitedLinks.has(normalizeUrl(link)) && normalizeUrl(link) !== normalizeUrl(currentUrl);
  });

  for (const link of uniqueLinks) {
    const normalizedLink = normalizeUrl(link);
    if (visitedLinks.has(normalizedLink)) continue;
    visitedLinks.add(normalizedLink);

    const isInternal = new URL(link).origin === baseUrl;

    if (options.mode === 'utm') {
      if (!results.some(r => r.url === link)) {
        let tempStatus = 'Pass', tempMissing = [], tempDuplicate = false;
        try {
          const urlObj = new URL(link);
          tempMissing = REQUIRED_UTM_PARAMS.filter(p => !urlObj.searchParams.has(p));
          tempDuplicate = hasDuplicateUTMParams(link);
          tempStatus = (tempMissing.length === 0 && !tempDuplicate) ? 'Pass' : 'Fail';
        } catch {}

        const linkRow = {
          url: link,
          status: tempStatus,
          missingUTM: tempMissing,
          duplicateUTM: tempDuplicate,
          httpStatusCode: '',
          pageLoadStatus: '',
          isBrokenLink: false,
          pageTitle: '',
          type: isInternal ? 'internal' : 'external'
        };

        results.push(linkRow);
        await appendToExcel(linkRow);
      }

      if (isInternal) {
        await _crawl(link, options);
      }
    } else if (options.mode === 'broken' || options.mode === 'links') {
      if (isInternal) {
        await _crawl(link, options);
      } else {
        const newPage = await context.newPage();
        let httpCode = 0, linkStatus = 'Fail', linkTitle = '';
        try {
          const res = await safeGoto(newPage, link);
          if (res) {
            linkStatus = res.ok() ? 'Pass' : 'Fail';
            httpCode = res.status();
            const h1s = await newPage.$$eval('h1', hs => hs.map(h => h.textContent.trim()));
            linkTitle = h1s.length ? h1s.join(', ') : 'Title Not Found';
          }
        } catch {}
        await newPage.close();

        const extRow = {
          url: link,
          type: 'external',
          httpStatusCode: httpCode,
          pageLoadStatus: linkStatus,
          pageTitle: linkTitle,
          isBrokenLink: linkStatus === 'Fail'
        };

        results.push(extRow);
        await appendToExcel(extRow);
      }
    }
  }
}

async function crawlForUTMValidation(rawUrl) {
  const url = ensureProtocol(rawUrl);
  visitedPages.clear();
  visitedLinks.clear();
  results.length = 0;
  await initExcelReport('utm');
  const utmParams = 'utm_source=test&utm_medium=automation&utm_campaign=check&utm_term=validation';
  await _crawl(url, { mode: 'utm', homepage: url, utmParams });
}

async function crawlForBrokenLinks(rawUrl) {
  const url = ensureProtocol(rawUrl);
  visitedPages.clear();
  visitedLinks.clear();
  results.length = 0;
  await initExcelReport('broken');
  await _crawl(url, { mode: 'broken' });
}

async function crawlForLinkExport(rawUrl) {
  const url = ensureProtocol(rawUrl);
  visitedPages.clear();
  visitedLinks.clear();
  results.length = 0;
  await initExcelReport('links');
  await _crawl(url, { mode: 'links' });
}

async function startBrowserAndSetup() {
  browser = await chromium.launch({ headless: false });
  context = await browser.newContext();
  page = await context.newPage();
}

async function teardown() {
  await browser?.close();
}

async function generateUTMReport() {
  console.log('✅ UTM report was generated during crawling.');
}

async function generateAllLinksReport() {
  console.log('✅ Broken/all links report was generated during crawling.');
}

module.exports = {
  crawlForUTMValidation,
  crawlForBrokenLinks,
  crawlForLinkExport,
  startBrowserAndSetup,
  generateUTMReport,
  generateAllLinksReport,
  teardown,
  websiteList
};
