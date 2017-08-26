Object.prototype.isType = function (t) {
    return t.name === Object.getPrototypeOf(this).constructor.name
};

Object.prototype.getTypeName = function () {
    return Object.getPrototypeOf(this).constructor.name
};