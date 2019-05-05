export class Deferral<T = any> {
  public readonly promise: Promise<T>
  public done: boolean = false
  public reject: (err: Error) => void = undefined!
  public resolve: (...value: T[]) => void = undefined!

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.reject = reject
      this.resolve = resolve
    })

    this.promise
      .then(() => {
        this.done = true
      })
      .catch(() => {
        this.done = true
      })
  }
}
