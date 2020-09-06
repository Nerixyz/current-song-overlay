export type UpdateEventFn = (e: UpdateEventArg<keyof UpdateEventMap>) => void;

export type UpdateEventArg<T extends keyof UpdateEventMap> = { type: T; data: UpdateEventMap[T] };

export interface UpdateEventMap {
  Active: UpdateActiveEventData ;
  Inactive: {};
}

export interface UpdateActiveEventData {
  current: {title: string, artist?: string, artwork?: string};
  state?: VideoPlayState;
}

export interface VideoPlayState {
  speed: number;
  mode: 'playing' | 'paused';
  sentTs: number;
  duration: number;
  currentPos: number;
}

export interface VideoMetadata {
  mode: 'playing' | 'paused'|'none';
  positionState?: Omit<VideoPlayState, 'mode'>;
  metadata?: {title: string, artist: string, artwork?: string};
}

export interface PlayStateContainer {
  state?: VideoPlayState;
  tabId: number;
}

export interface InternalMessageMap {
  PlayState: VideoPlayState;
  Title: string | null;
  Metadata: string;
}
export interface InternalMessage<T extends keyof InternalMessageMap & string = keyof InternalMessageMap & string>  {
  type: T;
  data: InternalMessageMap[T];
}
