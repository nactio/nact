const LOG = Symbol('log');

const logNothing = () => ({
  action: LOG,
  channel: 'nothing'
});

const logToConsole = () => ({
  action: LOG,
  channel: 'console'
});

module.exports = {
  logNothing,
  logToConsole,
  LOG
};
