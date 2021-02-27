export type OverlayClientEvent<T extends keyof OverlayClientEventMap> = {
    type: T;
    data: OverlayClientEventMap[T];
};

export interface OverlayClientEventMap {
    StateChanged: PlayingEvent | 'paused';
}

export interface PlayingEvent {
    track: Track;
    playPosition?: PlayPosition;
}

export interface Track {
    title: string, artists?: string[], cover?: string
}

export interface PlayPosition {
    position: number;
    duration: number;
    rate?: number;
    startTs: number;
}
