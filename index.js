const start = require('./lib/index').start;

let system = start({
    'console.log': { f: (actor, msg) => console.log('A: ' + msg) },
    'test': { f: (actor) => Promise.resolve(2), async: true }
});

let pongActor = system.spawnSimple((msg) => {
    console.log(msg);
    tell(this.sender, 'PONG');
}, 'pong');

let pingActor = system.spawnSimple((msg) => {    
    console.log(msg);
    tell(this.sender, 'PING');
}, 'ping');

pingActor.tell('PONG', pongActor.path);
