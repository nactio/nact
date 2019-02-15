const { start, spawn, spawnStateless, dispatch, io } = require('../lib/monad');

const function1 = function * (state, msg, ct) {
  const nextState = state ? state + '\n' + msg : msg;
  yield io(console.log, nextState);
  return nextState;
};

const function2 = (actor1) => function * (msg) {
  yield io(console.log, `Sending ${msg} to actor1's list`);
  yield dispatch(actor1, msg);
};

start(function * (sys) {
  const actor1 = yield spawn(sys, function1);
  const actor2 = yield spawnStateless(sys, function2(actor1));

  yield dispatch(actor2, 'grapes');
  yield dispatch(actor2, 'bannana');
  yield dispatch(actor2, 'chorizo');
  yield dispatch(actor2, 'pizza');
  yield dispatch(actor2, 'spaghetti');
  yield dispatch(actor2, 'paw paw');
  yield dispatch(actor2, 'granadilla');
  yield dispatch(actor2, 'coffee');
});
