const remoteRegex = /^(http(?:s)?:\/\/[^/]+)((?:\/[a-z0-9\-]+)+)$/i;
const localRegex = /^(?:\/[a-z0-9\-]+)+$/i
const actorNameRegex = /^[a-z0-9\-]+$/i

export class LocalPath {
    constructor(localParts){                
        this.localParts = localParts;
        this.type = 'local';
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

    static root(){
        return new LocalPath([]);
    }

    static isLocalPath(path){
        return path.localParts!==undefined && path.type ==='local';
    }
}

export class TempPath {
    constructor(id){
        this.id = id; 
        this.type = 'temp';
    }

    static isTempPath(path){        
        return path.id!==undefined && path.type === 'temp';                
    }
}