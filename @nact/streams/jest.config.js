module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transformIgnorePatterns: [
    '<rootDir>/vendored/macrotask/*.js'
  ]
};
