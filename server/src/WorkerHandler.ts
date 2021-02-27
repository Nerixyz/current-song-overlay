import { SongSourceEvents } from './workers/events/SongSource.ts';
import { LifecycleEvents } from './workers/events/Lifecycle.ts';
import { MessageHandler } from './workers/MessageHandler.ts';

const urlBase = import.meta.url.replace(/WorkerHandler.ts$/, '');

export class WorkerHandler<Events extends Record<string, any>> {
  protected worker!: Worker;

  readonly events!: MessageHandler<Events>;

  constructor(public readonly name: string, protected init: Events['init'], protected eventHandlers: {[K in keyof Omit<Events, keyof SongSourceEvents | keyof LifecycleEvents<any>>]: (event: Events[K]) => void}) {
    this.start();
    for(const [event, fn] of Object.entries(this.eventHandlers)) {
      this.events.on(event, fn);
    }
  }

  start() {
    this.worker = new Worker(new URL(`./workers/${this.name}.ts`, urlBase).toString(), {type: 'module', name: this.name, deno: {
      namespace: true
      }} as any);
    if(!this.events)
      (this.events as any) = new MessageHandler<Events>(this.worker);

    this.worker.addEventListener('error', ev => {
      // TODO: logging
      this.worker.terminate();
      this.start();
    }, {once: true});
    this.events.updateTarget(this.worker);
    this.events.emit('init', this.init);
  }
}
