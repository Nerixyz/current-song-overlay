export type UpdateEventFn = (e: UpdateEventArg<keyof UpdateEventMap>) => void;

export type UpdateEventArg<T extends keyof UpdateEventMap> = { type: T; data: UpdateEventMap[T] };

export interface UpdateEventMap {
  Active: { title: string, state?: VideoPlayState };
  Inactive: {};
}

export interface VideoPlayState {
  speed: number;
  mode: 'playing' | 'paused';
  sentTs: number;
  duration: number;
  currentPos: number;
}

export interface PlayStateContainer {
  state: VideoPlayState;
  tabId: number;
}

export interface InternalMessageMap {
  PlayState: VideoPlayState;
  Title: string;
}
export interface InternalMessage<T extends keyof InternalMessageMap & string = keyof InternalMessageMap & string>  {
  type: T;
  data: InternalMessageMap[T];
}
