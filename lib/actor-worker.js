// Helper functions for type introspection
Object.prototype.isType = function (t) { return t.name === Object.getPrototypeOf(this).constructor.name };
Object.prototype.typeName = function () { return Object.getPrototypeOf(this).constructor.name; };

class ActorMailbox {
    constructor() { }

    push(item) {
        const nextTail = { item };
        if (this.tail) {
            let prevTail = this.tail;
            prevTail.next = nextTail;
            this.tail = nextTail;
        } else {
            this.head = nextTail;
            this.tail = nextTail;
        }
    }

    isEmpty() { return this.head !== undefined; }

    peek() { return this.head ? this.head.item : undefined; }

    pop() {
        if (this.head) {
            const item = this.head.item;
            if (this.head !== this.tail) {
                this.head = this.head.next;
            } else {
                mailbox.head = undefined;
                mailbox.tail = undefined;
            }
            return item;
        } else {
            throw new Error("Attempted illegal operation: Empty mailbox cannot be popped");
        }
    }
}

ActorMailbox.empty = () => new ActorMailbox();


let context = undefined;
let f = undefined;

const handleMessage = (msg) => {
    let msgContext = Object.assign({}, context, {sender: msg.sender});
    try {
        let next = f(msgContext, msg.payload.message);

        if (next.isType(Function)) {
            f = next;
        }
        else if (next === undefined) {
            destroy();
        } else {
            throw new TypeError("Unsupported Type");
        }
    } catch (e) {        
        console.log(JSON.stringify(e));
        signalFault(e);
    }
};

const dispatch = (action, args) => 
    self.postMessage({ action, args, sender: context.self });

const signalFault = (error) => {
    self.postMessage({ action: 'faulted', payload: { sender: context.self, payload: { error } }, sender: context.self });
    self.close();
};

const destroy = () => {
    self.postMessage({ action: 'destroy', sender: context.self, args: [] });
    self.close();
};

const bindEffects = (effects) => {

    let mapFold = (name, length) => (effect, part, index) => {
        console.log(part);
        let next = index + 1 === length
                   ? (...args) => dispatch(name, args)
                   : (effect[part] || {});        

        effect[part] = next;            
        return next;        
    };

    effects.map(e => ({ parts: e.split('.'), name: e }))
           .map(e => e.parts.reduce(mapFold(e.name, e.parts.length), this));
};

self.onmessage = (evt) => {
    try {
        let message = evt.data;
        let payload = message.payload;
        switch (message.action) {
            case 'initialize': {
                f = eval(payload.f)();

                context = {
                    name: payload.name,
                    self: payload.self,
                    parent: payload.parent,
                    children: {}
                };                
                bindEffects(payload.effects);                                                
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
        signalFault(e);
    }
};
