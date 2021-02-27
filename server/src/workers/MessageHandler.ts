type EventFn<T> = (data: T) => void;
type EventEntry<T> = EventFn<T> | { fn: EventFn<T>, once?: boolean };
type ArrayOrSingle<T> = T | Array<T>;
type Values<T extends object> = T[keyof T];

export type HandlerTarget = Worker;
export class MessageHandler<EventMap extends Record<string, any>> {

  protected eventMap = new Map<keyof EventMap, ArrayOrSingle<EventEntry<EventMap[keyof EventMap]>>>();

  constructor(private target: HandlerTarget) {
    this.setup();
  }

  updateTarget(target: HandlerTarget) {
    if(target === this.target) return;

    this.target = target;
    this.setup();
  }

  protected setup(): void {
    this.target.addEventListener('message', ({data}: MessageEvent) => {
      if(!isInternalMessage(data)) return;

      this.handleEvent(data.key, data.value);
    });
  }

  emit<K extends keyof EventMap>(key: K, data: EventMap[K]) {
    this.target.postMessage({key, value: data} as InternalMessage);
  }

  on<K extends keyof EventMap>(key: K, fn: EventFn<EventMap[K]>): this {
    this.insertEvent<K>(key, fn);
    return this;
  }

  once<K extends keyof EventMap>(key: K, fn: EventFn<EventMap[K]>): this {
    this.insertEvent(key, {fn, once: true});
    return this;
  }

  awaitEvent<K extends keyof EventMap>(key: K): Promise<EventMap[K]> {
    return new Promise(r => this.once(key, r));
  }

  private insertEvent<K extends keyof EventMap>(key: K, eventHandler: EventEntry<EventMap[K]>): void {
    // all the "as ..." are necessary because Typescript doesn't like inserting EventMap[K] into EventMap[keyof EventMap]
    // even though K extends keyof EventMap. This is probably due to the definition of `eventMap`

    if(this.eventMap.has(key)) {
      const entry = this.eventMap.get(key) as ArrayOrSingle<EventEntry<EventMap[K]>>;
      if(Array.isArray(entry)) {
        // 2 or more entries
        entry.push(eventHandler);
      } else {
        // only one entry
        this.eventMap.set(key, [entry as EventEntry<Values<EventMap>>, eventHandler as EventFn<Values<EventMap>>]);
      }
    } else {
      this.eventMap.set(key, eventHandler as EventFn<Values<EventMap>>);
    }
  }

  protected handleEvent<K extends keyof EventMap>(key: K, data: EventMap[K]) {
    const entry = this.eventMap.get(key);
    if(!entry) return;

    if(typeof entry === 'function') {
      // "fast path" - no cleanup or anything
      entry(data);
      return;
    }

    if(Array.isArray(entry)) {
      const result = entry.filter(value => {
        if(typeof value === 'function') {
          value(data);
          return true;
        }

        value.fn(data);
        return value.once;
      });

      if(result.length === 0)
        this.eventMap.delete(key);
      else if(result.length === 1)
        this.eventMap.set(key, result[0]);
      else
        this.eventMap.set(key, result);
    } else {
      if(entry.once) this.eventMap.delete(key);

      entry.fn(data);
    }
  }
}

interface InternalMessage {
  key: string;
  value: any;
}


function isInternalMessage(v: unknown): v is InternalMessage {
  return typeof v === 'object' && v !== null && 'key' in v;
}
