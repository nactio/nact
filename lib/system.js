
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

    resolveActorFromPath(path) {
        let actor = this;
        if (path instanceof LocalPath) {
            return path.localParts.reduce((child, part) => child && child.children().get(part), this.self);
        }
        throw new TypeError('Only LocalPath is supported in this version of nact');
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

    deadLetter(recipient,message, sender) {
        
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

    deadLetter(message, sender) {
        return privateProperties.get(this).deadLetter(message, sender);
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

    resolveActorFromPath(path) {
        return privateProperties.get(this).resolveActorFromPath(path);
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


