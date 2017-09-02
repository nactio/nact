const { Promise } = require('bluebird');

class Deferred {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.reject = reject;
            this.resolve = resolve;
        });
        this.promise
            .then(()=>{ this.done = true; })
            .catch(()=>{ this.done = true; });
    }
}

module.exports.Deferred = Deferred;