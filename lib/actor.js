const Mailbox = require('./mailbox').Mailbox;
const paths = require('./paths');
const selection = require('./selection');
const Worker = require('webworker-threads').Worker;
require('./typing');
require('./actions');

const tellEffect = (actor, message) => {
    let sender = message.sender;
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
        actor.parent.worker.postMessage({ action: actions.CHILD_DESTROYED, sender: actor.context.self, payload: { child: actor.context.name } });
    }

    delete actor.parent.children[actor.context.name];
    delete actor.parent;
    actor.children.forEach(child => child.worker.postMessage({ action: actions.DESTROY, sender: actor.context.self, payload: {} }));
};

const spawnEffect = (actor, command) => {
    let name = command.name;
    let f = command.f;

    if (typeof (name) !== 'string' || !paths.isValidName(name)) {
        throw new Error("Invalid argument: actor name may only contain the letters from a-z, dashes and digits");
    }

    let self = { localParts: [...actor.context.self.localParts, name] };
    let system = actor.system;
    let parent = actor.context.self;
    let childActor = { context: Object.freeze({ name, self, parent }), parent: actor, system, children: {} };
    let effects = system.effects;
    start(f, childActor, effects);
    childActor.tell = (message, sender) => {
        try {
            childActor.worker.postMessage({ action: 'RECEIVE_MESSAGE', sender, payload: { message } });
        } catch (e) {
            console.log(e.toString());
        }
    };
    actor.children[name] = childActor;
    if (actor.worker) {
        actor.worker.postMessage({ action: 'CHILD_SPAWNED', payload: { name, child: self } });
    }
    return childActor;
};

