class Nobody {
    constructor(system) {
        this.type = 'nobody';
        this.system = system;
    }

    tell(message,sender){
        this.system.deadLetter(message, sender);
    }
}

module.exports.Nobody = Nobody;