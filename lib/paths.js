const remoteRegex = /^(http(?:s)?:\/\/[^/]+)((?:\/[a-z0-9\-]+)+)$/i;
const localRegex = /^(?:\/[a-z0-9\-]+)+$/i;
const actorNameRegex = /^[a-z0-9\-]+$/i;

class LocalPath {
    constructor(localParts){                
        this.localParts = localParts;
        this.type = 'path';
    }    

    createChildPath(name) {
        if (!LocalPath.isValidName(name)) {
            throw new Error('Invalid argument: path may only contain the letters from a-z, dashes and digits');
        }

        return new LocalPath([...this.localParts, name]);
    }

    static isValidName (name){
        return !!name && typeof (name) === 'string' && !!name.match(actorNameRegex);
    }

    static root(){
        return new LocalPath([]);
    }

    static isLocalPath(path){
        return !!path.localParts && path.type ==='path' && !path.remoteParts && Array.isArray(path.localParts);
    }
}

class TempPath {
    constructor(id){
        this.id = id | 0; 
        this.type = 'temp';
    }

    static isTempPath(path){        
        return path.id!=undefined && path.id!=null && typeof(path.id)==='number' && path.type === 'temp';                
    }
}

module.exports = { TempPath, LocalPath };