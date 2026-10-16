module.exports = {
  preset: 'jest-preset-angular',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  moduleNameMapper: {
    // Ionic's real package cannot be loaded by Jest; see src/testing/ionic-angular.stub.ts.
    '^@ionic/angular$': '<rootDir>/src/testing/ionic-angular.stub.ts',
  },
  // Angular ships ES modules, so they have to be transformed for Jest.
  transformIgnorePatterns: ['node_modules/(?!(@angular|@ionic|@stencil|ionicons)/)'],
};
