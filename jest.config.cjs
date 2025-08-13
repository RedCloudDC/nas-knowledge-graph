module.exports = {
    testEnvironment: 'jsdom',
    preset: 'jest-environment-jsdom',
    extensionsToTreatAsEsm: ['.js'],
    globals: {
        'ts-jest': {
            useESM: true
        }
    },
    moduleNameMapping: {
        '^(\.{1,2}/.*)\.js$': '$1'
    },
    transform: {
        '^.+\.js$': ['babel-jest', { 
            presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
            plugins: ['@babel/plugin-transform-modules-commonjs']
        }]
    },
    transformIgnorePatterns: [
        'node_modules/(?!(.*\.mjs$))'
    ],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!src/**/maps.js',
        '!coverage/**'
    ],
    testMatch: [
        '<rootDir>/src/**/*.test.js',
        '<rootDir>/tests/**/*.test.js'
    ],
    verbose: true,
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
