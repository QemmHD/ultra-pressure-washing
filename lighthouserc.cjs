"use strict";

module.exports = {
  ci: {
    assert: {
      includePassedAssertions: true,
      assertions: {
        "categories:performance": [
          "error",
          { minScore: 1, aggregationMethod: "pessimistic" },
        ],
        "categories:accessibility": [
          "error",
          { minScore: 1, aggregationMethod: "pessimistic" },
        ],
        "categories:best-practices": [
          "error",
          { minScore: 1, aggregationMethod: "pessimistic" },
        ],
        "categories:seo": [
          "error",
          { minScore: 1, aggregationMethod: "pessimistic" },
        ],
        "largest-contentful-paint": [
          "error",
          { maxNumericValue: 2500, aggregationMethod: "pessimistic" },
        ],
        "cumulative-layout-shift": [
          "error",
          { maxNumericValue: 0.099, aggregationMethod: "pessimistic" },
        ],
        "total-blocking-time": [
          "error",
          { maxNumericValue: 199, aggregationMethod: "pessimistic" },
        ],
      },
    },
  },
};
