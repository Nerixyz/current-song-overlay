import { SpotifyHttpApi } from './SpotifyHttpApi.ts';
import { SpotifyCache } from './SpotifyCache.ts';
import { SpotifyWsCluster, SpotifyWsMessage } from './ws.types.ts';
import { getId } from './utilities.ts';
import { SpotifyTrack } from './http.types.ts';
import {
    NormalizedTrack,
    OverlayClientEvent,
    OverlayClientEventMap,
    OverlayClientStateChangedEvent
} from '../types.ts';
import * as log from 'https://deno.land/std@0.75.0/log/mod.ts';

export interface SpotifyOptions {
    cookies?: string;
}

export class SpotifyClient {
    http: SpotifyHttpApi;
    cache: SpotifyCache;

    ws?: WebSocket;

    private resolveClosePromise?: () => void;
    closePromise?: Promise<void>;

    protected pingId?: number;
    protected timeoutId?: number;

    constructor(
        private cookies: string,
        private onMessageCallback: (message: OverlayClientEvent<keyof OverlayClientEventMap>) => void
    ) {
        this.http = new SpotifyHttpApi(this.cookies);
        this.cache = new SpotifyCache(this.http);
    }

    async connect() {
        await this.http.updateDealerAndSpClient()
            .catch(e => log.info(`Failed to get dealer and spclient, using defaults: ${ e }`));
        await this.http.updateAccessToken();

        this.ws = new WebSocket(`wss://${ this.http.dealer }/?access_token=${ encodeURIComponent(this.http.accessToken ?? '') }`);
        this.updateListeners();
        this.closePromise = new Promise(resolve => this.resolveClosePromise = resolve);
    }

    private updateListeners() {
        this.ws?.addEventListener('error', () => log.error(`spotify@ws: WebSocket had an error?!`));
        this.ws?.addEventListener('close', () => {
            log.info('spotify@ws: WebSocket closed');
            this.resolveClosePromise?.();
        });
        this.ws?.addEventListener('open', () => log.info('Connected to Spotify WebSocket'));
        this.ws?.addEventListener('message', async ({ data }: { data: unknown }) => {
            try {
                if (typeof data !== 'string') return;
                await this.handleWsMessage(JSON.parse(data));
            } catch (e) {
                log.error(`spotify@ws-handler: Failed to handle message (${ e?.message ?? '<unknown>' })`);
            }
        });
    }

    async start() {
        await this.connect();
        this.startPing();
        this.timeoutId = setTimeout(async () => {
            log.info('spotify@ws: reconnecting - access token expired');
            this.stopPing();
            this.ws?.close();
        }, 1000 * 60 * 60);
        // get current track
        // "next tick" - kind of (there's no nextTick)
        setTimeout(async () => {
            // this returns 'bad_request' which is ok. Why? I don't know. PUT /connect-state/.. works afterwards.
            await this.http?.registerDevice();
            const state = await this.http?.putConnectState();
            if (!state) return;
            const data = await this.handleCluster(state);
            if (typeof data !== 'object') return;
            this.onMessageCallback({ type: 'StateChanged', data });
        });
    }

    async handleWsMessage(message: SpotifyWsMessage) {
        if (message.type !== 'message') return;

        if (message.method === 'PUT' && message.headers?.['Spotify-Connection-Id']) {
            this.http.updateConnectionId(message.headers['Spotify-Connection-Id']);
            await this.http.putConnectState();
            this.onMessageCallback({ type: 'Ready', data: undefined });
            return;
        }

        if (!message.payloads || !this.cache) return;

        for (const { cluster } of message.payloads.filter(({cluster}) => cluster?.player_state)) {
            const result = await this.handleCluster(cluster);
            if (typeof result === 'number') {
                if (result === IteratorConsumerCommand.Continue) continue;
                else if (result === IteratorConsumerCommand.Exit) {
                    return this.ws?.close();
                }
            }

            this.onMessageCallback({ type: 'StateChanged', data: result });
        }
    }

    public async handleCluster(cluster: SpotifyWsCluster): Promise<IteratorConsumerCommand | OverlayClientStateChangedEvent> {
        if (!cluster?.player_state?.track && cluster?.player_state?.is_playing) {
            log.error(`spotify@ws: Invalid state - no track but playing doctorWtf - reconnecting`);
            return IteratorConsumerCommand.Exit;
        }

        if (!cluster.player_state.track) return { state: 'paused' };


        const current = await this.cache.getTrack(getId(cluster.player_state.track?.uri, 'track'));
        if (!current) {
            log.error(`spotify@ws: Failed to get current track: ${ JSON.stringify(cluster.player_state) }`);
            return IteratorConsumerCommand.Continue;
        }
        return {
            current: current ? normalizeTrack(current) : { name: cluster.player_state.track.metadata.title ?? '<doctorWtf>' },
            state: cluster.player_state.is_paused ? 'paused' : cluster.player_state.is_playing ? 'playing' : 'unknown',
            position: {
                currentPositionSec: Number(cluster.player_state.position_as_of_timestamp) / 1000,
                playbackSpeed: cluster.player_state.playback_speed,
                maxPositionSec: Number(cluster.player_state.duration) / 1000,
                startTs: Number(cluster.player_state.timestamp ?? cluster.timestamp),
            }
        };
    }

    startPing() {
        this.pingId = setInterval(() => this.sendToWs({ type: 'ping' }), 60 * 1000);
    }

    protected sendToWs(obj: any) {
        if(!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        this.ws.send(JSON.stringify(obj));
    }

    // stop functionality

    stopPing() {
        clearInterval(this.pingId);
    }

    stopped = false;

    public async stop(): Promise<void> {
        this.stopped = true;
        this.stopPing();
        this.ws?.close();
        if (this.timeoutId) clearTimeout(this.timeoutId);
    }
}

enum IteratorConsumerCommand {
    Continue,
    Exit,
}

function normalizeTrack(track: SpotifyTrack): NormalizedTrack {
    return {
        name: track.name,
        artists: track.artists.map(a => a.name),
        albumName: track.album.name,
        albumImageUrl: track.album.images
            .reduce((acc, val) => val.height > acc.height ? val : acc, track.album.images[0])
            .url,
    };
}
