const freeze = require('deep-freeze-node');
const { Nobody } = require('./nobody');
const Queue = require('denque');

const privateProperties = new WeakMap();

const spawnFixedFunction = (f) => () => {
    const wrapper = (msg, ctx) => {
        let result = f.call(ctx, msg, ctx);
        if (result && result.then) {
            return result.then((r) => r !== false ? wrapper : undefined);
        } else if (result !== false) {
            return wrapper;
        } else {
            return undefined;
        }
    };
    return wrapper;
};

class ActorInternal {
    constructor(parent, path, name, system, f, self) {
        this.parent = parent;
        this.path = path;
        this.name = name;
        this.initialF = f();
        this.system = system;
        this.f = this.initialF;
        this.self = self;
        this.stopped = false;
        this.children = new Map();
        this.busy = false;
        this.mailbox = new Queue();
        this.immediate = undefined;
    }

    static serializeErr(err) {
        return JSON.stringify(err, Object.getOwnPropertyNames(err));
    }

    tell(message, sender) {
        if (!this.stopped) {
            if (!this.busy) {
                this.handleMessage(message, sender);
            } else {
                this.mailbox.push({ message, sender });
            }
        } else {
            this.system.deadLetter(this.path, message, sender);
        }
    }

    ask(message, timeout) {
        if (this.stopped) {
            return Promise.reject(new Error('Actor stopped. Ask can never resolve'));
        }
        let [defferal, tempPath] = this.system.prepareAsk(timeout);
        this.tell(message, tempPath);
        return defferal.promise;
    }

    childStopped(child) {
        this.children.delete(child);
    }

    childSpawned(child) {
        this.children.set(child.name(), child);
    }

    stop() {
        if (!this.stopped) {
            this.parent.childStopped(this.name);
            delete this.parent;
            [...this.children.values()].map(child => child.stop());
            this.stopped = true;
        }
    }

    terminate() {
        if (!this.stopped) {
            if (this.immediate) {
                clearImmediate(this.immediate);
            }
            this.parent.childStopped(this.name);
            delete this.parent;
            [...this.children.values()].map(child => child.terminate());
            this.stopped = true;
        }
    }

    processNext(next) {
        if (!this.stopped) {
            if (typeof (next) === 'function') {
                this.f = next;
                if (!this.mailbox.isEmpty()) {
                    let { message, sender } = this.mailbox.shift();
                    this.handleMessage(message, sender);
                } else {
                    this.busy = false;
                }
            } else if (!next) {
                this.stop();
            } else {
                throw new TypeError('Unsupported Type');
            }
        }
    }

    signalFault(error) {
        const serializedErr = ActorInternal.serializeErr(error);
        console.log(serializedErr);
        //TODO: implement proper error handling        
        this.terminate();
    }

    stopGuard() {
        if (this.stopped) {
            throw new Error('Actor has already been stopped');
        }
    }

    spawn(f, name) {
        this.stopGuard();
        return new Actor(this.system, f, name, this.self);
    }

    spawnFixed(f, name) {
        this.stopGuard();
        return this.spawn(spawnFixedFunction.bind(this.self)(f), name);
    }

    handleMessage(message, sender) {
        this.stopGuard();

        this.busy = true;
        this.immediate = setImmediate(() => {
            try {
                const tell = (recipient, message, sender = this.self) => {
                    if (recipient && recipient.tell) {
                        recipient.tell(message, sender);
                    } else {
                        throw new TypeError('Recipient is of an invalid type');
                    }
                };

                const spawn = (f, name) => this.spawn(f, name);
                const spawnFixed = (f, name) => this.spawnFixed(f, name);

                let ctx = {
                    parent: this.parent,
                    path: this.path,
                    self: this.self,
                    name: this.name,
                    children: new Map(this.children),
                    sender,
                    tell,
                    spawn,
                    spawnFixed
                };

                let next = this.f.call(ctx, message, ctx);
                if (next && next.then && next.catch) {
                    next.then(result => this.processNext(result)).catch(err => this.signalFault(err));
                } else {
                    this.processNext(next);
                }
            } catch (e) {
                this.signalFault(e);
            }
        });
    }
}

class Actor {
    constructor(system, f, name, parent) {
        if (!name) {
            name = `anonymous-${parent.children().size}`;
        }
        if (name && parent.children().has(name)) {
            throw new Error(`child actor of name ${name} already exists`);
        }
        const path = freeze(parent.path().createChildPath(name));
        privateProperties.set(this, new ActorInternal(parent, path, name, system, f, this));
        parent.childSpawned(this);
    }

    childStopped(child) {
        return privateProperties.get(this).childStopped(child);
    }

    childSpawned(child) {
        return privateProperties.get(this).childSpawned(child);
    }

    isStopped() {
        return privateProperties.get(this).stopped;
    }

    children() {
        return new Map(privateProperties.get(this).children);
    }

    parent() {
        return privateProperties.get(this).parent;
    }

    path() {
        return privateProperties.get(this).path;
    }

    name() {
        return privateProperties.get(this).name;
    }

    tell(message, sender = new Nobody(privateProperties.get(this).system)) {
        return privateProperties.get(this).tell(message, sender);
    }

    ask(message = undefined, timeout) {
        return privateProperties.get(this).ask(message, timeout);
    }

    stop() {
        return privateProperties.get(this).stop();
    }

    terminate() {
        return privateProperties.get(this).terminate();
    }

    spawn(f, name) {
        return privateProperties.get(this).spawn(f, name);
    }

    spawnFixed(f, name) {
        return privateProperties.get(this).spawnFixed(f, name);
    }
}

module.exports.spawnFixedFunction = spawnFixedFunction;
module.exports.Actor = Actor;
