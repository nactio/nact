const dispatch = require('./dispatcher').dispatch;
const Worker = require('webworker-threads').Worker;

const serializeErr = err => JSON.stringify(err, Object.getOwnPropertyNames(err));

const onMessage = (actor, effects) => (evt) => {
    let effect =  effects[evt.data.action];
    if (effect!==undefined) {
        let args = evt.data.args.slice();
        args.unshift(actor);
        let result = undefined;
        try {      
            result = effect.f.apply(this, args);
            if (effect.async) {
                let index = evt.data.index;
                if (Promise.resolve(result) == result) {
                    result.then(value => dispatch(actor, 'effectApplied', { index, value }))
                          .catch(err => dispatch(actor, 'effectApplied', { index, value: serializeErr(err) }));
                } else {
                    dispatch(actor, 'effectApplied', { value: result, index });
                }
            }
        } catch (e) {
            console.log(serializeErr(e));
            if (effect.async) {
                let index = evt.data.index;
                dispatch(actor, 'effectFailed', { value: serializeErr(e), index });
            }
        }
    }
};

const sendInitialPayload = (actor, payload) =>
    dispatch(actor, 'initialize', payload);


exports.start = (f, actor, effects) => {
    actor.worker = new Worker(`${__dirname}/actor-worker.js`);

    const initialPayload = Object.assign({}, actor.context);
    initialPayload.f = f;

    let effectsReducer = (prev, effect) => {
         prev.push({ effect, async: !!(effects[effect].async) });
        return prev;
    };

    initialPayload.effects = Object.keys(effects).reduce(effectsReducer, []);

    sendInitialPayload(actor, initialPayload);

    actor.worker.onmessage = onMessage(actor, effects);
};