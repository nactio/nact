const paths = require('./paths');
const dispatch = require('./dispatcher').dispatch;
const start = require('./actor').start;

exports.tell = {
    f: (actor, recipient, message, sender) => {
        sender = sender || actor.context.self;

        const concreteRecipient = paths.actorFromReference(recipient, actor.system);

        if (concreteRecipient && !concreteRecipient.isDestroyed) {
            dispatch(concreteRecipient, 'tell', { message, sender }, actor.context.self);
        }
    }
}

exports.destroy = {
    f: (actor) => {
        actor.isDestroyed = true;
        if (actor.parent && !actor.parent.isDestroyed && actor.parent.worker) {
            dispatch(actor.parent, 'childDestroyed', { child: actor.context.name }, actor.context.self);
        }

        delete actor.parent.children[actor.context.name];
        delete actor.parent;
        actor.children.forEach(child => dispatch(child, 'destroy', {}, actor.context.self));
    }
};

exports.spawn = {
    async: true,
    f: (actor, f, name) => {
        if (typeof (name) !== 'string' || !paths.isValidName(name)) {
            throw new Error("Invalid argument: actor name may only contain the letters from a-z, dashes and digits");
        }

        let self = { localParts: [...actor.context.self.localParts, name] };
        let system = actor.system;
        let parent = actor.context.self;

        let childActor = { context: { name, self, parent }, parent: actor, system, children: {} };
        let effects = actor.system.effects;

        start(f, childActor, effects);

        childActor.tell = (message, sender) => {
            try {
                dispatch(childActor, 'tell', { message, sender }, childActor.context.self);
            } catch (e) {
                console.error(e.toString());
            }
        };

        childActor.spawn = (f, name) => exports.spawn.f(childActor, f + '', name);
        childActor.spawnSimple = (f, name) => exports.spawnSimple.f(childActor, f, name);
        childActor.destroy = () => exports.destroy.f(childActor);
        
        actor.children[name] = childActor;

        if (actor.worker) {
            dispatch(actor, 'childSpawned', { name, child: self });
        }

        return childActor;
    }
};


exports.spawnSimple = {
    async: true,
    f: (actor, f, name) => {
        let simpleF = `() => function wrapper(ctx, msg) {
        let f = ${f + ''};        

        let result = f(ctx, msg);        
        
        if (Promise.resolve(result) == result) {            
            return result.then((r) => r !== false ? wrapper : undefined);
        } else if(result !== false){            
            return wrapper;
        }
    };`

        return exports.spawn.f(actor, simpleF, name);
    }
};