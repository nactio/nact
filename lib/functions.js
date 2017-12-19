const serialize = (err) =>
  JSON.stringify(err, Object.getOwnPropertyNames(err));

const stop = (actor) => {
  return actor.stop();
};

const defaultSupervisionPolicy = (child, msg, err, ctx) => {
  let serializedMsg = msg;
  try { serializedMsg = JSON.stringify(msg); } catch (e) {}
  let serializedErr = err;
  try { serializedErr = serialize(err); } catch (e) {}
  let path = child.path.toString();
  console.error(`${path}: The following error was raised when processing ${serializedMsg}:\n ${serializedErr} \nTerminating faulted actor`);
  ctx.stop();
};

const query = (actor, msg, timeout, ...args) => {
  if (!timeout) {
    throw new Error('A timeout is required to be specified');
  }
  return actor.query(msg, timeout, ...args);
};

const dispatch = (actor, ...args) => {
  return actor.dispatch(...args);
};

const state$ = (actor) => {
  return actor.state$;
};

module.exports = {
  stop,
  query,
  dispatch,
  state$,
  defaultSupervisionPolicy
};
