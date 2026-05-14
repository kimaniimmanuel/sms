const base = require("../../jest.config.base.cjs");

/**
 * E2E config — bootstraps the real NestJS app against $DATABASE_URL.
 * Requires Postgres to be running and migrations applied.
 *
 * Coverage thresholds are intentionally absent: e2e tests prove behaviour,
 * not coverage. Unit tests are responsible for coverage in `jest.config.cjs`.
 */
const { testMatch: _omit, ...rest } = base;

module.exports = {
  ...rest,
  rootDir: __dirname,
  testRegex: ".*\\.e2e\\.test\\.ts$",
  testPathIgnorePatterns: ["/node_modules/"],
  coverageThreshold: undefined,
  collectCoverageFrom: [],
  testTimeout: 30000,
};
