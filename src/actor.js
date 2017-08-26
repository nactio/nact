import { LocalPath } from './paths';
import createActorWebWorker from './actor-webworker';
import './typing';
import Spawnable from './spawnable';

export default class Actor extends Spawnable {
    constructor(system, f, name, parent, effects) {
        super(effects, name, parent);        
        this.system = system;
        
        let effectReducer = (prev, effect) => [...prev, { effect, async: !!(effects[effect].async) }];
        let effectList = Object.keys(effects).reduce(effectReducer, []);
        
        this.worker = createActorWebWorker();
        this.worker.onmessage = (evt) => this.onMessage(evt);

        const initialPayload = { path: this.path, name, parent: this.parent.path, f, effects: effectList };
        this.dispatch('initialize', initialPayload);        
    }


    dispatch(action, payload, sender) {
        this.worker.postMessage({ action, payload, sender });
    }

    tell(message, sender) {
        this.dispatch('tell', { message, sender });
    }

    ask(message, timeout) {
        let [defferal, tempPath] = this.system.registerAsk(timeout);
        this.tell(message,tempPath);
        return defferal.promise;   
    }

    onMessage(evt) {
        // NB: Very important line. This makes the promises resolve within 
        // the mailbox context. hacky_workaround===true    
        setTimeout(() => { });                
        let effect = this.effects[evt.data.action];        
        if (effect !== undefined) {
            let args = evt.data.args.slice();
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