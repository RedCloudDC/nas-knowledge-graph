module.exports = {
    testEnvironment: 'jsdom',
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!coverage/**'
    ],
    testMatch: [
        '<rootDir>/src/**/*.test.js',
        '<rootDir>/tests/**/*.test.js'
    ],
    verbose: true,
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
