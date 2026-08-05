/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/tests/unit/alert.service.test.ts',
    '<rootDir>/tests/unit/ledger.service.test.ts',
  ],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  passWithNoTests: true,
  testTimeout: 10_000,
  coverageDirectory: '<rootDir>/coverage/unit',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/index.ts'],
  transformIgnorePatterns: [
    '/node_modules/(?!(@otplib|otplib|@scure|@noble)/)',
  ],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },
};
