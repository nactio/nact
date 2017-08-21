const start = require('./lib/index').start;

let system = start({ 'console.log': (actor, msg) => console.log('A' + msg)});

let pongActor = system.spawn(() => function f(ctx, msg) {
    switch (msg.payload.type) {
        case 'PING': {
            console.log('PONG');
            tell(msg.sender, { type: 'PONG' });
            // tell(ctx.children['alex'], 'ALEX!!', ctx.self);
            break;
        }
            
        // case 'SPWN': {
        //     spawn(() => function f(ctx, msg) { ctx.log(msg.payload); return f; }, 'alex');
        //     break;
        // }
    }
    return f;
}, 'pong');

// pongActor.tell({ type: 'SPWN' });

let pingActor = system.spawn(() => function f(ctx, msg) {
    console.log('PING');
    tell(msg.sender, { type: 'PING' });
    return f;
}, 'ping');

pingActor.tell({ type: 'PONG' }, pongActor.context.self);

