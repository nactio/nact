
import Denque from '.';

function shouldBeDeepEqual<T>(a: T, b: T) {
    expect(a).toEqual(b);
}


function shouldBeStrictEqual<T>(a: T, b: T) {
    expect(a).toStrictEqual(b);
}

function shouldBeEqual<T>(a: T, b: T) {
    expect(a).toEqual(b);
}

describe('Denque.prototype.constructor', function () {
    it('should take no argument', function () {
        var a = new Denque();
        expect(a._capacityMask).toEqual(3);
        expect(a._list.length).toEqual(4);
        expect(a.size()).toEqual(0);
        expect(a.length).toEqual(0);
    });

    it('should take array argument', function () {
        var a = new Denque([1, 2, 3, 4]);
        var b = new Denque([]);

        expect(a.length).toBeGreaterThanOrEqual(4);
        expect(a.toArray()).toEqual([1, 2, 3, 4]);
        expect(b.length).toEqual(0);
        expect(b.toArray()).toEqual([]);
    });
});

describe('Denque.prototype.toArray', function () {
    it('should return an array', function () {
        var a = new Denque([1, 2, 3, 4]);
        expect(a.toArray()).toEqual([1, 2, 3, 4]);
    });
});

describe('Denque.prototype.push', function () {
    it('Should do nothing if no arguments', function () {
        var a = new Denque();
        var before = a.length;
        var ret = a.push();
        expect(ret === before).toBeTruthy();
        expect(a.length === ret).toBeTruthy();
        expect(ret === 0).toBeTruthy();
    });

    it('Should add falsey elements (except undefined)', function () {
        var a = new Denque();
        // var before = a.length;
        var ret = a.push(0);
        shouldBeStrictEqual(ret, 1);
        shouldBeStrictEqual(a.length, 1);
        shouldBeStrictEqual(a.get(0), 0);
        ret = a.push('');
        shouldBeStrictEqual(ret, 2);
        shouldBeStrictEqual(a.length, 2);
        shouldBeStrictEqual(a.get(1), '');
        ret = a.push(null);
        shouldBeStrictEqual(ret, 3);
        shouldBeStrictEqual(a.length, 3);
        shouldBeStrictEqual(a.get(2), null);
    });

    it('Should add single argument - plenty of capacity', function () {
        var a = new Denque([1, 2, 3, 4, 5]);
        expect(a._list.length - a.length > 1).toBeTruthy();
        var before = a.length;
        var ret = a.push(1);
        expect(ret === before + 1).toBeTruthy();
        expect(a.length === ret).toBeTruthy();
        expect(ret === 6).toBeTruthy();
        shouldBeDeepEqual(a.toArray(), [1, 2, 3, 4, 5, 1]);
    });

    it('Should add single argument - exact capacity', function () {
        var a = new Denque([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
        expect(a._list.length - a.length === 1).toBeTruthy();
        var before = a.length;
        var ret = a.push(1);
        expect(ret === before + 1).toBeTruthy();
        expect(a.length === ret).toBeTruthy();
        expect(ret === 16).toBeTruthy();
        shouldBeDeepEqual(a.toArray(), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1]);
    });

    it('Should add single argument - over capacity', function () {
        var a = new Denque([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
        expect(a._list.length / a.length === 2).toBeTruthy();
        var before = a.length;
        var ret = a.push(1);
        expect(ret === before + 1).toBeTruthy();
        expect(a.length === ret).toBeTruthy();
        expect(ret === 17).toBeTruthy();
        shouldBeDeepEqual(a.toArray(), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 1]);
    });

    it('should respect capacity', function () {
        var a = new Denque([1, 2, 3], { capacity: 3 });
        a.push(4);

        shouldBeEqual(a.size(), 3);
        shouldBeEqual(a.peekAt(0), 2);
        shouldBeEqual(a.peekAt(1), 3);
        shouldBeEqual(a.peekAt(2), 4);
    });

});

describe('Denque.prototype.unshift', function () {

    it('Should do nothing if no arguments', function () {
        var a = new Denque();
        var before = a.length;
        var ret = a.unshift();
        expect(ret === before).toBeTruthy();
        expect(a.length === ret).toBeTruthy();
        expect(ret === 0).toBeTruthy();
    });

    it('Should unshift falsey elements (except undefined)', function () {
        var a = new Denque();
        // var before = a.length;
        var ret = a.unshift(0);
        shouldBeStrictEqual(ret, 1);
        shouldBeStrictEqual(a.length, 1);
        shouldBeStrictEqual(a.get(0), 0);
        ret = a.unshift('');
        shouldBeStrictEqual(ret, 2);
        shouldBeStrictEqual(a.length, 2);
        shouldBeStrictEqual(a.get(0), '');
        ret = a.unshift(null);
        shouldBeStrictEqual(ret, 3);
        shouldBeStrictEqual(a.length, 3);
        shouldBeStrictEqual(a.get(0), null);
    });

    it('Should add single argument - plenty of capacity', function () {
        var a = new Denque([1, 2, 3, 4, 5]);
        expect(a._list.length - a.length > 1).toBeTruthy();
        var before = a.length;
        var ret = a.unshift(1);
        expect(ret === before + 1).toBeTruthy();
        expect(a.length === ret).toBeTruthy();
        expect(ret === 6).toBeTruthy();
        shouldBeDeepEqual(a.toArray(), [1, 1, 2, 3, 4, 5]);
    });

    it('Should add single argument - exact capacity', function () {
        var a = new Denque([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
        expect(a._list.length - a.length === 1).toBeTruthy();
        var before = a.length;
        var ret = a.unshift(1);
        expect(ret === before + 1).toBeTruthy();
        expect(a.length === ret).toBeTruthy();
        expect(ret === 16).toBeTruthy();
        shouldBeDeepEqual(a.toArray(), [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    });

    it('Should add single argument - over capacity', function () {
        var a = new Denque([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
        expect(a._list.length / a.length === 2).toBeTruthy();
        var before = a.length;
        var ret = a.unshift(1);
        expect(ret === before + 1).toBeTruthy();
        expect(a.length === ret).toBeTruthy();
        expect(ret === 17).toBeTruthy();
        shouldBeDeepEqual(a.toArray(), [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    });

    it('should respect capacity', function () {
        var a = new Denque([1, 2, 3], { capacity: 3 });
        a.unshift(0);

        shouldBeEqual(a.size(), 3);
        shouldBeEqual(a.peekAt(0), 0);
        shouldBeEqual(a.peekAt(1), 1);
        shouldBeEqual(a.peekAt(2), 2);
    });

});

describe('Denque.prototype.pop', function () {
    it('Should return undefined when empty denque', function () {
        var a = new Denque();
        expect(a.length === 0).toBeTruthy();
        expect(a.pop() === undefined).toBeTruthy();
        expect(a.pop() === undefined).toBeTruthy();
        expect(a.length === 0).toBeTruthy();
    });

    it('Should return the item at the back of the denque', function () {
        var a = new Denque([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        var b = [];

        b.push(1, 2, 3, 4, 5, 6, 7, 8, 9);

        expect(a.pop() === 9).toBeTruthy();
        expect(a.pop() === 8).toBeTruthy();
        b.pop();
        b.pop();
        shouldBeDeepEqual(a.toArray(), b);
        a.unshift(5);
        a.unshift(4);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.push(1);
        a.push(2);
        a.push(3);
        a.push(4);
        a.push(5);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.pop();
        b.unshift(1, 2, 3, 4, 5);
        b.push(1, 2, 3, 4, 5);
        b.unshift(1, 2, 3);
        b.pop();
        shouldBeDeepEqual(a.toArray(), b);
        expect(a.pop() === b.pop()).toBeTruthy();
        shouldBeDeepEqual(a.toArray(), b);
    });
});

describe('Deque.prototype.shift', function () {
    it('Should return undefined when empty denque', function () {
        var a = new Denque();
        expect(a.length === 0).toBeTruthy();
        expect(a.shift() === undefined).toBeTruthy();
        expect(a.shift() === undefined).toBeTruthy();
        expect(a.length === 0).toBeTruthy();
    });

    it('Should return the item at the front of the denque', function () {
        var a = new Denque([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        var b = [];

        b.push(1, 2, 3, 4, 5, 6, 7, 8, 9);

        expect(a.shift() === 1).toBeTruthy();
        expect(a.shift() === 2).toBeTruthy();
        b.shift();
        b.shift();
        shouldBeDeepEqual(a.toArray(), b);
        a.unshift(5);
        a.unshift(4);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.push(1);
        a.push(2);
        a.push(3);
        a.push(4);
        a.push(5);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.shift();
        b.unshift(1, 2, 3, 4, 5);
        b.push(1, 2, 3, 4, 5);
        b.unshift(1, 2, 3);
        b.shift();
        shouldBeDeepEqual(a.toArray(), b);
        expect(a.shift() === b.shift()).toBeTruthy();
        shouldBeDeepEqual(a.toArray(), b);
    });
});

describe('Denque.prototype.get', function () {
    it('should return undefined on nonsensical argument', function () {
        var a = new Denque([1, 2, 3, 4]);
        expect(a.get(-5) === undefined).toBeTruthy();
        expect(a.get(-100) === undefined).toBeTruthy();
        expect(a.get(undefined as any) === undefined).toBeTruthy();
        expect(a.get('1' as any) === undefined).toBeTruthy();
        expect(a.get(NaN) === undefined).toBeTruthy();
        expect(a.get(Infinity) === undefined).toBeTruthy();
        expect(a.get(-Infinity) === undefined).toBeTruthy();
        expect(a.get(1.5) === undefined).toBeTruthy();
        expect(a.get(4) === undefined).toBeTruthy();
    });

    it('should support positive indexing', function () {
        var a = new Denque([1, 2, 3, 4]);
        expect(a.get(0) === 1).toBeTruthy();
        expect(a.get(1) === 2).toBeTruthy();
        expect(a.get(2) === 3).toBeTruthy();
        expect(a.get(3) === 4).toBeTruthy();
    });

    it('should support negative indexing', function () {
        var a = new Denque([1, 2, 3, 4]);
        expect(a.get(-1) === 4).toBeTruthy();
        expect(a.get(-2) === 3).toBeTruthy();
        expect(a.get(-3) === 2).toBeTruthy();
        expect(a.get(-4) === 1).toBeTruthy();
    });
});

describe('Denque.prototype.isEmpty', function () {
    it('should return true on empty denque', function () {
        var a = new Denque();
        expect(a.isEmpty()).toBeTruthy();
    });

    it('should return false on denque with items', function () {
        var a = new Denque([1]);
        expect(!a.isEmpty()).toBeTruthy();
    });
});

describe('Denque.prototype.peekFront', function () {
    it('Should return undefined when queue is empty', function () {
        var a = new Denque();
        expect(a.length === 0).toBeTruthy();
        expect(a.peekFront() === undefined).toBeTruthy();
        expect(a.peekFront() === undefined).toBeTruthy();
        expect(a.length === 0).toBeTruthy();
    });

    it('should return the item at the front of the denque', function () {
        var a = new Denque([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect(a.peekFront() === 1).toBeTruthy();

        var l = 5;
        while (l--) a.pop();

        shouldBeDeepEqual(a.toArray(), [1, 2, 3, 4]);

        expect(a.peekFront() === 1).toBeTruthy();
    });
});

describe('Denque.prototype.peekBack', function () {
    it('Should return undefined when queue is empty', function () {
        var a = new Denque();
        expect(a.length === 0).toBeTruthy();
        expect(a.peekBack() === undefined).toBeTruthy();
        expect(a.peekBack() === undefined).toBeTruthy();
        expect(a.length === 0).toBeTruthy();
    });

    it('should return the item at the back of the denque', function () {
        var a = new Denque([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect(a.peekBack() === 9).toBeTruthy();

        var l = 5;
        while (l--) a.pop();

        shouldBeDeepEqual(a.toArray(), [1, 2, 3, 4]);

        expect(a.peekBack() === 4).toBeTruthy();
    });
});


describe('Denque.prototype.clear', function () {
    it('should clear the denque', function () {
        var a = new Denque([1, 2, 3, 4]);
        expect(!a.isEmpty()).toBeTruthy();
        a.clear();
        expect(a.isEmpty()).toBeTruthy();
    });
});


describe('Denque.prototype.removeOne', function () {
    it('Should return undefined when empty denque', function () {
        var a = new Denque();
        expect(a.length === 0).toBeTruthy();
        expect(a.removeOne(1) === undefined).toBeTruthy();
        expect(a.length === 0).toBeTruthy();
    });

    it('Should return undefined when index is invalid', function () {
        var a = new Denque();
        var b = new Denque();
        b.push('foobar');
        b.push('foobaz');
        expect(a.length === 0).toBeTruthy();
        expect(a.removeOne('foobar' as any) === undefined).toBeTruthy();
        expect(a.removeOne({} as any) === undefined).toBeTruthy();
        expect(a.length === 0).toBeTruthy();
    });

});

describe('Denque.prototype.remove', function () {
    it('Should return undefined when empty denque', function () {
        var a = new Denque();
        expect(a.length === 0).toBeTruthy();
        expect(a.remove(1, undefined as any) === undefined).toBeTruthy();
        expect(a.remove(2, 3) === undefined).toBeTruthy();
        expect(a.length === 0).toBeTruthy();
    });

    it('remove from the end of the queue if a negative index is provided', function () {
        var q = new Denque();
        q.push(1); // 1
        q.push(2); // 2
        q.push(3); // 3
        expect(q.length === 3).toBeTruthy();
        shouldBeDeepEqual(q.remove(-2, 2), [2, 3]); // [ 2, 3 ]
        expect(q.length === 1).toBeTruthy();
    });

    it('Should return undefined if index or count invalid', function () {
        var a = new Denque();
        var b = new Denque();
        b.push('foobar');
        b.push('foobaz');
        expect(a.length === 0).toBeTruthy();
        expect(a.remove('foobar' as any, 10) === undefined).toBeTruthy();
        expect(b.remove(-1, 0) === undefined).toBeTruthy();
        expect(b.remove(-1, 2)?.length === 1).toBeTruthy();
        expect(b.remove(-5, 1) === undefined).toBeTruthy();
        expect(b.remove(66, 0) === undefined).toBeTruthy();
        expect(a.remove({} as any, 10) === undefined).toBeTruthy();
        expect(a.length === 0).toBeTruthy();
    });

    it('Should return the item at the front of the denque', function () {
        var a = new Denque([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        var b = [];
        b.push(1, 2, 3, 4, 5, 6, 7, 8, 9);

        shouldBeDeepEqual(a.remove(0, 1), b.splice(0, 1));
        shouldBeDeepEqual(a.remove(0, 1), b.splice(0, 1));
        shouldBeDeepEqual(a.toArray(), b);
        a.unshift(5);
        a.unshift(4);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.push(1);
        a.push(2);
        a.push(3);
        a.push(4);
        a.push(5);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.remove(0, 1);
        b.unshift(1, 2, 3, 4, 5);
        b.push(1, 2, 3, 4, 5);
        b.unshift(1, 2, 3);
        b.splice(0, 1);
        shouldBeDeepEqual(a.toArray(), b);
        shouldBeDeepEqual(a.remove(0, 1), b.splice(0, 1));
        shouldBeDeepEqual(a.toArray(), b);
    });

    it('Should return the item at the back of the denque', function () {
        var a = new Denque([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        var b = [];

        b.push(1, 2, 3, 4, 5, 6, 7, 8, 9);
        shouldBeDeepEqual(a.remove(8, 1), b.splice(8, 1));
        shouldBeDeepEqual(a.toArray(), b);
        a.unshift(5);
        a.unshift(4);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.push(1);
        a.push(2);
        a.push(3);
        a.push(4);
        a.push(5);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.remove(20, 1);
        b.unshift(1, 2, 3, 4, 5);
        b.push(1, 2, 3, 4, 5);
        b.unshift(1, 2, 3);
        b.splice(20, 1);
        shouldBeDeepEqual(a.toArray(), b);
        shouldBeDeepEqual(a.remove(19, 1), b.splice(19, 1));
        shouldBeDeepEqual(a.toArray(), b);
    });

    it('Should return the item somewhere in the middle of the denque', function () {
        var a = new Denque([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        var b = [];
        b.push(1, 2, 3, 4, 5, 6, 7, 8, 9);

        expect(!!a.remove(4, 1)).toBeTruthy();
        expect(b.splice(4, 1)).toBeTruthy();
        expect(a.remove(5, 1)).toBeTruthy();
        expect(b.splice(5, 1)).toBeTruthy();
        expect(a.remove(3, 1)).toBeTruthy();
        expect(b.splice(3, 1)).toBeTruthy();
        shouldBeDeepEqual(a.toArray(), b);
        a.unshift(5);
        a.unshift(4);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.push(1);
        a.push(2);
        a.push(3);
        a.push(4);
        a.push(5);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.remove(7, 1);
        b.unshift(1, 2, 3, 4, 5);
        b.push(1, 2, 3, 4, 5);
        b.unshift(1, 2, 3);
        b.splice(7, 1);

        shouldBeDeepEqual(a.toArray(), b);
        shouldBeDeepEqual(a.remove(1, 4), b.splice(1, 4));
        shouldBeDeepEqual(a.toArray(), b);
    });

    it('Should remove a number of items at the front of the denque', function () {
        var a = new Denque([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        var b = [];
        b.push(1, 2, 3, 4, 5, 6, 7, 8, 9);

        shouldBeDeepEqual(a.remove(0, 5), b.splice(0, 5));
        shouldBeDeepEqual(a.toArray(), b);
        a.unshift(5);
        a.unshift(4);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.push(1);
        a.push(2);
        a.push(3);
        a.push(4);
        a.push(5);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.remove(0, 11);
        b.unshift(1, 2, 3, 4, 5);
        b.push(1, 2, 3, 4, 5);
        b.unshift(1, 2, 3);
        b.splice(0, 11);

        shouldBeDeepEqual(a.toArray(), b);
        shouldBeDeepEqual(a.remove(0, 1), b.splice(0, 1));
        shouldBeDeepEqual(a.toArray(), b);
    });

    it('Should remove a number of items at the back of the denque', function () {
        var a = new Denque([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        var b = [];
        b.push(1, 2, 3, 4, 5, 6, 7, 8, 9);

        shouldBeDeepEqual(a.remove(5, 4), b.splice(5, 4));
        shouldBeDeepEqual(a.toArray(), b);
        a.unshift(5);
        a.unshift(4);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.push(1);
        a.push(2);
        a.push(3);
        a.push(4);
        a.push(5);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.remove(16, 3);
        b.unshift(1, 2, 3, 4, 5);
        b.push(1, 2, 3, 4, 5);
        b.unshift(1, 2, 3);
        b.splice(16, 3);

        shouldBeDeepEqual(a.toArray(), b);
        shouldBeDeepEqual(a.remove(5, 100), b.splice(5, 100));
        shouldBeDeepEqual(a.toArray(), b);
    });

    it('Should remove a number of items somewhere in the middle of the denque', function () {
        var a = new Denque([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        var b = [];
        b.push(1, 2, 3, 4, 5, 6, 7, 8, 9);

        shouldBeDeepEqual(a.remove(3, 3), b.splice(3, 3));
        shouldBeDeepEqual(a.toArray(), b);
        a.unshift(5);
        a.unshift(4);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.push(1);
        a.push(2);
        a.push(3);
        a.push(4);
        a.push(5);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        // console.log(a.toArray())
        a.remove(8, 6);
        b.unshift(1, 2, 3, 4, 5);
        b.push(1, 2, 3, 4, 5);
        b.unshift(1, 2, 3);
        b.splice(8, 6);

        shouldBeDeepEqual(a.toArray(), b);
        shouldBeDeepEqual(a.remove(3, 3), b.splice(3, 3));
        shouldBeDeepEqual(a.toArray(), b);
    });

    it('Should clear denque', function () {
        var a = new Denque([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        var b = [];

        b.push(1, 2, 3, 4, 5, 6, 7, 8, 9);
        a.remove(0, 9);
        b.splice(0, 9);
        shouldBeDeepEqual(a.toArray(), b)
    });
});

describe('Denque.prototype.splice', function () {
    it('Should remove and add items like native splice method at the front of denque', function () {
        var a = new Denque<number | number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        var b: (number | (number[]))[] = [];
        b.push(1, 2, 3, 4, 5, 6, 7, 8, 9);

        shouldBeDeepEqual(a.splice(0, 2, 14, 15, 16), [1, 2]); // remove then add
        a.splice(0, 0, [11, 12, 13]); // add

        b.splice(0, 2, 14, 15, 16);
        b.splice(0, 0, [11, 12, 13]);
        shouldBeDeepEqual(a.toArray(), b);
        a.unshift(5);
        a.unshift(4);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.push(1);
        a.push(2);
        a.push(3);
        a.push(4);
        a.push(5);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.splice(0, 0, 17, 18, 19);
        b.unshift(1, 2, 3, 4, 5);
        b.push(1, 2, 3, 4, 5);
        b.unshift(1, 2, 3);
        b.splice(0, 0, 17, 18, 19);
        shouldBeDeepEqual(a.toArray(), b);
        shouldBeDeepEqual(a.splice(0, 2), b.splice(0, 2)); //remove
        shouldBeDeepEqual(a.toArray(), b);
    });

    it('Should remove and add items like native splice method at the end of denque', function () {
        var a = new Denque<number | number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        var b: (number | (number[]))[] = [];
        b.push(1, 2, 3, 4, 5, 6, 7, 8, 9);

        shouldBeDeepEqual(a.splice(a.length - 1, 1, 14, 15, 16), [9]); // remove then add
        a.splice(a.length, 0, [11, 12, 13]); // add

        b.splice(b.length - 1, 1, 14, 15, 16);
        b.splice(b.length, 0, [11, 12, 13]);
        shouldBeDeepEqual(a.toArray(), b);
        a.unshift(5);
        a.unshift(4);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.push(1);
        a.push(2);
        a.push(3);
        a.push(4);
        a.push(5);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.splice(a.length, 0, 17, 18, 19);
        b.unshift(1, 2, 3, 4, 5);
        b.push(1, 2, 3, 4, 5);
        b.unshift(1, 2, 3);
        b.splice(b.length, 0, 17, 18, 19);
        shouldBeDeepEqual(a.toArray(), b);
        a.splice(18, 0, 18, 19);
        b.splice(18, 0, 18, 19);
        shouldBeDeepEqual(a.toArray(), b);
        a.splice(21, 0, 1, 2, 3, 4, 5, 6);
        b.splice(21, 0, 1, 2, 3, 4, 5, 6);
        shouldBeDeepEqual(a.toArray(), b);
        shouldBeDeepEqual(a.splice(a.length - 1, 2), b.splice(b.length - 1, 2)); //remove
        shouldBeDeepEqual(a.toArray(), b);
    });

    it('Should remove and add items like native splice method somewhere in the middle of denque', function () {
        var a = new Denque<number | number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        var b: (number | number[])[] = [];
        b.push(1, 2, 3, 4, 5, 6, 7, 8, 9);

        a.splice(2, 0, [11, 12, 13]);
        shouldBeDeepEqual(a.splice(7, 2, 14, 15, 16), [7, 8]); // remove then add
        shouldBeDeepEqual(a.splice(10, 1, 17, 18), [9]);

        b.splice(2, 0, [11, 12, 13]);
        b.splice(7, 2, 14, 15, 16);
        b.splice(10, 1, 17, 18);
        shouldBeDeepEqual(a.toArray(), b);
        a.unshift(5);
        a.unshift(4);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        a.push(1);
        a.push(2);
        a.push(3);
        a.push(4);
        a.push(5);
        a.unshift(3);
        a.unshift(2);
        a.unshift(1);
        b.unshift(1, 2, 3, 4, 5);
        b.push(1, 2, 3, 4, 5);
        b.unshift(1, 2, 3);

        shouldBeDeepEqual(a.splice(3, 3, 16, 15, 14), b.splice(3, 3, 16, 15, 14));
        shouldBeDeepEqual(a.toArray(), b);
        shouldBeDeepEqual(a.splice(6, 1), b.splice(6, 1));
        shouldBeDeepEqual(a.toArray(), b);
    });

    it('Should return undefined when index or count is invalid', function () {
        var a = new Denque();
        var b = new Denque();
        b.push('foobar');
        b.push('foobaz');
        expect(a.length === 0).toBeTruthy();
        expect(a.splice('foobar' as any, 10 as any) === undefined).toBeTruthy();
        expect(b.splice(-1, 0) === undefined).toBeTruthy();
        expect(b.splice(-5, 1) === undefined).toBeTruthy();
        expect(b.splice(66, 0) === undefined).toBeTruthy();
        expect(a.splice({} as unknown as any, 10) === undefined).toBeTruthy();
        expect(a.length === 0).toBeTruthy();
    });

    it('Should return undefined when the queue is empty', function () {
        var a = new Denque();
        expect(a.length === 0).toBeTruthy();
        expect(a.splice(1, 0) === undefined).toBeTruthy();
    });

    it('Should return undefined when trying to remove further than current size', function () {
        var a = new Denque();
        a.push('foobar');
        a.push('foobar1');
        a.push('foobar2');
        a.push('foobar3');
        expect(a.length === 4).toBeTruthy();
        expect(a.splice(4, 234) === undefined).toBeTruthy();
    });

    it('Should remove and add items like native splice method to the empty denque', function () {
        var a = new Denque();
        shouldBeDeepEqual(a.splice(0, 0, 1), []);
        shouldBeDeepEqual(a.toArray(), [1]);
        a.clear();
        shouldBeDeepEqual(a.splice(0, 0, 1, 2, 3, 4, 5), []);
        shouldBeDeepEqual(a.toArray(), [1, 2, 3, 4, 5]);
        a.clear();
        shouldBeDeepEqual(a.splice(0, 1, 1, 2), undefined); // try to add and remove together
        shouldBeDeepEqual(a.toArray(), [1, 2]);

        var b = new Denque<number>([]); // initialized via empty array
        shouldBeDeepEqual(b.splice(0, 0, 1), []);
        shouldBeDeepEqual(b.toArray(), [1])
    });


    it('pop should shrink array when mostly empty', function () {
        var a = new Denque();
        for (var i = 0; i < 50000; i++) {
            a.push(i);
        }
        var maskA = a._capacityMask;
        for (var ii = 0; ii < 35000; ii++) {
            a.pop();
        }
        var maskB = a._capacityMask;
        expect(maskA > maskB).toBeTruthy();
    });
});
