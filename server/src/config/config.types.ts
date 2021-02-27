import { SpotifyOptions } from '../spotify/SpotifyClient.ts';
import { VlcOptions } from '../vlc/VlcServer.ts';

export interface Config {
    modules: {[K in keyof ModuleOptions]?: boolean | Module<ModuleOptions[K]>};
    websocketPort: number;
    overlayPort: number;
    overlayEnabled: boolean;
}

export interface Module<T> {
    enabled: boolean;
    options: T;
}

export interface ModuleOptions {
    spotify: SpotifyOptions;
    vlc: VlcOptions;
    browser: {port?: number};
}
