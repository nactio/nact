const freeze = require('deep-freeze-node');
const { LocalPath, Nobody } = require('./paths');
const { ActorWorker } = require('./actor-worker');
const { Queue } = require('./queue');

const privateProperties = new WeakMap();

class ActorInternal {
    constructor(parent, path, name, system, f, self) {
        this.parent = parent;
        this.path = path;
        this.name = name;
        this.system = system;
        this.f = f;
        this.self = self;

        this.stopped = false;
        this.children = new Map();
        this.busy = false;
        this.mailbox = Queue.empty();
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
                this.mailbox.enqueue({ message, sender });
            }
        }
    }

    ask(message, timeout) {
        let [defferal, tempPath] = this.system.registerAsk(timeout);
        this.tell(message, tempPath);
        return defferal.promise;
    }

    childSpawned(name, child) {
        this.children.set(name, child);
    }

    childStopped(child) {
        this.children.delete(child);
    }


    stop() {
        this.stopped = true;
        if (!this.parent.isStopped()) {
            privateProperties.get(this.parent).childStopped(this.name);
        }
        delete this.parent;

        [...this.children.values()].map(child => child.terminate());
    }

    terminate() {
        this.stopped = true;
        if (this.immediate) {
            this.clearImmediate(this.immediate);
        }

        if (!this.parent.isStopped()) {
            privateProperties.get(this.parent).childStopped(this.name);
        }

        delete this.parent;

        [...this.children.values()].map(child => child.stop());
    }

    processNext(next) {
        if (!this.stopped) {
            if (typeof (next) === 'function') {
                this.f = next;
                if (!this.mailbox.isEmpty()) {
                    let { message, sender } = this.mailbox.dequeue();
                    this.handleMessage(message, sender);
                } else {
                    busy = false;
                }
            } else if (!next) {
                this.stop();
            } else {
                throw new TypeError('Unsupported Type');
            }
        }
    }

    spawn(f, name) {
        if (!name) {
            name = `anonymous-${this.children.size}`;
        }

        if (this.children.has(name)) {
            throw new Error(`child actor of name ${name} already exists`);
        }

        const childActor = new Actor(this.system, f, name, this.self);
        this.children.set(name, childActor);
        return childActor;
    }

    spawnFixed(f, name) {
        return this.spawn(
            function () {
                const wrapper = func(msg) => {
                    let f = f;
                    let result = f(msg);
                    if (result && result.then) {
                        return result.then((r) => r !== false ? wrapper : undefined);
                    } else if (result !== false) {
                        return wrapper;
                    } else {
                        return undefined;
                    }
                };
                return wrapper;
            },
            name
        );
    }

    handleMessage(message, sender) {
        this.busy = true;
        this.immediate = setImmediate(function () {
            try {                
                const tell = (recipient, message, sender) => {
                    if (!sender) {
                        sender = this.self;
                    }
                    if (recipient && recipient.tell) {
                        return recipient.tell(message, sender);
                    } else {
                        throw new TypeError('Recipient is of an invalid type');
                    }
                }

                const spawn = this.spawn;
                const spawnFixed = this.spawnFixed;

                let ctx = {
                    parent: this.parent,
                    path: this.path,
                    self: this.self,
                    name: this.name,
                    sender,
                    tell,
                    spawn,
                    spawnFixed
                };

                let next = this.f.call(ctx, message, ctx);
                if (next && next.then && next.catch) {
                    next.then(this.processNext).catch(this.signalFault);
                } else {
                    this.processNext(next);
                }
            } catch (e) {
                this.signalFault(e);
                return;
            }
        });
    }
}



class Actor {
    constructor(system, f, name, parent) {
        const path = freeze(parent.path.createChildPath(name));
        privateProperties.set(this, new ActorInternal(parent, path, name, system, f));
    }

    isStopped() {
        return privateProperties.get(this).isStopped;
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

    tell(message, sender = Nobody.instance()) {
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

module.exports.Actor = Actor;