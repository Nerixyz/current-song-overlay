export interface SpotifyTrackResponse {
    tracks: SpotifyTrack[];
}

export interface SpotifyTrack {
    album: SpotifyAlbum;
    artists: SpotifyArtist[];
    disc_number: number;
    duration_ms: number;
    explicit: boolean;
    external_ids: SpotifyExternalids;
    external_urls: SpotifyExternalurls;
    href: string;
    id: string;
    is_local: boolean;
    is_playable: boolean;
    name: string;
    popularity: number;
    preview_url: string;
    tags: any[];
    track_number: number;
    type: string;
    uri: string;
}

export interface SpotifyExternalids {
    isrc: string;
}

export interface SpotifyAlbum {
    album_type: string;
    artists: SpotifyArtist[];
    external_urls: SpotifyExternalurls;
    href: string;
    id: string;
    images: SpotifyImage[];
    name: string;
    release_date: string;
    release_date_precision: string;
    total_tracks: number;
    type: string;
    uri: string;
}

export interface SpotifyImage {
    height: number;
    url: string;
    width: number;
}

export interface SpotifyArtist {
    external_urls: SpotifyExternalurls;
    href: string;
    id: string;
    name: string;
    type: string;
    uri: string;
}

export interface SpotifyExternalurls {
    spotify: string;
}