const start = (f, actor, effects) => {
    actor.worker = new Worker(function () {
        // Helper functions for type introspection
        Object.prototype.isType = function (t) { return t.name === Object.getPrototypeOf(this).constructor.name };
        Object.prototype.typeName = function () { return Object.getPrototypeOf(this).constructor.name; };

        let error = {};
        let context = undefined;
        let f = undefined;

        class ActorMailbox {
            constructor() { }

            push(item) {
                const nextTail = { item };
                if (this.last) {
                    let prevTail = this.last;
                    prevTail.next = nextTail;
                    this.last = nextTail;
                } else {
                    this.first = nextTail;
                    this.last = nextTail;
                }
            }

            isEmpty() { return this.first !== undefined; }

            peek() { return this.first ? this.first.item : undefined; }

            pop() {
                if (this.first) {
                    const item = this.first.item;
                    if (this.first !== this.last) {
                        this.first = this.first.next;
                    } else {
                        mailbox.head = undefined;
                        mailbox.tail = undefined;
                    }
                    return item;
                } else {
                    throw new Error("Attempted illegal operation: Empty mailbox cannot be popped");
                }
            }
        }

        class EffectsSubscription {
            constructor(effect, subscriptions, f) {
                this.effect = effect;
                this.subscriptions = subscriptions;
                this.f = f;
            }
            then(f) { return new EffectSuccessHandler(this, [...this.subscriptions, this], f); }
            error(f) { return new EffectErrorSubscription(this, [...this.subscriptions, this], f); }
        }


        class EffectErrorSubscription extends EffectsSubscription {
            constructor(effect, subscriptions, f) {
                super(effect, subscriptions, f);
            }

            invoke(result) {
                if (result.success) {
                    let fThen = f(result.data);
                    if (fThen.isType(Effect)) {
                        
                    } 
                    else if (fThen.isType(Function)) { 
                        
                    }
                }
            }
        }

        class EffectSuccessSubscription extends EffectsSubscription {
            constructor(effect, subscriptions, f) {
                super(effect, subscriptions, f);
            }
        }

        let effectCounter = 0;
        class Effect {
            constructor(effect) {
                this.id = effectCounter;
                this.effect = effect;
                this.subscriptions = [];
                effectCounter = ((effectCounter + 1) % Number.MAX_SAFE_INTEGER) | 0;
            }
            then(f) { return new EffectSuccessHandler(this, [], f); }
            error(f) { return new EffectErrorSubscription(this, [], f); }
        };

        const dispatch = (command, data) => {
            let effectPayload = { command, data, sender: context.self };
            let effect = new Effect(effectPayload);
            effectPayload.id = effect.id;
            self.postMessage(effectPayload);
            return effect;
        };

        const tell = (recipient, message, sender = context.self) => {
            // Note sender in data may differ from that in the payload. 
            // Tell can mask the true sender, which improves encapsulation and information hiding
            let messagePayload = { command: 'tell', data: { sender, recipient, message }, sender: context.self };
            self.postMessage(messagePayload);
        };

        const signalFault = (error) => {
            self.postMessage({ command: 'faulted', data: { sender: context.self, payload: { error } } });
            self.close();
        };

        const destroy = () => {
            self.postMessage({ command: 'destroy', sender: context.self, data: {} });
            self.close();
        };

        const handleMessage = (msg) => {
            let msgContext = Object.assign({}, context);
            try {
                let next = f(msgContext, { sender: msg.sender, payload: msg.payload.message });
                if (next.isType(Function)) {
                    f = next;
                } else if (next.isType(Effect)) {

                } else if (next.isType(EffectSuccessHandler) || next.isType(EffectErrorSubscription)) {

                }
                else if (next === undefined) {
                    destroy();
                } else {
                    throw new TypeError("Unsupported Type");
                }
            } catch (e) {
                signalFault(e);
            }
        };

        try {
            self.onmessage = (evt) => {
                let message = evt.data;
                let payload = message.payload;
                switch (message.command) {
                    case 'setFunction': {
                        f = eval(payload.f)();
                        break;
                    }
                    case 'setContext': {
                        context = {
                            name: payload.name,
                            self: payload.self,
                            parent: payload.parent,
                            children: {}
                        };

                        context.tell = (recipient, message, sender = context.self) =>
                            dispatch({ event: 'MESSAGE', sender, payload: { recipient, message } });

                        context.spawn = (f, name) => dispatch('spawn', { f: f + '', name });

                        context.dispatch = (command, data) => dispatch(command, data);
                        context.log = (msg) => dispatch('log', msg);
                        break;
                    }
                    case 'childSpawned': {
                        let nextChildren = Object.assign(context.children, { [payload.name]: payload.child });
                        context = Object.assign(context, { children: nextChildren });
                        break;
                    }
                    case 'childDestroyed': {
                        let nextChildren = Object.assign(context.children, { [payload.childName]: undefined });
                        context = Object.assign(context, { children: nextChildren });
                        break;
                    }
                    case 'tell': {
                        handleMessage(message);
                        break;
                    }
                    case 'destroy': {
                        destroy();
                        break;
                    }
                }
            };
        } catch (e) {
            console.log(e.toString());
            signalFault(e);
        }
    });

    actor.worker.postMessage({ action: 'setFunction', payload: { f } });
    actor.worker.postMessage({ action: 'setContext', payload: actor.context });
    actor.worker.onmessage = (evt) => {
        switch (evt.data.command) {
            case 'tell': {
                tellEffect(actor, evt.data.data);
                break;
            }
            case 'destroy': {
                destroyEffect(actor);
            }
            case 'spawn': {
                spawnEffect(actor, evt.data.data);
            }
            default: {
                effects[evt.data.action] && effects[evt.data.action](actor, evt.data);
                break;
            }
        }
    };
};




const bindSystem = (system) => {
    system.system = system;
    system.children = [];
    system.context = Object.freeze({ self: { localParts: [] } });
    system.effects = Object.freeze(Object.assign(system.effects, {
        [actions.MESSAGE]: tellEffect,
        [actions.SPAWN]: spawnEffect,
        [actions.DESTROY]: destroyEffect
    }));

    system.shutdown = () => {
        system.isDestroyed = true;
        system.children.forEach(child => destroyEffect(child, {}));
    };

    system.spawn = (f, name) => {
        let spawnCommand = { action: actions.SPAWN, payload: { name, f: f + '' } };
        return spawnEffect(system, spawnCommand);
    };
};

exports.bindSystem = bindSystem;
