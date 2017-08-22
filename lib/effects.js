const paths = require('./paths');
const dispatch = require('./dispatcher').dispatch;
const start = require('./actor').start;

exports.tell = (actor, recipient, message, sender) => {    
    sender = sender || actor.context.self;    

    const concreteRecipient = paths.actorFromReference(recipient, actor.system);

    if (concreteRecipient && !concreteRecipient.isDestroyed) {
        dispatch(concreteRecipient, 'tell', { message, sender }, actor.context.self);        
    }
};

exports.destroy = (actor) => {
    actor.isDestroyed = true;
    if (actor.parent && !actor.parent.isDestroyed && actor.parent.worker) {
        dispatch(actor.parent, 'childDestroyed', { child: actor.context.name }, actor.context.self);
    }

    delete actor.parent.children[actor.context.name];
    delete actor.parent;
    actor.children.forEach(child => dispatch(child, 'destroy', {}, actor.context.self));
};

exports.spawn = (actor, f, name) => {    
    if (typeof (name) !== 'string' || !paths.isValidName(name)) {
        throw new Error("Invalid argument: actor name may only contain the letters from a-z, dashes and digits");
    }
    
    let self = { localParts: [...actor.context.self.localParts, name] };
    let system = actor.system;    
    let parent = actor.context.self;
    
    let childActor = { context: { name, self, parent }, parent: actor, system, children: {} };
    
    start(f, childActor, actor.system.effects);

    childActor.tell = (message, sender) => {
        try {            
            dispatch(childActor,'tell', { message, sender }, childActor.context.self);
        } catch (e) {
            console.error(e.toString());
        }
    };

    childActor.spawn = (f, name) => spawnEffect(childActor, f + '', name);

    actor.children[name] = childActor;
    
    if (actor.worker) {
        dispatch(actor, 'childSpawned', { name, child: self }, undefined);
    }
    
    return childActor;
};