/**
 * Shared Jest configuration. Each package extends this via its own jest.config.cjs:
 *
 *   const base = require("../../jest.config.base.cjs");
 *   module.exports = { ...base, rootDir: __dirname };
 *
 * Notes:
 * - Packages use Node ESM (NodeNext) at build time, so source imports use `.js`
 *   extensions (TypeScript convention with NodeNext). For Jest we transpile to
 *   CommonJS via ts-jest's inline tsconfig override, and strip the `.js` from
 *   relative imports so Jest's resolver can find the .ts source files.
 * - This setup means tests run in CommonJS mode regardless of package "type",
 *   which is the path of least friction with ts-jest.
 */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/test/**/*.test.ts", "**/src/**/*.test.ts"],
  // e2e tests live under <package>/test/e2e/ and are run via the separate
  // jest.e2e.config.cjs (which requires Postgres). The default unit test
  // run stays infra-free.
  testPathIgnorePatterns: ["/node_modules/", "\\.e2e\\.test\\.ts$"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    // Strip the `.js` extension from relative imports so Jest resolves to the
    // .ts source files. Build-time tsc still needs the .js extensions (NodeNext).
    "^(\\.{1,2}/.*)\\.js$": "$1",
    // Workspace package: resolve @sms/core-logic to its TS source so ts-jest
    // transpiles it inline. The published dist/ is ESM and would otherwise
    // fail to load in jest's CommonJS mode.
    "^@sms/core-logic$": "<rootDir>/../../packages/core-logic/src/index.ts",
    "^@sms/core-logic/(.*)$": "<rootDir>/../../packages/core-logic/src/$1",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/index.ts",
    "!src/**/*.d.ts",
    // Entities are TypeORM metadata + decorators — no testable behaviour.
    // Their correctness is verified by running migrations against Postgres.
    "!src/**/*.entity.ts",
    // Migrations are SQL strings inside up()/down() — exercised by running
    // them, not by Jest. Cover them via an integration-test suite later.
    "!src/database/migrations/*.ts",
    // NestJS framework wiring — no testable business logic:
    //   modules    = DI declarations
    //   main.ts    = bootstrap
    //   *.dto.ts   = class-validator decorator metadata
    //   decorators = parameter decorators; covered via integration tests
    //   controllers = thin HTTP wiring; covered by e2e/supertest later
    //   jwt-auth.guard.ts = one-line wrapper around AuthGuard("jwt")
    "!src/**/*.module.ts",
    "!src/main.ts",
    "!src/**/*.dto.ts",
    "!src/**/*.decorator.ts",
    "!src/**/*.controller.ts",
    "!src/auth/jwt-auth.guard.ts",
    // WebSocket gateway — covered by e2e socket tests, not unit tests
    "!src/**/*.gateway.ts",
    // Seed / one-off CLI scripts under src/database
    "!src/database/seed.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // Force CommonJS output for tests, independent of the package's "type"
        // field. Source files still build to ESM via the package tsconfig.
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          target: "ES2022",
          esModuleInterop: true,
          strict: true,
          isolatedModules: true,
          skipLibCheck: true,
          resolveJsonModule: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
        diagnostics: true,
      },
    ],
  },
};
