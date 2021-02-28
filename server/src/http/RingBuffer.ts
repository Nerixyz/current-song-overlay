export class RingBuffer<T> {
  private readonly data: Array<T | undefined>;
  private ptr = 0;

  constructor(public readonly length: number) {
    this.data = [...new Array(length)];
  }

  public push(item: T): T | undefined {
    const prev = this.data[this.ptr];
    this.ptr = (this.ptr + 1) % this.length;
    this.data[this.ptr] = item;

    return prev;
  }
}
