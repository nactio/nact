const remoteRegex = /^(http(?:s)?:\/\/[^/]+)((?:\/[a-z0-9\-]+)+)$/i;
const localRegex = /^(?:\/[a-z0-9\-]+)+$/i
const actorNameRegex = /^[a-z0-9\-]+$/i

export class LocalPath {
    constructor(localParts){                
        this.localParts = localParts;
    }    

    createChildPath(name) {
        if (typeof (name) !== 'string' || !LocalPath.isValidName(name)) {
            throw new Error("Invalid argument: path may only contain the letters from a-z, dashes and digits");
        }    

        return new LocalPath([...this.localParts, name]);
    }

    static isValidName (name){
        return !!name.match(actorNameRegex);
    }

    static pathReduction (parent,part) { 
            return (parent && parent.children[part]);
    }

    static actorFromReference (actorReference, system) {
        return actorReference.localParts.reduce(LocalPath.pathReduction, system);
    }

    static root(){
        return new LocalPath([]);
    }
}