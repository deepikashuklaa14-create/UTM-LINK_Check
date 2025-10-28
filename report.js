const reporter = require('multiple-cucumber-html-reporter');
const fs = require('fs');
const path = require('path');

const jsonReportPath = path.join(__dirname, 'reports', 'cucumber_report.json');
if (!fs.existsSync(jsonReportPath)) {
    console.error(`JSON report not found at ${jsonReportPath}`);
    process.exit(1);
}

reporter.generate({
    jsonDir: 'reports',
    reportPath: 'reports/html',
    metadata: {
        browser: { name: 'chrome', version: 'latest' },
        device: 'CI / Local Machine',
        platform: { name: process.platform, version: process.version },
    },
    customData: {
        title: 'Crawl and Validate Links',
        data: [
            { label: 'Project', value: 'Crawl and Validate Links' },
            { label: 'Environment', value: 'CI / Local' },
            { label: 'Run Date', value: new Date().toLocaleString() }
        ]
    },
    openReportInBrowser: false
});

console.log('✅ HTML report generated at reports/html');
