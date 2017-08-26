const start = require('./lib/index').start;

let system = start({
    'console.log': { f: (actor, msg) => console.log('A: ' + msg) },
    'test': { f: (actor) => Promise.resolve(2), async: true }
});

let pongActor = system.spawnSimple((ctx, msg) => {
    console.log(msg);
    tell(ctx.sender, 'PONG');
}, 'pong');

let pingActor = system.spawnSimple((ctx, msg) => {
    console.log(msg);
    tell(ctx.sender, 'PING');
}, 'ping');

pingActor.tell('PONG', pongActor.path);
