/* eslint-env mocha */
/* eslint-disable no-unused-expressions */
const chai = require('chai');
chai.should();
const {
  LogLevel,
  LogEvent,
  ConsoleLoggingEngine,
} = require('../lib/monitoring');

const {
  logLevelToString,
  AbstractLoggingEngine,
  NoopLoggingEngine,
  noopLoggingEngine
} = require('../lib/monitoring/logging-engine');
