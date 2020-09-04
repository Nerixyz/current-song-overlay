import {APP_VERSION, USER_AGENT} from './constants.ts';
import {SpotifyHttpApi} from './SpotifyHttpApi.ts';
import {SpotifyCache} from './SpotifyCache.ts';
import {connectWebSocket, WebSocket} from 'https://deno.land/std/ws/mod.ts';
import {SpotifyWsCluster, SpotifyWsMessage} from './ws.types.ts';
import {getId} from './utilities.ts';
import {SpotifyTrack} from './http.types.ts';
import {NormalizedTrack, OverlayClientEvent, OverlayClientEventMap, OverlayClientStateChangedEvent} from '../types.ts';
import * as log from 'https://deno.land/std/log/mod.ts';

export class SpotifyClient {
    http?: SpotifyHttpApi;
    cache?: SpotifyCache;

    ws?: WebSocket;

    onMessage?: (message: OverlayClientEvent<keyof OverlayClientEventMap>) => void;

    protected pingId?: number;
    protected timeoutId?: number;

    constructor(private cookies: string) {
    }

    async connect() {
        this.http = this.http ?? new SpotifyHttpApi(this.cookies);
        this.cache = this.cache ?? new SpotifyCache(this.http);
        await this.http.updateDealerAndSpClient()
            .catch(e => log.info(`Failed to get dealer and spclient, using defaults: ${e}`));
        await this.http.updateAccessToken();

        // TODO: URL
        this.ws = await connectWebSocket(`wss://${this.http.dealer}/?access_token=${encodeURIComponent(this.http.accessToken ?? '')}`,
            new Headers({'Cookies': this.cookies})
        );
        log.info('Connected to Spotify WebSocket');
    }

    async start() {
        await this.connect();
        this.startPing();
        this.timeoutId = setTimeout(async () => {
            log.info('spotify@ws: reconnecting - access token expired');
            this.stopPing();
            await this.ws?.close().catch(() => undefined);
        }, 1000 * 60 * 60);
        // get current track
        queueMicrotask(async () => {
            // this returns 'bad_request' which is ok. Why? I don't know. PUT /connect-state/.. works afterwards.
            await this.http?.registerDevice();
            const state = await this.http?.putConnectState();
            if(!state) return;
            const data = await this.handleCluster(state);
            if(typeof data !== 'object') return;
            this.onMessage?.({type: 'StateChanged', data });
        });
    }


    async* messages(): AsyncIterable<OverlayClientEvent<keyof OverlayClientEventMap>> {
        if (!this.ws || !this.http || !this.cache) return;

        for await (const wsEvent of this.ws) {
            if (typeof wsEvent !== 'string') continue;
            const message: SpotifyWsMessage = JSON.parse(wsEvent);
            if (message.type === 'message') {
                if (message.method === 'PUT' && message.headers?.['Spotify-Connection-Id']) {
                    this.http.updateConnectionId(message.headers['Spotify-Connection-Id']);
                    await this.http.putConnectState();
                    yield {type: 'Ready', data: undefined};
                }
            } else continue;
            if (!message.payloads) continue;

            for (const {cluster} of message.payloads) {
                const result = await this.handleCluster(cluster);
                if (typeof result === 'number') {
                    if (result === IteratorConsumerCommand.Continue) continue;
                    else if (result === IteratorConsumerCommand.Exit) return;
                }

                yield {type: 'StateChanged', data: result};
            }
        }
        log.debug('End');
    }

    public async handleCluster(cluster?: SpotifyWsCluster): Promise<IteratorConsumerCommand | OverlayClientStateChangedEvent> {
        if (!cluster || !this.cache) return IteratorConsumerCommand.Continue;
        if (!cluster.player_state.track && cluster.player_state.is_playing) {
            log.error(`spotify@ws: Invalid state - no track but playing doctorWtf - reconnecting`);
            return IteratorConsumerCommand.Exit;
        }

        if (!cluster.player_state.track) return { state: 'paused' };


        const current = await this.cache.getTrack(getId(cluster.player_state.track?.uri, 'track'));
        if (!current) {
            log.error(`spotify@ws: Failed to get current track: ${JSON.stringify(cluster.player_state)}`);
            return IteratorConsumerCommand.Continue;
        }
        return {
            current: current ? normalizeTrack(current) : {name: cluster.player_state.track.metadata.title ?? '<doctorWtf>'},
            state: cluster.player_state.is_paused ? 'paused' : cluster.player_state.is_playing ? 'playing' : 'unknown',
            position: {
                currentPositionSec: Number(cluster.player_state.position_as_of_timestamp) / 1000,
                playbackSpeed: cluster.player_state.playback_speed,
                maxPositionSec: Number(cluster.player_state.duration) / 1000,
                startTs: Number(cluster.player_state.timestamp ?? cluster.timestamp),
            }
        };
    }

    protected async getAccessToken(): Promise<string> {
        const {accessToken} = await fetch('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
            headers: {
                'User-Agent': USER_AGENT,
                'spotify-app-version': APP_VERSION,
                'app-platform': 'WebPlayer',
                'Cookie': this.cookies,
                'Referer': 'https://open.spotify.com/'
            },
            method: 'GET',
        }).then(r => r.json());
        return accessToken;
    }

    startPing() {
        this.pingId = setInterval(() => this.ws?.send(JSON.stringify({type: 'ping'})), 60 * 1000);
    }

    stopPing() {
        clearInterval(this.pingId);
    }

    stopped = false;

    public async stop(): Promise<void> {
        this.stopped = true;
        this.stopPing();
        await this.ws?.close().catch(() => undefined);
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
