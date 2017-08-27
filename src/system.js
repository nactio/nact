import * as effects from './effects';
import Spawnable from './spawnable';
import RingBuffer from './ringbuffer';
import Deferred from './deferred';
import { TempPath, LocalPath } from './paths';
require('./typing');

class ActorSystem extends Spawnable {
    constructor(customEffects = {}) {
        super({ ...effects, ...customEffects });
        this.system = this;
        this.askBuffer = new RingBuffer(4096);
    }

    static getSafeTimeout(timeoutDuration){        
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
        defferal.promise.then(() => clearTimeout(timeoutDuration));

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

}

export const start = (effects) =>
    new ActorSystem(effects);

