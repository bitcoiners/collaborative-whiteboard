// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  // Exclude integration tests that start servers
  testPathIgnorePatterns: [
    '/node_modules/',
    'tests/integration/server.test.js',
    'tests/integration/brush-size.test.js',
    'tests/integration/throttled-drawing.test.js',
    'tests/integration/user-count.test.js',
    'tests/integration/socket-events.test.js',
    'tests/integration/error-handling.test.js'
  ],
  collectCoverageFrom: [
    'src/server.js',
    'public/app.js',
    'public/modules/*.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  transformIgnorePatterns: [
    '/node_modules/'
  ]
};
