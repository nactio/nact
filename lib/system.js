const effects = require('./effects');
const { Actor } = require('./actor');
const { RingBuffer } = require('./ringbuffer');
const { Deferred } = require('./deferred');
const { TempPath, LocalPath } = require('./paths');

class ActorSystem {
    constructor(customEffects = {}) {
        Actor.initialise(this, { ...effects, ...customEffects });
        this.system = this;
        this.askBuffer = new RingBuffer(4096);
    }

    static getSafeTimeout(timeoutDuration){        
        const MAX_TIMEOUT = 2147483647;
        if(!timeoutDuration || timeoutDuration > 2147483647){
            return 2147483647;
        }else{
            return timeoutDuration;
        }        
    }

    registerAsk(timeoutDuration) {        

        var defferal = new Deferred();        
        defferal.tell = (message) => defferal.resolve(message);            
        let timeout = setTimeout(() => { defferal.reject('Ask Timeout') }, ActorSystem.getSafeTimeout(timeoutDuration));
        defferal.promise.then(() => clearTimeout(timeout));

        let [index, prev] = this.askBuffer.add(defferal);

        if (prev && !prev.done) {
            prev.reject('System AskBuffer has cycled before a response was received');
        }

        return [defferal, new TempPath(index)];
    }

    actorFromReference(actorReference) {
        if (LocalPath.isLocalPath(actorReference)) {
            const pathReduction = (parent, part) => (parent && parent.children[part]);
            return actorReference.localParts.reduce(pathReduction, this);
        } else if (TempPath.isTempPath(actorReference)) {
            return this.askBuffer.get(actorReference.id);
        }
    }

    spawnRecursive(f, name, effects) {
        return Actor.spawnRecursive(this, f, name, effects);
    }

    spawn(f, name, effects) {
        return Actor.spawn(this, f, name, effects);
    }

    stop() {
        return Actor.stop(this);
    }

    stopping() {
        return Actor.stoppin(this);
    }
}

const start = (effects) => new ActorSystem(effects);

module.exports = { start };


