class RingBuffer {
    constructor(size) {
        this.size = size;
        this.arr = new Array(size);
        this.count = 0;
    };

    get(index) {
        return this.arr[index];
    }

    set(index, value) {
        this.arr[index] = value;
    }

    add(value) {
        let i = this.count;
        let prev = this.arr[i];
        this.arr[i] = value;
        ++this.count;
        this.count = this.count >= this.size ? 0 : this.count;
        return [i,prev];
    }
}


module.exports = { RingBuffer };