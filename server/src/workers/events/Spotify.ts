import { SongSourceEvents } from './SongSource.ts';
import { LifecycleEvents } from './Lifecycle.ts';

export interface SpotifyEvents extends SongSourceEvents, LifecycleEvents<{cookies: string}> {
}
