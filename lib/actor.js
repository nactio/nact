const paths = require('./paths');
const selection = require('./selection');
const Worker = require('webworker-threads').Worker;
require('./typing');

const dispatch = (worker, action, payload, sender = undefined) =>
    worker.postMessage({ action, payload, sender });

const tellEffect = (actor, message) => {
    let sender = message.payload.sender;
    let recipient = message.payload.recipient;
    if (!sender.localParts) {
        throw new TypeError("Excepted sender to be of type {localparts:string[], remotePart:?string}");
    }
    if (!recipient.localParts) {
        throw new TypeError("Excepted recipient to be of type {localparts:string[], remotePart:?string}");
    }

    const concreteRecipient = paths.actorFromReference(recipient, actor.system);


    if (concreteRecipient && !concreteRecipient.isDestroyed) {
        concreteRecipient.tell(message.payload.message, message.sender);
    } else {
        //TODO push to dead letter queue instead.
        throw new Error("Cannot find recipient");
    }
};

const destroyEffect = (actor) => {
    actor.isDestroyed = true;
    if (!actor.parent.isDestroyed && actor.parent.worker) {
        dispatch(actor.parent.worker, 'childDestroyed', { child: actor.context.name }, actor.context.self);
    }

    delete actor.parent.children[actor.context.name];
    delete actor.parent;
    actor.children.forEach(child => dispatch(child.worker, 'destroy', {}, actor.context.self));
};

const start = (f, actor, effects) => {    
    actor.worker = new Worker(`${__dirname}/actor-worker.js`);

    actor.worker.postMessage({ action: 'setFunction', payload: { f } });
    actor.worker.postMessage({ action: 'setContext', payload: actor.context });

    actor.worker.onmessage = (evt) => {
        switch (evt.data.action) {            
            case 'tell': {                
                tellEffect(actor, evt.data);
                break;
            }
            case 'destroy': {
                destroyEffect(actor);
                break;
            }
            case 'spawn': {
                spawnEffect(actor, evt.data);
                break;
            }
            case 'signalFault':{
                console.error(evt.data.payload);
                break;
            }
            default: {
                if (effects[evt.data.action]) {
                    let val = effects[evt.data.action](actor, evt.data);
                    if (val.isType(Promise)) {
                        val.then(result => dispatch(actor.worker, evt.data.action, result));
                    } else {
                        actor.worker.postMessage({ action: evt.data.action, payload: val });
                    }
                }
                break;
            }
        }
    };
};

const spawnEffect = (actor, {name, f}) => {
    
    if (typeof (name) !== 'string' || !paths.isValidName(name)) {
        throw new Error("Invalid argument: actor name may only contain the letters from a-z, dashes and digits");
    }

    let self = { localParts: [...actor.context.self.localParts, name] };
    let system = actor.system;
    let parent = actor.context.self;
    let childActor = { context: { name, self, parent }, parent: actor, system, children: {} };
    let effects = system.effects;
    start(f, childActor, effects);

    childActor.tell = (message, sender) => {
        try {
            dispatch(childActor.worker, 'tell', { message }, sender);
        } catch (e) {
            console.error(e.toString());
        }
    };

    actor.children[name] = childActor;

    if (actor.worker) {
        dispatch(actor.worker, 'childSpawned', { name, child: self }, undefined);
    }

    return childActor;
};

const bindSystem = (system) => {
    system.system = system;
    system.children = [];
    system.context = { self: { localParts: [] } };
    system.effects = Object.assign(system.effects, {
        tell: tellEffect,
        spawn: spawnEffect,
        destroy: destroyEffect
    });

    system.shutdown = () => {
        system.isDestroyed = true;
        system.children.forEach(child => destroyEffect(child, {}));
    };

    system.spawn = (f, name) => spawnEffect(system, { name, f: f + '' });    
};

exports.bindSystem = bindSystem;
