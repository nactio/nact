const start = require('./lib/index').start;
let system = start({ 'console.log': (actor, msg) => console.log(msg)});

let pongActor = system.spawnSimple((ctx, msg) => {
    console.log(msg);       
    tell(ctx.sender, 'PONG');                    
}, 'pong');

let pingActor = system.spawnSimple((ctx, msg) => {
    console.log(msg);
    tell(ctx.sender, 'PING');    
}, 'ping');

pingActor.tell('PONG', pongActor.context.self);
