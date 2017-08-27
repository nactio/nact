import { LocalPath } from './paths';
import createActorWebWorker from './actor-webworker';
import Actor from './actor';

export default class Spawnable {
    constructor(effects, name, parent) {
        this.name = name;
        this.effects = effects;
        this.parent = parent;
        if (this.parent) {
            this.path = parent.path.createChildPath(name)
        } else {
            this.path = this.name   
                        ? LocalPath.root().createChildPath(name)
                        : LocalPath.root();
        }        

        this.children = {};
        this.isStopped = false;
    }

    spawn(f, name, customEffects) {
        let effects = customEffects || this.effects;
        let combinedEffects = { ...effects, ...this.system.effects };
        let childActor = new Actor(this.system, f+'', name, this, combinedEffects);        
        this.children[name] = childActor;
        if(this.dispatch){
            this.dispatch('childSpawned', { name, child: childActor.path });
        }                
        return childActor;
    }

    spawnSimple(f, name, effects) {
        return this.spawn(
            `() => function wrapper(ctx, msg) {
                let f = ${f + ''};        
        
                let result = f(ctx, msg);        
                
                if (Promise.resolve(result) == result) {            
                    return result.then((r) => r !== false ? wrapper : undefined);
                } else if(result !== false){            
                    return wrapper;
                }
            };`,
            name,
            effects
        );
    }

    stop() {
        this.isStopped = true;
        if(this.dispatch){
            this.dispatch('stop', {});
        }

        if (this.parent) {            
            if (!this.parent.isStopped && this.parent.dispatch) {
                this.parent.dispatch('childStopped', { child: this.name }, this.path);
            }
            delete this.parent.children[this.name];
            delete this.parent;
        }

        Object.keys(this.children).map(child => this.children[child].stop());
    }

    stopping() {    
        this.isStopped = true;                
        if (this.parent) { 
            if (!this.parent.isStopped && this.parent.dispatch) {
                this.parent.dispatch('childStopped', { child: this.name }, this.path);
            }
            delete this.parent.children[this.name];
            delete this.parent;
        }
        this.stop();
        Object.keys(this.children).map(child => this.children[child].stop());
    }

}