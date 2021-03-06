'use strict';

interface IDenqueOptions {
  capacity?: number
}

/**
 * Custom implementation of a double ended queue.
 */
export default class Denque<T> {
  _head: number;
  _tail: number;
  _capacity: number | undefined;
  _capacityMask: number;
  _list: any[];

  constructor(array?: T[], options?: IDenqueOptions) {
    const thisOptions = options || {};
    this._head = 0;
    this._tail = 0;
    this._capacity = thisOptions.capacity;
    this._capacityMask = 0x3;
    this._list = new Array(4);
    if (Array.isArray(array)) {
      this._fromArray(array);
    }
  }


  /**
   * Add an item to the bottom of the list.
   * @param item
   */
  push(item?: T): number {
    if (item === undefined) return this.size();
    const tail = this._tail;
    this._list[tail] = item;
    this._tail = (tail + 1) & this._capacityMask;
    if (this._tail === this._head) {
      this._growArray();
    }
    if (this._capacity && this.size() > this._capacity) {
      this.shift();
    }
    if (this._head < this._tail) return this._tail - this._head;
    else return this._capacityMask + 1 - (this._head - this._tail);
  };

  /**
   * Add an item at the beginning of the list.
   * @param item
   */
  unshift(item?: T): number {
    if (item === undefined) return this.size();
    const len = this._list.length;
    this._head = (this._head - 1 + len) & this._capacityMask;
    this._list[this._head] = item;
    if (this._tail === this._head) this._growArray();
    if (this._capacity && this.size() > this._capacity) this.pop();
    if (this._head < this._tail) return this._tail - this._head;
    else return this._capacityMask + 1 - (this._head - this._tail);
  };

  /**
   * Remove and return the last item on the list.
   * Returns undefined if the list is empty.
   * @returns {*}
   */
  pop(): T | undefined {
    const tail = this._tail;
    if (tail === this._head) return undefined;
    const len = this._list.length;
    this._tail = (tail - 1 + len) & this._capacityMask;
    const item = this._list[this._tail];
    this._list[this._tail] = undefined;
    if (this._head < 2 && tail > 10000 && tail <= len >>> 2) this._shrinkArray();
    return item;
  };


  /**
   * Returns the item that is at the back of the queue without removing it.
   * Uses peekAt(-1)
   */
  peekBack(): T | undefined {
    return this.peekAt(-1);
  }

  /**
    * Alias for peek()
    * @returns {*}
    */
  peekFront(): T | undefined {
    return this.peek();
  }

  /**
 * Returns the item at the specified index from the list.
 * 0 is the first element, 1 is the second, and so on...
 * Elements at negative values are that many from the end: -1 is one before the end
 * (the last element), -2 is two before the end (one before last), etc.
 * @param index
 * @returns {*}
 */
  peekAt(index: number): T | undefined {
    let i = index;
    // expect a number or return undefined
    if ((i !== (i | 0))) {
      return undefined;
    }
    const len = this.size();
    if (i >= len || i < -len) return undefined;
    if (i < 0) i += len;
    i = (this._head + i) & this._capacityMask;
    return this._list[i];
  }

  /**
 * Alias for peekAt()
 * @param i
 * @returns {*}
 */
  get(index: number): T | undefined {
    return this.peekAt(index);
  }


