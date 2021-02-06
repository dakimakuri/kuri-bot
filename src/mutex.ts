/* An async mutex. The lock() method resolves a promise when the mutex is free.

Usage:

let mutex = new Mutex();
...
await mutex.lock();
try {
  // do stuff
} finally {
  // 'finally' ensures mutex is always released
  // even on exceptions
  mutex.release();
}
*/

export class Mutex {
  private locked = false;
  private resolves: Function[] = [];

  lock() {
    return new Promise<void>(resolve => {
      if (this.locked) {
        this.resolves.push(resolve);
      } else {
        this.locked = true;
        resolve();
      }
    });
  }

  release() {
    if (this.resolves.length > 0) {
      let fn = this.resolves.splice(0, 1);
      fn[0]();
    } else {
      this.locked = false;
    }
  }
}
