module.exports = {
    testEnvironment: 'jsdom',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        '*.js',
        '!node_modules/**',
        '!dist/**',
        '!*.config.js'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    testMatch: [
        '**/tests/**/*.test.js',
        '**/__tests__/**/*.js'
    ],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