  /**
   * Remove number of items from the specified index from the list.
   * Returns array of removed items.
   * Returns undefined if the list is empty.
   * @param index
   * @param count
   * @returns {array}
   */
  remove(index: number, count: number): T[] | undefined {
    let i = index;
    let removed;
    let delCount = count;
    // expect a number or return undefined
    if ((i !== (i | 0))) {
      return undefined;
    }
    if (this._head === this._tail) return undefined;
    const size = this.size();
    const len = this._list.length;
    if (i >= size || i < -size || count < 1) return undefined;
    if (i < 0) i += size;
    if (count === 1 || !count) {
      removed = new Array(1);
      removed[0] = this.removeOne(i);
      return removed;
    }
    if (i === 0 && i + count >= size) {
      removed = this.toArray();
      this.clear();
      return removed;
    }
    if (i + count > size) count = size - i;
    let k;
    removed = new Array(count);
    for (k = 0; k < count; k++) {
      removed[k] = this._list[(this._head + i + k) & this._capacityMask];
    }
    i = (this._head + i) & this._capacityMask;
    if (index + count === size) {
      this._tail = (this._tail - count + len) & this._capacityMask;
      for (k = count; k > 0; k--) {
        this._list[i = (i + 1 + len) & this._capacityMask] = undefined;
      }
      return removed;
    }
    if (index === 0) {
      this._head = (this._head + count + len) & this._capacityMask;
      for (k = count - 1; k > 0; k--) {
        this._list[i = (i + 1 + len) & this._capacityMask] = undefined;
      }
      return removed;
    }
    if (i < size / 2) {
      this._head = (this._head + index + count + len) & this._capacityMask;
      for (k = index; k > 0; k--) {
        this.unshift(this._list[i = (i - 1 + len) & this._capacityMask]);
      }
      i = (this._head - 1 + len) & this._capacityMask;
      while (delCount > 0) {
        this._list[i = (i - 1 + len) & this._capacityMask] = undefined;
        delCount--;
      }
      if (index < 0) this._tail = i;
    } else {
      this._tail = i;
      i = (i + count + len) & this._capacityMask;
      for (k = size - (count + index); k > 0; k--) {
        this.push(this._list[i++]);
      }
      i = this._tail;
      while (delCount > 0) {
        this._list[i = (i + 1 + len) & this._capacityMask] = undefined;
        delCount--;
      }
    }
    if (this._head < 2 && this._tail > 10000 && this._tail <= len >>> 2) this._shrinkArray();
    return removed;
  };


  /**
   * Remove and return the item at the specified index from the list.
   * Returns undefined if the list is empty.
   * @param index
   * @returns {*}
   */
  removeOne(index: number): T | undefined {
    let i = index;
    // expect a number or return undefined
    if ((i !== (i | 0))) {
      return undefined;
    }
    if (this._head === this._tail) return undefined;
    const size = this.size();
    const len = this._list.length;
    if (i >= size || i < -size) return undefined;
    if (i < 0) i += size;
    i = (this._head + i) & this._capacityMask;
    const item = this._list[i];
    let k;
    if (index < size / 2) {
      for (k = index; k > 0; k--) {
        this._list[i] = this._list[i = (i - 1 + len) & this._capacityMask];
      }
      this._list[i] = undefined;
      this._head = (this._head + 1 + len) & this._capacityMask;
    } else {
      for (k = size - 1 - index; k > 0; k--) {
        this._list[i] = this._list[i = (i + 1 + len) & this._capacityMask];
      }
      this._list[i] = undefined;
      this._tail = (this._tail - 1 + len) & this._capacityMask;
    }
    return item;
  };


