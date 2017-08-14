
const remoteRegex = /^(http(?:s)?:\/\/[^/]+)((?:\/[a-z0-9\-]+)+)$/i;
const localRegex = /^(?:\/[a-z0-9\-]+)+$/i
const actorNameRegex = /^[a-z0-9\-]+$/i



class ActorPath {
    constructor(localParts, remotePart = undefined) {
        this.remotePart = remotePart ? remotePart : undefined;
        this.localParts = localParts;
    }
}


exports.ActorPath = ActorPath;

exports.isValidName = (name) => !!name.match(actorNameRegex);

// TODO: support wildcard globbing syntax
exports.selection = (path) => {
    let remoteMatch = path.match(remoteRegex);
    if (remoteMatch) {
        let remotePart = remoteMatch[1];
        let localParts = (remoteMatch[2]).split('/');
        return new ActorSelection(localParts, remotePart);
    }
    let localMatch = path.match(localMatch);
    if(localMatch){
        let localParts = (remoteMatch[1]).split('/');
        return new ActorSelection(undefined, localParts);
    }    
    return undefined;
};


const pathReduction = (parent,part) => (parent && parent.children[part]);
exports.actorFromReference = (actorReference, system) => actorReference.localParts.reduce(pathReduction, system);