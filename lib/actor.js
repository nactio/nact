const { LocalPath } = require('./paths');
const { createActorWebworker } = require('./actor-webworker');

class Actor {
    constructor(system, f, name, parent, effects) { 
        Actor.initialise(this, effects, name, parent);
        this.system = system;
        
        let effectReducer = (prev, effect) => [...prev, { effect, async: !!(effects[effect].async) }];
        let effectList = Object.keys(effects).reduce(effectReducer, []);

        this.worker = createActorWebworker();
        this.worker.onmessage = (evt) => this.onMessage(evt);
        const initialPayload = { path: this.path, name, parent: this.parent.path, f, effects: effectList };
        this.dispatch('initialize', initialPayload);        
    }

    dispatch(action, payload, sender) {
        this.worker.postMessage({ action, payload, sender });
    }

    tell(message, sender) {        
        this.dispatch('tell', { message, sender }, sender);
    }

    ask(message = undefined, timeout) {
        let [defferal, tempPath] = this.system.registerAsk(timeout);
        this.tell(message, tempPath);
        return defferal.promise;
    }

    spawnSimple(f, name, effects) {
        return Actor.spawnSimple(this, f, name, effects);
    }

    spawn(f, name, effects) {
        return Actor.spawn(this, f, name, effects);
    }

    stop() {
        return Actor.stop(this);
    }

    stopping() {
        return Actor.stopping(this);
    }

    static initialise(that, effects, name = undefined, parent = undefined){
        that.name = name;
        that.effects = effects;
        that.parent = parent;
        if (parent!=undefined) {            
            that.path = parent.path.createChildPath(name)
        } else {
            that.path = name   
                        ? LocalPath.root().createChildPath(name)
                        : LocalPath.root();
        }

        that.children = {};
        that.isStopped = false;
    }

    static spawn(that, f, name, customEffects) {
        let effects = customEffects || that.effects;
        let combinedEffects = { ...effects, ...that.system.effects };
        let childActor = new Actor(that.system, f + '', name, that, combinedEffects);
        that.children[name] = childActor;
        if (that.dispatch) {
            that.dispatch('childSpawned', { name, child: childActor.path });
        }        
        return childActor;
    }

    static spawnSimple(that, f, name, effects) {
        return Actor.spawn(
            that,
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

    static stop(that) {
        that.isStopped = true;
        if (that.dispatch) {
            that.dispatch('stop', {});
        }

        if (that.parent) {
            if (!that.parent.isStopped && that.parent.dispatch) {
                that.parent.dispatch('childStopped', { child: that.name }, that.path);
            }
            delete that.parent.children[that.name];
            delete that.parent;
        }

        Object.keys(that.children).map(child => that.children[child].stop());
    }

    static stopping(that) {
        that.isStopped = true;
        if (that.parent) {
            if (!that.parent.isStopped && that.parent.dispatch) {
                that.parent.dispatch('childStopped', { child: that.name }, that.path);
            }
            delete that.parent.children[that.name];
            delete that.parent;
        }
        that.stop();
        Object.keys(that.children).map(child => that.children[child].stop());
    }

    onMessage(evt) {
        // NB: Very important line. This makes the promises resolve within 
        // the mailbox context. hacky_workaround===true    
        setTimeout(() => { });

        let effect = this.effects[evt.data.action];
        if (effect !== undefined) {
            let args = (evt.data.args || []).slice();
            args.unshift(this);
            let result = undefined;
            try {
                result = effect.f.apply(global, args);
                if (effect.async) {
                    let index = evt.data.index;
                    if (result.then && result.catch) {
                        result
                            .then(value => this.dispatch('effectApplied', { index, value }))
                            .catch(err => this.dispatch('effectFailed', { index, value: serializeErr(err) }));
                    } else {
                        this.dispatch('effectApplied', { value: result, index });
                    }
                }
            } catch (e) {
                console.log(serializeErr(e));
                if (effect.async) {
                    let index = evt.data.index;
                    this.dispatch('effectFailed', { value: serializeErr(e), index });
                }
            }
        }
    }
}

module.exports.Actor = Actor;