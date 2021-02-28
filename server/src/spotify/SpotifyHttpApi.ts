import {SpotifyTrackResponse} from './http.types.ts';
import {USER_AGENT, APP_VERSION} from './constants.ts';
import * as log from 'https://deno.land/std@0.88.0/log/mod.ts';
import {jsonFetch, logFetchError} from '../utilities.ts';
import {SpotifyWsCluster} from './ws.types.ts';

const SPOTIFY_CLIENT_VERSION = 'harmony:4.6.0-0500762';

export class SpotifyHttpApi {

    protected deviceId: string = new Array(20)
        .fill(0)
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join('');

    protected get baseHeaders() {
        return {
            authorization: `Bearer ${this.accessToken}`,
        };
    }

    protected connectionId?: string;
    accessToken?: string;
    dealer = 'gew-dealer.spotify.com:443';
    spClient = 'gew-spclient.spotify.com:443';

    constructor(protected cookies: string) {
    }

    trackInfos(tracks: string[]): Promise<SpotifyTrackResponse> {
        return jsonFetch(
            `https://api.spotify.com/v1/tracks?market=from_token&ids=${tracks.join()}`,
            {
                headers: this.baseHeaders,
            }
        ).catch(logFetchError(log.error, 'fetch track infos'));
    }

    async updateDealerAndSpClient() {
        const res = await jsonFetch(
            'https://apresolve.spotify.com/?type=dealer&type=spclient'
        ).catch(logFetchError(log.error, 'get dealer'));
        this.dealer = res.dealer?.[0] || this.dealer;
        this.spClient = res.spclient?.[0] || this.spClient;
    }

    updateConnectionId(conn: string) {
        if (this.connectionId === conn) return;
        this.connectionId = conn;
    }

    async updateAccessToken() {
        this.accessToken = await this.getAccessToken();
    }

    protected async getAccessToken(): Promise<string> {
        log.debug('Getting access token');
        const {accessToken} = await jsonFetch(
            'https://open.spotify.com/get_access_token?reason=transport&productType=web_player',
            {
                headers: {
                    'User-Agent': USER_AGENT,
                    'spotify-app-version': APP_VERSION,
                    'app-platform': 'WebPlayer',
                    Cookie: this.cookies,
                    Referer: 'https://open.spotify.com/',
                },
                method: 'GET',
            }
        ).catch(logFetchError(log.error, 'get access token'));
        log.debug('Got access token');
        return accessToken;
    }

    putConnectState(): Promise<SpotifyWsCluster> {
        return jsonFetch(
            `https://${this.spClient}/connect-state/v1/devices/hobs_${this.deviceId}`,
            {
                headers: {
                    ...this.baseHeaders,
                    'x-spotify-connection-id': this.connectionId ?? '',
                    'content-type': 'text/plain;charset=UTF-8'
                },
                method: 'PUT',
                body: JSON.stringify({
                    member_type: 'CONNECT_STATE',
                    device: {
                        device_info: {
                            capabilities: {
                                can_be_player: false,
                                hidden: true,
                            },
                        },
                    },
                }),
            }
        ).catch(logFetchError(log.error, 'put client state'));
    }

    registerDevice() {
        return fetch(`https://${this.spClient}/track-playback/v1/devices`, {
            method: 'POST',
            headers: {
                ...this.baseHeaders, 'content-type': 'application/json'
            },
            body: JSON.stringify({
                device: {
                    brand: 'spotify',
                    capabilities: {
                        change_volume: false,
                        enable_play_token: false,
                        supports_file_media_type: false,
                        play_token_lost_behavior: 'pause',
                        disable_connect: true,
                        audio_podcasts: false,
                        video_playback: false,
                        manifest_formats: []
                    },
                    device_id: this.deviceId,
                    device_type: 'computer',
                    metadata: {},
                    model: 'web_player',
                    name: 'Web Player (Firefox)',
                    platform_identifier: 'web_player windows 10;firefox 82.0;desktop'
                },
                connection_id: this.connectionId,
                client_version: SPOTIFY_CLIENT_VERSION,
                volume: 65535
            })
        }).then(x => x.text()).catch(logFetchError(log.error, 'register device'));
    }

}
