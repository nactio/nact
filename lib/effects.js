const { LocalPath } = require('./paths');
const { Effect } = require('./effect');

const tell = new Effect((actor, recipient, message, sender) => {
    sender = sender || actor.path;
    const concreteRecipient = actor.system.actorFromReference(recipient);
    if (!concreteRecipient.isStopped) {
        concreteRecipient.tell(message, sender);
    }
});

const stop = new Effect((actor) => actor.stop());

const spawn = new Effect((actor, f, name) => actor.spawn(f, name), true);

const spawnFixed = new Effect((actor, f, name) => actor.spawnFixed(f, name), true);

module.exports = { tell, stop, spawn, spawnFixed };