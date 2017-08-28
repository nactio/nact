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

const stopping = new Effect((actor) => actor.stopping());

const spawn = new Effect((actor, f, name) => actor.spawn(f, name), true);

const spawnSimple = new Effect((actor, f, name) => actor.spawnSimple(f, name), true);

module.exports = { tell, stopping, stop, spawn, spawnSimple };