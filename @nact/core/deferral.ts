export class Deferral<T> {
  promise: Promise<T>;
  reject!: (reason?: any) => void;
  resolve!: (value: T) => void;
  dispatch!: (value: T) => void;
  done: boolean;
  constructor() {
    this.done = false;
    this.promise = new Promise<T>((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
      this.dispatch = resolve;
    });

    this.promise.then(() => { this.done = true; }).catch(() => { this.done = true; });
  }
}

