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

export type UpdateBrowserEventFn = (e: UpdateBrowserEventArg<keyof UpdateBrowserEventMap>) => void;

export type UpdateBrowserEventArg<T extends keyof UpdateBrowserEventMap> = { type: T; data: UpdateBrowserEventMap[T] };

export interface UpdateBrowserEventMap {
    Active: { title: string };
    Inactive: {};
}
