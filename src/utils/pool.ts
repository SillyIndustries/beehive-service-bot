export default class JobPool {
  private queue: (() => void)[] = [];
  private active = 0;

  constructor(private concurrency = 4) {}

  run<T>(job: () => Promise<T> | T): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        this.active++;
        try {
          resolve(await job());
        } catch (e) {
          reject(e);
        } finally {
          this.active--;
          this.next();
        }
      };

      if (this.active < this.concurrency)
        task();
      else
        this.queue.push(task);
    });
  }

  private next() {
    if (this.queue.length && this.active < this.concurrency) {
      const task = this.queue.shift()!;
      task();
    }
  }
}