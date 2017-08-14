class ActorMailbox {
    constructor() { }

    push(item) {
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

    isEmpty() {
        return this.head !== undefined;
    }

    peek() {
        return this.head
            ? this.head.item
            : undefined;
    }

    pop() {
        if (this.head) {
            const item = this.head.item;
            if (this.head !== this.tail) {
                this.head = this.head.next;
            } else {
                mailbox.head = undefined;
                mailbox.tail = undefined;
            }
            return item;
        } else {
            throw new Error("Attempted illegal operation: Empty mailbox cannot be popped");
        }
    }

}

ActorMailbox.empty = () => new ActorMailbox();
mailbox = ActorMailbox;
