export interface SongSourceEvents {
  playing: PlayingEvent;
  paused: 'paused';
}

export interface PlayingEvent {
  song: {title: string, artists?: string[], cover?: string};
  playPosition?: {position: number, duration: number, rate?: number, startTs: number};
}
