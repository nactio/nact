const effects = require('./effects');

const bindSystem = (system) => {
    system.system = system;
    system.children = [];
    system.context = { self: { localParts: [] } };

    system.effects = Object.assign({}, effects, system.effects);

    system.shutdown = () => {
        system.isDestroyed = true;
        system.children.forEach(child => effects.destroy.f(child, {}));
    };

    system.spawn = (f, name) => effects.spawn.f(system, f + '', name);
    system.spawnSimple = (f, name) => effects.spawnSimple.f(system, f, name);
};

exports.start = (effects) => {
    const system = {};
    system.effects = effects;
    bindSystem(system);
    return system;
};

