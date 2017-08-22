
exports.dispatch = (actor, action, payload, sender) => 
    actor.worker.postMessage({ action, payload, sender });    