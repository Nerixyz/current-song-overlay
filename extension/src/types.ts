export type UpdateEventFn = (e: UpdateEventArg<keyof UpdateEventMap>) => void;

export type UpdateEventArg<T extends keyof UpdateEventMap> = { type: T; data: UpdateEventMap[T] };

export interface UpdateEventMap {
  Active: UpdateActiveEventData;
  Inactive: {};
}

export interface UpdateActiveEventData {
  metadata: VideoMetadata;
  position?: VideoPlayPosition;
}

export interface VideoPlayPosition {
  rate: number;
  timestamp: number;
  duration: number;
  position: number;
}

export type VideoPlayMode = 'playing' | 'paused' | 'none';

export interface VideoMetadata {
  title: string;
  artist?: string;
  artwork?: string;
}

export interface PlayPositionContainer {
  state?: VideoPlayPosition;
  tabId: number;
}

export type InternalMessageMap = {
  PlayPosition: VideoPlayPosition;
  Metadata: VideoMetadata;
  PlayMode: VideoPlayMode;
};
