const base = require('./jest.config');

module.exports = {
  ...base,
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/unit/alert.service.test.ts',
    '<rootDir>/tests/unit/ledger.service.test.ts',
  ],
};
