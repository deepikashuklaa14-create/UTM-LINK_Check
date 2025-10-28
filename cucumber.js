module.exports = {
  default: {
    require: [
      'hooks/hooks.js',
      'features/step_definitions/utm_step.js',
    ],
    
    paths: ['features/**/*.feature'],
    default: `--format json:reports/cucumber_report.json`,
  },
};
