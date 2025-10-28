module.exports = {
  default: {
    require: [
      'hooks/hooks.js',
      'features/step_definitions/utm_steps.js',
    ],
    
    paths: ['features/utm_check.feature'],
    default: `--format json:reports/cucumber_report.json`,
  },
};
