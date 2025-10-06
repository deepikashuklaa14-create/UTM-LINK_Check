Feature: Full Website Link & UTM Validation
  @utm
  Scenario: Crawl and validate UTM parameters only
    Then I start crawling all configured websites for UTM parameters
    Then I generate a UTM parameter report
  @broken
  Scenario: Check broken links across all configured websites
    Then I start crawling all configured websites for Broken Link
    Then I generate a broken link report

