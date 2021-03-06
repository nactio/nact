let perf: any;

class Deadline {
  limit: number;
  performance: any;
  now: number;
  constructor(limit = 10) {
    this.limit = limit;
    this.performance = Deadline.getPerformance();
    this.now = this.getTime();
  }

  getTime() {
    return this.performance ? global.performance.now() : Date.now();
  }

  timeRemaining() {
    const out = this.limit - (this.getTime() - this.now);
    if (out > 0) {
      return out;
    }
    return 0;
  }

  static getPerformance() {
    if (perf === undefined) {
      perf = !!(global.performance && global.performance.now && typeof global.performance.now === 'function');
    }
    return perf;
  }
}

const test = () => !(global as any).process?.browser && global && typeof global.setImmediate === 'function';

const install = (func: (deadline: Deadline) => any) => () => global.setImmediate(() => func(new Deadline()));

const setImmediate = Object.freeze({
  test: test,
  install: install
});

// The test against `importScripts` prevents this implementation from being installed inside a web worker,
// where `global.postMessage` means something completely different and can't be used for this purpose.
function test$1() {
  if (!global.postMessage || (global as any).importScripts) {
    return false;
  }
  if ((global as any).setImmediate) {
    // we can only get here in IE10
    // which doesn't handel postMessage well
    return false;
  }
  let postMessageIsAsynchronous = true;
  const oldOnMessage = global.onmessage;
  global.onmessage = function () {
    postMessageIsAsynchronous = false;
  };
  global.postMessage('', '*');
  global.onmessage = oldOnMessage;

  return postMessageIsAsynchronous;
}

function install$1(func: (deadline: Deadline) => any) {
  const codeWord = 'macrotask' + Math.random();
  function globalMessage(event: any) {
    if (event.source === global && event.data === codeWord) {
      func(new Deadline());
    }
  }
  if (global.addEventListener) {
    global.addEventListener('message', globalMessage, false);
  } else {
    (global as any).attachEvent('onmessage', globalMessage);
  }
  return function () {
    global.postMessage(codeWord, '*');
  };
}

const postMessage = Object.freeze({
  test: test$1,
  install: install$1
});

function test$2() {
  if ((global as any).setImmediate) {
    // we can only get here in IE10
    // which doesn't handel postMessage well
    return false;
  }
  return typeof global.MessageChannel !== 'undefined';
}

function install$2(func: (deadline: Deadline) => any) {
  const channel = new global.MessageChannel();
  channel.port1.onmessage = () => func(new Deadline());
  return function () {
    channel.port2.postMessage(0);
  };
}

const messageChannel = Object.freeze({
  test: test$2,
  install: install$2
});

const test$3 = () =>
  'document' in global && 'onreadystatechange' in global.document.createElement('script');

const install$3 = (handle: (deadline: Deadline) => any) => function () {
  // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
  // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
  let scriptEl: any = global.document.createElement('script');
  scriptEl.onreadystatechange = function () {
    handle(new Deadline());

    scriptEl.onreadystatechange = null;
    scriptEl.parentNode.removeChild(scriptEl);
    scriptEl = null;
  };
  global.document.documentElement.appendChild(scriptEl);

  return handle;
};

const stateChange = Object.freeze({
  test: test$3,
  install: install$3
});

const test$4 = () => true;

function install$4(t: any) {
  return function () {
    setTimeout(() => {
      t(new Deadline());
    }, 0);
  };
}

const timeout = Object.freeze({
  test: test$4,
  install: install$4
});

const test$5 = () => typeof (global as any).requestIdleCallback === 'function';
const install$5 = (func: any) => () => (global as any).requestIdleCallback(func);

const idleCallback = Object.freeze({
  test: test$5,
  install: install$5
});

const types = [
  setImmediate,
  idleCallback,
  postMessage,
  messageChannel,
  stateChange,
  timeout
];

const creatNextTick = function (drainQueue: any) {
  for (const type of types) {
    if (type.test()) {
      return type.install(drainQueue);
    }
  }
};

export class CancelToken {
  __cancel_token__!: void;
}

// v8 likes predictible objects
class Item {
  fun: any;
  array: any;
  token: CancelToken;
  prev: any;
  next: any;
  list: any;
  constructor(fun: any, array: any[], list: any) {
    this.fun = fun;
    this.array = array;
    this.token = new CancelToken();
    this.prev = null;
    this.next = null;
    this.list = list;
  }

  run() {
    const fun = this.fun;
    const array = this.array;
    switch (array.length) {
      case 0:
        fun();
        break;
      case 1:
        fun(array[0]);
        break;
      case 2:
        fun(array[0], array[1]);
        break;
      case 3:
        fun(array[0], array[1], array[2]);
        break;
      default:
        fun(...array);
        break;
    }
  }

  cancel() {
    const next = this.next;
    const prev = this.prev;
    if (next === null) {
      if (prev === null) {
        // only thing on list
        if (this.list.head === this && this.list.length === 1) {
          // sanity check
          this.list.head = this.list.tail = null;
        } else {
          return;
        }
      } else {
        prev.next = null;
        this.list.tail = prev;
        // tail of list
      }
    } else {
      if (prev === null) {
        // head of list
        next.prev = null;
        this.list.head = next;
      } else {
        // middle of list
        prev.next = next;
        next.prev = prev;
      }
    }
    this.list.length--;
  }
}

class List {
  length: number;
  head: any;
  tail: any;
  cache: WeakMap<object, any>;
  constructor() {
    this.length = 0;
    this.head = null;
    this.tail = null;
    this.cache = new WeakMap();
  }

  push(func: any, args: any) {
    const item = new Item(func, args, this);
    if (this.length > 0) {
      const currentTail = this.tail;
      currentTail.next = item;
      item.prev = currentTail;
      this.tail = item;
    } else {
      this.head = this.tail = item;
    }
    this.length++;
    this.cache.set(item.token, item);
    return item.token;
  }

  shift() {
    if (this.length < 1) {
      return;
    }
    const item = this.head;
    if (this.length === 1) {
      this.head = this.tail = null;
    } else {
      const newHead = item.next;
      newHead.prev = null;
      this.head = newHead;
    }
    this.length--;
    this.cache.delete(item.token);
    return item;
  }

  cancel(token: CancelToken) {
    const item = this.cache.get(token);
    if (item) {
      this.cache.delete(token);
    } else {
      return false;
    }
    item.cancel();
    return true;
  }
}

const list = new List();
let inProgress = false;
let nextTick: any;

function drainQueue(idleDeadline: Deadline) {
  if (!list.length) {
    inProgress = false;
    return;
  }
  const task = list.shift();
  if (!list.length) {
    inProgress = false;
  } else {
    nextTick();
  }
  task.run();
  if (!idleDeadline) {
    return;
  }
  while (idleDeadline.timeRemaining() > 0 && list.length) {
    const task = list.shift();
    task.run();
  }
}
export function run<TArgs extends any[]>(
  task: (...args: TArgs) => void,
  ...args: TArgs
): CancelToken {
  const token = list.push(task, args);
  if (inProgress) {
    return token;
  }
  if (!nextTick) {
    nextTick = creatNextTick(drainQueue);
  }
  inProgress = true;
  nextTick();
  return token as CancelToken;
}

export function clear(cancel: CancelToken): void | boolean {
  return list.cancel(cancel);
}
