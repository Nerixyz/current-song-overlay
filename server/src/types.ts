export type OverlayClientEvent<T extends keyof OverlayClientEventMap> = {
    type: T;
    data: OverlayClientEventMap[T];
};

export interface OverlayClientEventMap {
    StateChanged: OverlayClientStateChangedEvent;
    Ready: undefined;
}

export interface OverlayClientStateChangedEvent {
    current?: NormalizedTrack;
    previous?: NormalizedTrack;
    next?: NormalizedTrack;
    state: 'playing' | 'paused' | 'unknown';
}

export interface NormalizedTrack {
    name: string;
    artists?: string[];
    albumImageUrl?: string;
    albumName?: string;
}
