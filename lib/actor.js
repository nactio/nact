const paths = require('./paths');
const selection = require('./selection');
const Worker = require('webworker-threads').Worker;
require('./typing');

const dispatch = (worker, action, payload, sender = undefined) =>
    worker.postMessage({ action, payload, sender });

const tellEffect = (actor, recipient, message) => {
    let sender = actor.context.self;    
    const concreteRecipient = paths.actorFromReference(recipient, actor.system);

    if (concreteRecipient && !concreteRecipient.isDestroyed) {
        concreteRecipient.tell(message, sender);
    }
};

const destroyEffect = (actor) => {
    actor.isDestroyed = true;
    if (actor.parent && !actor.parent.isDestroyed && actor.parent.worker) {
        dispatch(actor.parent.worker, 'childDestroyed', { child: actor.context.name }, actor.context.self);
    }

    delete actor.parent.children[actor.context.name];
    delete actor.parent;
    actor.children.forEach(child => dispatch(child.worker, 'destroy', {}, actor.context.self));
};

const start = (f, actor, effects) => {
    actor.worker = new Worker(`${__dirname}/actor-worker.js`);

    actor.worker.postMessage({ action: 'initialize', payload: Object.assign({}, actor.context, { f, effects }) });

    actor.worker.onmessage = (evt) => {        
        if (effects[evt.data.action]) {
            let args = event.data.args.slice().unshift(actor);
            effects[evt.data.action].apply(actor, args);            
        }
    };
};

const spawnEffect = (actor, f, name) => {

    if (typeof (name) !== 'string' || !paths.isValidName(name)) {
        throw new Error("Invalid argument: actor name may only contain the letters from a-z, dashes and digits");
    }

    let self = { localParts: [...actor.context.self.localParts, name] };
    let system = actor.system;
    let parent = actor.context.self;
    let childActor = { context: { name, self, parent }, parent: actor, system, children: {} };
    let effects = system.effects;    
    start(f, childActor, Object.keys(effects));

    childActor.tell = (message, recipient) => {
        try {
            dispatch(childActor.worker, 'tell', {message, recipient});
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

    system.spawn = (f, name) => spawnEffect(system, f + '', name);
};

exports.bindSystem = bindSystem;
