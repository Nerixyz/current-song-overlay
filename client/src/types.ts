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
  StateChanged: PlayingEvent | 'paused';
}

export interface PlayingEvent {
  track: Track;
  playPosition?: PlayPosition;
}

export interface Track {
  title: string;
  artists?: string[];
  cover?: string;
}

export interface PlayPosition {
  position: number;
  duration: number;
  rate?: number;
  timestamp: number;
}

export interface StateChangedEvent {
  current?: NormalizedTrack;
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
