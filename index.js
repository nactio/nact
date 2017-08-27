const start = require('./lib/index').start;

let system = start({
    'console.log': { f: (actor, msg) => console.log('A: ' + msg) },
    'test': { f: (actor) => Promise.resolve(2), async: true }
});

let pongActor = system.spawnSimple((msg) => {
    console.log(msg);    
    tell(sender, 'PONG');
}, 'pong');

let pingActor = system.spawnSimple((msg) => {
    console.log(msg);
    tell(sender, 'PING');
}, 'ping');

let askActor = system.spawnSimple((msg) => {    
    let sum = 0;
    for (let i = 0; i < msg; i++) {
        sum += i;
    }
    tell(sender, sum);
}, 'calculate');

// let testActor = system.spawn(()=>(msg)=>{}, 'test');
// testActor.tell({});
// // testActor.stop();

askActor.ask(1000, 1000)
    .then(result => { console.log(result); askActor.stop(); });
    
pingActor.tell('PONG', pongActor.path);

