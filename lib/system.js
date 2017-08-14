const actor = require('./actor');

const start = (effects) => {
    const system = {};
    system.effects = effects;
    actor.bindSystem(system);
    return system;
};

exports.start = start;