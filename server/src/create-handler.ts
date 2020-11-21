import { OverlayServer } from './OverlayServer.ts';
import { WsServer } from './WsServer.ts';
import { Reloadable, splitTitle, readCookieEnvVar } from './utilities.ts';
import { SpotifyClient } from './spotify/SpotifyClient.ts';
import { VlcClient } from './vlc/VlcClient.ts';
import { BrowserActiveEvent, NormalizedTrack, UpdateBrowserEventArg, UpdateBrowserEventMap } from './types.ts';
import * as log from 'https://deno.land/std@0.75.0/log/mod.ts';
import { serve, StaticFileMapSingleton } from './http/serve.ts';
import { VlcServer, VlcServerStateData } from './vlc/VlcServer.ts';
import { getModuleOptions, getVarOrDefault } from './config.ts';

export function createBrowserHandler(client: OverlayServer, browserId: number): Reloadable {
    const browserConfig = getModuleOptions('browser');
    const browserServer = new WsServer<UpdateBrowserEventArg<keyof UpdateBrowserEventMap>>(browserConfig.port ?? 232, false);
    browserServer.onMessage = event => {
        if (event.type === 'Active') {
            const data = event.data as BrowserActiveEvent;
            client.send({
                type: 'StateChanged',
                data: {
                    state: 'playing',
                    current: {
                        ...(!data.current.artist ? splitTitle(data.current.title) : {
                            artists: [data.current.artist],
                            name: data.current.title,
                        }),
                        albumImageUrl: data.current.artwork
                    },
                    position: data.state && data.state.mode === 'playing' ? {
                        startTs: data.state.sentTs,
                        maxPositionSec: data.state.duration,
                        playbackSpeed: data.state.speed,
                        currentPositionSec: data.state.currentPos,
                    } : undefined,
                }
            }, browserId);
        } else if (event.type === 'Inactive') {
            client.send({
                type: 'StateChanged',
                data: {
                    state: 'paused',
                }
            }, browserId);
        }
    };
    return browserServer;
}

export function createSpotifyClientAndHandler(overlayClient: OverlayServer, spotifyId: number): Reloadable | undefined {
    const spotifyOptions = getModuleOptions('spotify');
    if(!spotifyOptions.cookies || spotifyOptions.cookies.endsWith('=')) return undefined;
    const spotifyClient = new SpotifyClient(readCookieEnvVar(), message => overlayClient.send(message, spotifyId));
    const spotifyHandler = (() => {
        let die = false;
        return {
            stop: () => die = true, async start() {
                if (die) return;
                await spotifyClient.closePromise;
            }
        };
    })();
    return {
        async start(): Promise<void> {
            await spotifyClient.start();
            await spotifyHandler.start();
        },
        async stop() {
            spotifyHandler.stop();
            await spotifyClient.stop();
        }
    };
}

export function createVlcServer(overlayClient: OverlayServer, vlcId: number): Reloadable {
    const createCurrentTrack = ({title, artist, file}: VlcServerStateData): NormalizedTrack => {
        if(!title) {
            return artist ? {artists: [artist], name: file } : {name: file};
        }
        return artist ? {name: title, artists: [artist]} : splitTitle(title);
    }
    const vlcOptions = getModuleOptions('vlc');
    const vlcServer = new VlcServer(vlcOptions);
    vlcServer.onMessage = state => {
        if(state.state !== 'playing') {
            overlayClient.send({type: 'StateChanged', data: {
                state: 'paused'
                }}, vlcId);
        } else {
            console.log(state.artwork_url)
            overlayClient.send({
                type: 'StateChanged',
                data: {
                    state: 'playing',
                    position: {
                        maxPositionSec: state.duration,
                        playbackSpeed: state.rate,
                        currentPositionSec: state.position,
                        startTs: Date.now(),
                    },
                    current: {
                        ...createCurrentTrack(state),
                        albumImageUrl: state.artwork_url &&
                            (state.artwork_url.startsWith('http')
                                ? state.artwork_url
                                : `/token.${StaticFileMapSingleton.instance().add(state.artwork_url)}`),
                    }
                }
            }, vlcId)
        }
    };
    return {
        async start(): Promise<void> {
            await vlcServer.start()
        },
        async stop() {
            vlcServer.stop();
        }
    };
}

export function createServer(): Reloadable {
    const port = getVarOrDefault('overlayPort', 230)
    log.debug(`Serving files on :230`);
    return {
        start(): Promise<void> {
           return serve({ port, path: Deno.env.get('NON_BUILD_ENV') ? 'client/public' : 'overlay' });
        },
        stop(): any {},
    };
}