  /**
   * Native splice implementation.
   * Remove number of items from the specified index from the list and/or add new elements.
   * Returns array of removed items or empty array if count == 0.
   * Returns undefined if the list is empty.
   *
   * @param index
   * @param count
   * @param {...*} [elements]
   * @returns {array}
   */
  splice(index: number, count: number, ..._items: T[]): T[] | undefined {
    let i = index;
    // expect a number or return undefined
    if ((i !== (i | 0))) {
      return undefined;
    }
    const size = this.size();
    if (i < 0) i += size;
    if (i > size) return undefined;
    if (arguments.length > 2) {
      let k;
      let temp;
      let removed;
      let argLen = arguments.length;
      const len = this._list.length;
      let argumentsIndex = 2;
      if (!size || i < size / 2) {
        temp = new Array(i);
        for (k = 0; k < i; k++) {
          temp[k] = this._list[(this._head + k) & this._capacityMask];
        }
        if (count === 0) {
          removed = [];
          if (i > 0) {
            this._head = (this._head + i + len) & this._capacityMask;
          }
        } else {
          removed = this.remove(i, count);
          this._head = (this._head + i + len) & this._capacityMask;
        }
        while (argLen > argumentsIndex) {
          this.unshift(arguments[--argLen]);
        }
        for (k = i; k > 0; k--) {
          this.unshift(temp[k - 1]);
        }
      } else {
        temp = new Array(size - (i + count));
        const leng = temp.length;
        for (k = 0; k < leng; k++) {
          temp[k] = this._list[(this._head + i + count + k) & this._capacityMask];
        }
        if (count === 0) {
          removed = [];
          if (i !== size) {
            this._tail = (this._head + i + len) & this._capacityMask;
          }
        } else {
          removed = this.remove(i, count);
          this._tail = (this._tail - leng + len) & this._capacityMask;
        }
        while (argumentsIndex < argLen) {
          this.push(arguments[argumentsIndex++]);
        }
        for (k = 0; k < leng; k++) {
          this.push(temp[k]);
        }
      }
      return removed;
    } else {
      return this.remove(i, count);
    }
  };

  /**
   * Returns true or false whether the list is empty.
   * @returns {boolean}
   */
  isEmpty(): boolean {
    return this._head === this._tail;
  };
  /**
 * Soft clear - does not reset capacity.
 */
  clear(): void {
    this._head = 0;
    this._tail = 0;
  };

  /**
   * Returns an array of all queue items.
   * @returns {Array}
   */
  toArray(): T[] {
    return this._copyArray(false);
  };

  peek(): T | undefined {
    if (this._head === this._tail) return undefined;
    return this._list[this._head];
  };

  /**
   * Return the number of items on the list, or 0 if empty.
   * @returns {number}
   */
  get length(): number {
    return this.size();
  }
  /**
 * Return the number of items on the list, or 0 if empty.
 * @returns {number}
 */
  size() {
    if (this._head === this._tail) return 0;
    if (this._head < this._tail) return this._tail - this._head;
    else return this._capacityMask + 1 - (this._head - this._tail);
  };


  /**
   * Remove and return the first item on the list,
   * Returns undefined if the list is empty.
   * @returns {*}
   */
  shift() {
    const head = this._head;
    if (head === this._tail) return undefined;
    const item = this._list[head];
    this._list[head] = undefined;
    this._head = (head + 1) & this._capacityMask;
    if (head < 2 && this._tail > 10000 && this._tail <= this._list.length >>> 2) this._shrinkArray();
    return item;
  };

  /**
   * Fills the queue with items from an array
   * For use in the constructor
   * @param array
   * @private
   */
  private _fromArray(array: T[]) {
    for (let i = 0; i < array.length; i++) this.push(array[i]);
  };

  /**
 *
 * @param fullCopy
 * @returns {Array}
 * @private
 */
  private _copyArray(fullCopy: boolean) {
    const newArray = [];
    const list = this._list;
    const len = list.length;
    let i;
    if (fullCopy || this._head > this._tail) {
      for (i = this._head; i < len; i++) newArray.push(list[i]);
      for (i = 0; i < this._tail; i++) newArray.push(list[i]);
    } else {
      for (i = this._head; i < this._tail; i++) newArray.push(list[i]);
    }
    return newArray;
  };



  /**
   * Grows the internal list array.
   * @private
   */
  private _growArray() {
    if (this._head) {
      // copy existing data, head to end, then beginning to tail.
      this._list = this._copyArray(true);
      this._head = 0;
    }

    // head is at 0 and array is now full, safe to extend
    this._tail = this._list.length;

    this._list.length *= 2;
    this._capacityMask = (this._capacityMask << 1) | 1;
  };

  /**
   * Shrinks the internal list array.
   * @private
   */
  private _shrinkArray() {
    this._list.length >>>= 1;
    this._capacityMask >>>= 1;
  };

}
