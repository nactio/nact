
const remoteRegex = /^(http(?:s)?:\/\/[^/]+)((?:\/[a-z0-9\-]+)+)$/i;
const localRegex = /^(?:\/[a-z0-9\-]+)+$/i
const actorNameRegex = /^[a-z0-9\-]+$/i

exports.isValidName = (name) => !!name.match(actorNameRegex);
const pathReduction = (parent,part) => (parent && parent.children[part]);
exports.actorFromReference = (actorReference, system) => actorReference.localParts.reduce(pathReduction, system);