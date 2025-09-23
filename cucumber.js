module.exports = {
  default: [
    
    '--require features/step_definitions/**/*.js',
    '--require hooks/**/*.js',
    '--format json:reports/cucumber_report.json',
    '--format progress-bar',
    '--tags "not @skip"',
    '--retry 0',
    '--parallel 1',        // Important for video
  ].join(' ')
};