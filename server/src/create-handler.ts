import {OverlayServer} from './OverlayServer.ts';
import {WsServer} from './WsServer.ts';
import {Reloadable, splitTitle, readCookieEnvVar} from './utilities.ts';
import {SpotifyClient} from './spotify/SpotifyClient.ts';
import {VlcClient} from './vlc/VlcClient.ts';
import pogo from 'https://deno.land/x/pogo/main.ts';
import {BrowserActiveEvent, UpdateBrowserEventArg, UpdateBrowserEventMap} from './types.ts';
import * as log from "https://deno.land/std/log/mod.ts";

export function createBrowserHandler(client: OverlayServer, browserId: number): Reloadable {
    const browserServer = new WsServer<UpdateBrowserEventArg<keyof UpdateBrowserEventMap>>(232, false);
    browserServer.onMessage = event => {
        if (event.type === 'Active') {
            const data = event.data as BrowserActiveEvent;
            client.send({
                type: 'StateChanged',
                data: {
                    state: 'playing',
                    current: splitTitle(data.title),
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

export function createSpotifyClientAndHandler(overlayClient: OverlayServer, spotifyId: number): Reloadable {
    const spotifyClient = new SpotifyClient(readCookieEnvVar());
    const spotifyHandler = (() => {
        let die = false;
        return {
            stop: () => die = true, async start() {
                if (die) return;
                for await (const message of spotifyClient.messages()) {
                    if (die) return;
                    overlayClient.send(message, spotifyId);
                }
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

export function createVlcClient(overlayClient: OverlayServer, vlcId: number): Reloadable {
    const vlcClient = new VlcClient('localhost:234');
    vlcClient.onMessage = msg => {
        overlayClient.send({
            type: 'StateChanged', data: {
                state: msg.state as any,
                current: {
                    name: msg.info.name ?? '',
                    artists: msg.info.artists
                }
            }
        }, vlcId);
    };
    return vlcClient;
}

export function createServer(): Reloadable {
    log.debug(`Serving files on :230`);
    const server = pogo.server({port: 230});
    const overlayPath = Deno.env.get('NON_BUILD_ENV') ? 'client/public' : 'overlay';
    server.router
        .get('/{file}', (_, h) => h.directory(overlayPath))
        .get('/', (_, h) => h.file(`${overlayPath}/index.html`));
    return server;
}
