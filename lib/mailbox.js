class Queue {
    
        constructor() {}
    
        static empty(){ return new Queue(); }
    
        enqueue(item) {
            const nextTail = { item };
            if (this.tail) {
                let prevTail = this.tail;
                prevTail.next = nextTail;
                this.tail = nextTail;
            } else {
                this.head = nextTail;
                this.tail = nextTail;
            }
        }
    
        isEmpty() { return this.front !== undefined; }
    
        front() { return this.front ? this.front.item : undefined; }
    
        dequeue() {
            if (this.front) {
                const item = this.front.item;
                if (this.front !== this.tail) {
                    this.front = this.front.next;
                } else {
                    mailbox.head = undefined;
                    mailbox.tail = undefined;
                }
                return item;
            } else {
                throw new Error("Attempted illegal operation: Empty queue cannot be popped");
            }    
        }
}
