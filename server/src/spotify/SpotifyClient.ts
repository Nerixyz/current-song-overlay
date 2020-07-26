import {APP_VERSION, USER_AGENT} from './constants.ts';
import {SpotifyHttpApi} from './SpotifyHttpApi.ts';
import {SpotifyCache} from './SpotifyCache.ts';
import {connectWebSocket, WebSocket} from 'https://deno.land/std/ws/mod.ts';
import {SpotifyWsMessage} from './ws.types.ts';
import {getId} from './utilities.ts';
import {SpotifyTrack} from './http.types.ts';
import {NormalizedTrack, OverlayClientEvent, OverlayClientEventMap} from '../types.ts';

export class SpotifyClient {
    accessToken?: string;
    http?: SpotifyHttpApi;
    cache?: SpotifyCache;

    ws?: WebSocket;

    constructor(private cookies: string) {
    }

    async connect() {
        this.accessToken = await this.getAccessToken();
        this.http = new SpotifyHttpApi(this.accessToken);
        this.cache = new SpotifyCache(this.http);

        // TODO: URL
        this.ws = await connectWebSocket(`wss://gew-dealer.spotify.com/?access_token=${encodeURIComponent(this.accessToken)}`,
            new Headers({'Cookies': this.cookies})
        );
        console.debug('Connected to spotify WebSocket');
    }

    async start() {
        await this.connect();
        this.startPing();
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
                if (!cluster) continue;

                const [prev, current, next] = await this.cache.getTracks([
                    getId(cluster.player_state.prev_tracks?.[0]?.uri, 'track'),
                    getId(cluster.player_state.track?.uri, 'track'),
                    getId(cluster.player_state.next_tracks?.[0]?.uri, 'track')
                ]);
                yield {
                    type: 'StateChanged', data: {
                        current: current ? normalizeTrack(current) : undefined,
                        next: next ? normalizeTrack(next) : undefined,
                        previous: prev ? normalizeTrack(prev) : undefined,
                        state: cluster.player_state.is_paused ? 'paused' : cluster.player_state.is_playing ? 'playing' : 'unknown',
                        position: {
                            currentPositionSec: Number(cluster.player_state.position_as_of_timestamp) / 1000,
                            playbackSpeed: cluster.player_state.playback_speed,
                            maxPositionSec: Number(cluster.player_state.duration) / 1000,
                            startTs: Number(cluster.timestamp),
                        }
                    }
                };
            }
        }
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

    protected pingId?: number;

    startPing() {
        setInterval(() => this.ws?.send(JSON.stringify({type: 'ping'})), 60 * 1000);
    }

    stopPing() {
        clearInterval(this.pingId);
    }

    stopped = false;

    public async stop(): Promise<void> {
        this.stopped = true;
        this.stopPing();
        await this.ws?.close();
        this.cache?.stopCleanup();
    }
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
