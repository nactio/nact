
const { Actor, spawnFixedFunction } = require('./actor');
const { TempPath, LocalPath } = require('./paths');
const { Deferred } = require('./deferred');
const privateProperties = new WeakMap();

class ActorSystemInternal {
    constructor(self) {
        this.self = self;
        this.children = new Map();
        this.path = LocalPath.root();
        this.stopped = false;
        this.index = 0;
    }

    static getSafeTimeout(timeoutDuration) {
        const MAX_TIMEOUT = 2147483647;
        if (!timeoutDuration || timeoutDuration > 2147483647) {
            return 2147483647;
        } else {
            return timeoutDuration;
        }
    }

    childStopped(child) {
        this.children.delete(child);
    }

    childSpawned(child) {
        this.children.set(child.name(), child);
    }

    stop() {
        [...this.children.values()].map(child => child.stop());
        this.stopped = true;
    }

    terminate() {
        [...this.children.values()].map(child => child.terminate());
        this.stopped = true;
    }

    prepareAsk(timeoutDuration) {
        var defferal = new Deferred();
        let timeout = setTimeout(() => { defferal.reject(new Error('Ask Timeout')) }, ActorSystemInternal.getSafeTimeout(timeoutDuration));
        defferal.promise.then(() => clearTimeout(timeout));
        let path = new TempPath(this.index);
        this.index = (this.index + 1) % Number.MAX_SAFE_INTEGER;
        path.tell = defferal.resolve;
        return [defferal, path];
    }

    stopGuard() {
        if (this.stopped) {
            throw new Error('Actor has already been stopped');
        }
    }

    spawn(f, name) {
        this.stopGuard();
        return new Actor(this.self, f, name, this.self);
    }

    spawnFixed(f, name) {
        this.stopGuard();
        return this.spawn(spawnFixedFunction.bind(this.self)(f), name);
    }
}

class ActorSystem {
    constructor() {
        privateProperties.set(this, new ActorSystemInternal(this));
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

    path() {
        return privateProperties.get(this).path;
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

    prepareAsk(timeoutDuration) {
        return privateProperties.get(this).prepareAsk(timeoutDuration);
    }
}

const start = (effects) => new ActorSystem(effects);

module.exports = { start };


