const start = require('./lib/index').start;

let system = start({ 'LOG': (actor, msg) => console.log(msg.payload) });

let pongActor = system.spawn(() => function f(ctx, msg) {
    switch (msg.payload.type) {
        case 'PING': {
            ctx.log('PONG');
            ctx.tell(msg.sender, { type: 'PONG' });
            ctx.tell(ctx.children['alex'], 'ALEX!!');
            break;
        }
            
        case 'SPWN': {
            ctx.spawn(() => function f(ctx, msg) { ctx.log(msg.payload); return f; }, 'alex');
            break;
        }
    }
    return f;
}, 'pong');

pongActor.tell({ type: 'SPWN' });

let pingActor = system.spawn(() => function f(ctx, msg) {
    ctx.log('PING');
    ctx.tell(msg.sender, { type: 'PING' });
    return f;
}, 'ping');

pingActor.tell({ type: 'PONG' }, pongActor.context.self);