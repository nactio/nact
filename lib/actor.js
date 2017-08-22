const dispatch = require('./dispatcher').dispatch;
const Worker = require('webworker-threads').Worker;

const onMessage = (actor, effects) => (evt) => {
    if (effects[evt.data.action]) {
        let args = evt.data.args.slice();
        args.unshift(actor);
        effects[evt.data.action].apply(this, args);
    }
};

const sendInitialPayload = (actor, payload) =>
    dispatch(actor, 'initialize', payload);
    
exports.start = (f, actor, effects) => {
    actor.worker = new Worker(`${__dirname}/actor-worker.js`);
    
    const initialPayload = Object.assign({}, actor.context);
    initialPayload.f = f;
    initialPayload.effects = Object.keys(effects);

    sendInitialPayload(actor,initialPayload);

    actor.worker.onmessage = onMessage(actor, effects);
};