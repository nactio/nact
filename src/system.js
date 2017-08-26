import * as effects from './effects';
import Spawnable from './spawnable';

class ActorSystem extends Spawnable {
    constructor(customEffects = {}) {
        super({ ...effects, ...customEffects });        
        this.system = this;        
    }
}

export const start = (effects) => 
    new ActorSystem(effects);    

