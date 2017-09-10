class Queue {

    constructor() {
        this.head = undefined;
        this.tail = undefined;
    }

    static empty() { return new Queue(); }

    enqueue(item) {
        let nextTail = { item };
        if (this.isEmpty()) {
            this.head = nextTail;
            this.tail = nextTail;
        } else {
            let prevTail = this.tail;
            prevTail.next = nextTail;
            this.tail = nextTail;
        }
    }

    isEmpty() {
        return !this.head;
    }

    peek() { return this.isEmpty() ? undefined : this.head.item; }

    dequeue() {
        if (!this.isEmpty()) {
            const item = this.head.item;
            this.head = this.head.next;
            return item;
        } else {
            throw new Error('Attempted illegal operation: Empty queue cannot be popped');
        }
    }
}

module.exports = { Queue };