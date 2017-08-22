Object.prototype.isType = function (t) {
    return t.name === Object.getPrototypeOf(this).constructor.name
};