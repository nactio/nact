module.exports = {
  globals: {
    'ts-jest': {
      diagnostics: true,
    },
  },
  moduleFileExtensions: ['ts', 'js'],
  testEnvironment: 'node',
  testRegex: '\\.test\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
}
