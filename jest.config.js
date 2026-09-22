const { jestConfig } = require('@salesforce/sfdx-lwc-jest/config');

module.exports = {
  ...jestConfig,
  moduleNameMapper: {
    ...jestConfig.moduleNameMapper,
    '^lightning/modal$': '<rootDir>/jest-mocks/lightning/modal',
    '^lightning/graphql$': '<rootDir>/jest-mocks/lightning/graphql',
    '^c/kpiSection$': '<rootDir>/jest-mocks/c/stub',
    '^c/priorityToDoList$': '<rootDir>/jest-mocks/c/stub',
    '^c/comingSoonTeaser$': '<rootDir>/jest-mocks/c/stub'
  }
};
