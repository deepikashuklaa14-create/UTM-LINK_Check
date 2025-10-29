// module.exports = {
//   default: {
//     require: [
//       'hooks/hooks.js',
//       'features/step_definitions/utm_step.js',
//     ],
    
//     paths: ['features/**/*.feature'],
//     format: ['json:reports/cucumber_report.json', 'progress'],
//   },
// };

module.exports = {
  default: {
    require: ['hooks/hooks.js', 'features/step_definitions/**/*.js'],
    format: ['json:reports/cucumber_report.json', 'progress'],
    paths: ['features/**/*.feature'],
    publishQuiet: true,
  },
};
