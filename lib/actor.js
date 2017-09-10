const freeze = require('deep-freeze-node');
const { Nobody } = require('./paths');
const { Queue } = require('./queue');
const privateProperties = new WeakMap();

class ActorInternal {
    constructor(parent, path, name, system, f, self) {
        this.parent = parent;
        this.path = path;
        this.name = name;
        this.system = system;
        this.f = f();
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
        if (this.stopped) {
            return Promise.reject(new Error('Actor stopped. Ask can never resolve'));
        }
        let [defferal, tempPath] = this.system.registerAsk(timeout);
        this.tell(message, tempPath);

        return defferal.promise;
    }

    childStopped(child) {
        this.children.delete(child);
    }

    stop() {
        if (!this.stopped) {            
            if (!this.parent.isStopped()) {
                this.parent.childStopped(this.name);
            }
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
            if (!this.parent.isStopped()) {
                this.parent.childStopped(this.name);
            }            
            delete this.parent;            
            [...this.children.values()].map(child => child.terminate());
            this.stopped = true;
        }
    }

    processNext(next) {
        if (!this.stopped) {
            console.log('handling next');            
            console.log(typeof(next));
            if (typeof (next) === 'function') {
                this.f = next;
                if (!this.mailbox.isEmpty()) {
                    let { message, sender } = this.mailbox.dequeue();
                    this.handleMessage(message, sender);
                } else {
                    busy = false;
                }
            } else if (!next) {
                console.log('stopping');
                this.stop();
            } else {
                throw new TypeError('Unsupported Type');
            }
        }
    }

    signalFault(error) {
        // const serializedErr = ActorInternal.serializeErr(error);
        //TODO: implement proper error handling
        // console.error(serializedErr);
    }

    stopGuard() {
        if (this.stopped) {
            throw new Error('Actor has already been stopped');
        }
    }

    spawn(f, name) {
        this.stopGuard();

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
        this.stopGuard();
        return this.spawn(
            () => {
                const wrapper = (msg, ctx) => {                    
                    let result = f.call(ctx,msg, ctx);                    
                    console.log('result');
                    console.log(JSON.stringify(result));
                    console.log(typeof(result));
                    console.log('result');
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
        this.stopGuard();

        this.busy = true;
        this.immediate = setImmediate(() => {
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
                    children: new Map(this.children),
                    sender,
                    tell,
                    spawn,
                    spawnFixed
                };                
                let next = this.f.call(ctx, message, ctx);                
                console.log(JSON.stringify(next));
                console.log(JSON.stringify(typeof(next)));
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
        const path = freeze(parent.path().createChildPath(name));
        privateProperties.set(this, new ActorInternal(parent, path, name, system, f, this));
    }

    childStopped(child) {
        return privateProperties.get(this).childStopped(child);
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