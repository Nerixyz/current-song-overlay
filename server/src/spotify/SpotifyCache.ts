import {SpotifyHttpApi} from './SpotifyHttpApi.ts';
import {SpotifyTrack} from './http.types.ts';

export class SpotifyCache {

    protected tracks: Record<string, CacheEntry<SpotifyTrack>> = {};

    constructor(protected http: SpotifyHttpApi,
                protected readonly MAX_CACHE_SIZE = 10,
                protected readonly MAX_RETRY_COUNT = 2,
                ) {
    }

    protected cleanupCache(holder: Record<string, CacheEntry<unknown>>) {
        const entries = Object.entries(holder);
        if (entries.length < this.MAX_CACHE_SIZE) return;
        for(const [key] of entries.sort(([,a], [,b]) => b.savedTs - a.savedTs).slice(this.MAX_CACHE_SIZE)) {
            delete holder[key];
        }
    }

    public async getTrack(id: string | undefined): Promise<SpotifyTrack | undefined> {
        if(typeof id === 'undefined') return undefined;
        const lookedUp = this.tracks[id];
        if(lookedUp) return lookedUp.value;

        const res = await this.requestTrackWithRetry(id);
        if(!res) return undefined;

        this.tracks[res.id] = {savedTs: Date.now(), value: res};
        queueMicrotask(() => this.cleanupCache(this.tracks));
        return res;
    }

    protected async requestTrackWithRetry(id: string): Promise<SpotifyTrack | undefined> {
        let i = 0;
        while (i <= this.MAX_RETRY_COUNT) {
            const res = await this.http.trackInfos([id]);
            if(!res.tracks?.length) {
                await this.http.updateAccessToken();
            } else {
                return res.tracks[0];
            }
            i++;
        }
        return undefined
    }
}

interface CacheEntry<T> {
    savedTs: number;
    value: T;
}
