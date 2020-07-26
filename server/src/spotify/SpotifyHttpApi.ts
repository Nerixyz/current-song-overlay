import {SpotifyTrackResponse} from './http.types.ts';

export class SpotifyHttpApi {

    protected deviceId: string = new Array(20).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

    protected get baseHeaders() {
        return {
            authorization: `Bearer ${this.accessToken}`
        };
    }

    protected connectionId?: string;

    constructor(protected accessToken: string) {
    }


    trackInfos(tracks: string[]): Promise<SpotifyTrackResponse> {
        return fetch(`https://api.spotify.com/v1/tracks?market=from_token&ids=${tracks.join()}`, {
            headers: this.baseHeaders,
        }).then(r => r.json());
    }

    updateConnectionId(conn: string) {
        if (this.connectionId === conn) return;
        this.connectionId = conn;
    }

    postDevice() {
        return fetch('https://gew-spclient.spotify.com/track-playback/v1/devices',
            {
                method: 'POST',
                headers: this.baseHeaders,
                body: JSON.stringify({
                    'device': {
                        'brand': 'spotify',
                        'capabilities': {
                            'change_volume': true,
                            'enable_play_token': true,
                            'supports_file_media_type': true,
                            'play_token_lost_behavior': 'pause',
                            'disable_connect': false,
                            'audio_podcasts': true,
                            'video_playback': true,
                            'manifest_formats': [
                                'file_urls_mp3', 'manifest_ids_video', 'file_urls_external', 'file_ids_mp4', 'file_ids_mp4_dual'
                            ]
                        },
                        'device_id': this.deviceId, //TODO
                        'device_type': 'computer',
                        'metadata': {},
                        'model': 'web_player',
                        'name': 'Web Player (Firefox)',
                        'platform_identifier': 'web_player windows 10;firefox 80.0;desktop'
                    },
                    'connection_id': this.connectionId,
                    'client_version': 'harmony:4.4.0-1919a0b',
                    'volume': 65535
                }),
            }).then(r => r.json());
    }

    putConnectState() {
        return fetch(`https://gew-spclient.spotify.com/connect-state/v1/devices/hobs_${this.deviceId}`, {
            headers: {
                ...this.baseHeaders,
                'x-spotify-connection-id': this.connectionId ?? ''
            },
            method: 'PUT',
            body: JSON.stringify({
                member_type: 'CONNECT_STATE',
                device: {
                    device_info: {
                        capabilities: {
                            can_be_player: false, hidden: true
                        }
                    }
                }
            })
        }).then(r => r.json());
    }

    enableNotifications() {
        return fetch(`https://api.spotify.com/v1/me/notifications/user?connection_id=${this.connectionId}`, {
            headers: this.baseHeaders,
            method: 'PUT',
        }).then(r => r.json());
    }
}
