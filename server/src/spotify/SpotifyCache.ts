import {SpotifyHttpApi} from './SpotifyHttpApi.ts';
import {SpotifyTrack} from './http.types.ts';

export class SpotifyCache {

    protected tracks: Record<string, CacheEntry<SpotifyTrack>> = {};
    protected cleanupRef: number;

    constructor(protected http: SpotifyHttpApi,
                protected readonly MAX_CACHE_SIZE = 100,
                protected readonly CLEANUP_INTERVAL = 10000) {
        this.cleanupRef = setInterval(() => {
            this.cleanupCache(this.tracks);
        }, this.CLEANUP_INTERVAL);
    }

    protected cleanupCache(holder: Record<string, CacheEntry<unknown>>) {
        const entries = Object.entries(holder);
        if (entries.length < this.MAX_CACHE_SIZE) return;
        for(const [key] of entries.sort(([,a], [,b]) => b.savedTs - a.savedTs).slice(this.MAX_CACHE_SIZE)) {
            delete holder[key];
        }
    }

    public stopCleanup() {
        clearInterval(this.cleanupRef);
    }

    public async getTrack(id: string | undefined): Promise<SpotifyTrack | undefined> {
        if(typeof id === 'undefined') return undefined;
        const lookedUp = this.tracks[id];
        if(lookedUp){
            console.log('lookup OK', id);
            return lookedUp.value;
        }

        const res = await this.http.trackInfos([id]);
        if(!res.tracks?.length) {
            console.log('req FAIL', id);
            return undefined;
        }

        this.tracks[res.tracks[0].id] = {savedTs: Date.now(), value: res.tracks[0]};

        console.log('req OK', id);
        return res.tracks[0];
    }
}

interface CacheEntry<T> {
    savedTs: number;
    value: T;
}
