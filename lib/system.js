
const { Actor } = require('./actor');
const { TempPath, LocalPath, Nobody } = require('./paths');
const { RingBuffer } = require('./ringbuffer');
const { Deferred } = require('./deferred');

const privateProperties = new WeakMap();

class ActorSystemInternal {
    constructor(self) {
        this.self = self;
        this.children = new Map();
        this.path = LocalPath.root();
        this.stopped = false;
        this.askBuffer = new RingBuffer(4096);
    }

    static getSafeTimeout(timeoutDuration) {
        const MAX_TIMEOUT = 2147483647;
        if (!timeoutDuration || timeoutDuration > 2147483647) {
            return 2147483647;
        } else {
            return timeoutDuration;
        }
    }

    childSpawned(name, child) {
        this.children.set(name, child);
    }

    childStopped(child) {
        this.children.delete(child);
    }

    stop() {
        [...this.children.values()].map(child => child.stop());
        this.stopped = true;
    }

    terminate() {
        [...this.children.values()].map(child => child.terminate());
        this.stopped = true;
    }

    registerAsk(timeoutDuration) {
        var defferal = new Deferred();

        let timeout = setTimeout(() => { defferal.reject(new Error('Ask Timeout')) }, ActorSystemInternal.getSafeTimeout(timeoutDuration));
        defferal.promise.then(() => clearTimeout(timeout));
        let [index, prev] = this.askBuffer.add(defferal);
        let path = new TempPath(index);
        path.tell = defferal.resolve;
        if (prev && !prev.done) {
            prev.reject('AskBuffer has cycled before a response was received');
        }
        return [defferal, path];
    }

    actorFromReference(actorReference) {
        if (LocalPath.isLocalPath(actorReference)) {
            const pathReduction = (parent, part) => (parent && parent.children.get(part));
            return actorReference.localParts.reduce(pathReduction, this);
        } else if (TempPath.isTempPath(actorReference)) {
            return this.askBuffer.get(actorReference.id);
        } else if (Noboby.isNobody(actorReference)) {
            return undefined;
        }
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

        const childActor = new Actor(this.self, f, name, this.self);
        this.childSpawned(name, childActor);
        return childActor;
    }

    spawnFixed(f, name) {
        this.stopGuard();
        return this.spawn(
            () => {
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
            },
            name
        );
    }

}

class ActorSystem {
    constructor() {
        privateProperties.set(this, new ActorSystemInternal(this));
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

    path() {
        return privateProperties.get(this).path;
    }

    name() {
        return undefined;
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

    registerAsk(timeoutDuration) {
        return privateProperties.get(this).registerAsk(timeoutDuration);
    }
}

const start = (effects) => new ActorSystem(effects);

module.exports = { start };


