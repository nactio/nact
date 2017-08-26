const dispatch = require('./dispatcher').dispatch;
const createActorWorker = require('./workers/actor-worker').createActorWorker;
require('./typing');

const onMessage = (actor, effects) => (evt) => {        
    // NB: Very important line. This makes the promises resolve within 
    // the mailbox context. Hacky workaround===true    
    setTimeout(()=>{});

    let effect =  effects[evt.data.action];
    if (effect!==undefined) {
        let args = evt.data.args.slice();
        args.unshift(actor);
        let result = undefined;
        try {            
            result = effect.f.apply(global, args);                        
            if (effect.async) {                
                let index = evt.data.index;
                if (result.then && result.catch) {                     
                    result
                        .then(value => dispatch(actor, 'effectApplied', { index, value }))
                        .catch(err => { dispatch(actor, 'effectFailed', { index, value: serializeErr(err) })});

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
    actor.worker = createActorWorker();

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