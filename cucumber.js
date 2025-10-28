module.exports = {
  default: {
    require: [
      'hooks/hooks.js',
      'features/step_definitions/*.js',
    ],
    // format: ['json:./reports/cucumber-report.json'],
    paths: ['features/**/*.feature'],
    default: `--format json:reports/cucumber_report.json`,
  },
};
