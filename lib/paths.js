class LocalPath {
    constructor(localParts) {
        this.localParts = localParts;
        this.type = 'path';
    }

    createChildPath(name) {
        if (!LocalPath.isValidName(name)) {
            throw new Error('Invalid argument: path may only contain the letters from a-z, dashes and digits');
        }

        return new LocalPath([...this.localParts, name]);
    }

    static isValidName(name) {
        const actorNameRegex = /^[a-z0-9\-]+$/i;
        return !!name && typeof (name) === 'string' && !!name.match(actorNameRegex);
    }

    static root() {
        return new LocalPath([]);
    }
}

class TempPath {
    constructor(id) {
        this.id = id | 0;
        this.type = 'temp';
    }
}

module.exports = { TempPath, LocalPath };