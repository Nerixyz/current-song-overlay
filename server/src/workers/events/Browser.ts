import { SongSourceEvents } from './SongSource.ts';
import { LifecycleEvents } from './Lifecycle.ts';

export interface BrowserEvents extends SongSourceEvents, LifecycleEvents<{ port: number }> {}
