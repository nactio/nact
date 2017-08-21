// Helper functions for type introspection
Object.prototype.isType = function (t) { return t.name === Object.getPrototypeOf(this).constructor.name };
Object.prototype.typeName = function () { return Object.getPrototypeOf(this).constructor.name; };

let context = undefined;
let f = undefined;

const handleMessage = (msg) => {
    let msgContext = Object.assign({}, context);
    try {
        let next = f(msgContext, { sender: msg.sender, payload: msg.payload.message });
        if (next.isType(Function)) {
            f = next;
        } 
        else if (next === undefined) {
            destroy();
        } else {
            throw new TypeError("Unsupported Type");
        }
    } catch (e) {
        signalFault(e);
    }
};

const dispatch = (action, payload) => self.postMessage({ action, payload, sender: context.self });

const signalFault = (error) => {
    self.postMessage({ action: 'faulted', payload: { sender: context.self, payload: { error } }, sender: context.self });
    self.close();
};

const destroy = () => {
    self.postMessage({ action: 'destroy', sender: context.self, payload: {} });
    self.close();
};


self.onmessage = (evt) => {
    try {
        let message = evt.data;
        let payload = message.payload;
        switch (message.action) {
            case 'setFunction': {                
                f = eval(payload.f)();                
                break;
            }
            case 'setContext': {
                context = {
                    name: payload.name,
                    self: payload.self,
                    parent: payload.parent,
                    children: {}
                };

                context.tell = (recipient, message, sender = context.self) => 
                    dispatch('tell', { recipient, message, sender });

                context.spawn = (f, name) => dispatch('spawn', { f: f + '', name });

                context.dispatch = (action, payload) => dispatch(action, payload);
                context.log = (msg) => dispatch('log', msg);                
                break;
            }
            case 'childSpawned': {
                let nextChildren = Object.assign({}, context.children, { [payload.name]: payload.child });
                context = Object.assign(context, { children: nextChildren });
                break;
            }
            case 'childDestroyed': {
                let nextChildren = Object.assign({}, context.children);
                delete nextChildren[payload.child];                
                context = Object.assign(context, { children: nextChildren });
                break;
            }
            case 'tell': {                
                handleMessage(message);
                break;
            }
            case 'destroy': {
                destroy();
                break;
            }
        }
    } catch (e) {
        console.log(e.toString());
        signalFault(e);
    }
};
