export type MySmolDom = {
  title: HTMLHeadingElement;
  artist: HTMLHeadingElement;
  albumArt: HTMLImageElement;
  wrapper: HTMLElement;
  progressBar: HTMLElement;
};

export type WsMessage<T extends keyof WsMessageMap> = {
  type: T;
  data: WsMessageMap[T];
};

export interface WsMessageMap {
  StateChanged: StateChangedEvent;
}

export interface StateChangedEvent {
  current?: NormalizedTrack;
  previous?: NormalizedTrack;
  next?: NormalizedTrack;
  state: 'playing' | 'paused' | 'unknown';
  position?: PositionChangedEvent;
}

export interface PositionChangedEvent {
  playbackSpeed: number;
  currentPositionSec: number;
  maxPositionSec: number;
  startTs: number;
}

export interface NormalizedTrack {
  name: string;
  artists: string[];
  albumImageUrl: string;
  albumName: string;
}
