const start = require('./lib/index').start;

let system = start({ 'console.log': (actor, msg) => console.log(msg)});

let pongActor = system.spawn(() => function f(ctx, msg) {
    console.log('PING');       
    tell(ctx.sender, { type: 'PONG' });                
    return f;
}, 'pong');

let pingActor = system.spawn(() => function f(ctx, msg) {
    console.log('PONG');
    tell(ctx.sender, { type: 'PING' });
    return f;
}, 'ping');

pingActor.tell({ type: 'PONG' }, pongActor.context.self);

