import {SpotifyHttpApi} from './SpotifyHttpApi.ts';
import {SpotifyTrack} from './http.types.ts';

export class SpotifyCache {

    protected tracks: Record<string, CacheEntry<SpotifyTrack>> = {};
    protected cleanupRef: number;

    constructor(protected http: SpotifyHttpApi,
                protected readonly MAX_CACHE_SIZE = 100,
                protected readonly CLEANUP_INTERVAL = 1000) {
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

    public async getTracks(ids: Array<string | undefined>): Promise<Array<SpotifyTrack | undefined>> {
        const resMapping: Record<number, number> = {};
        const toRequest: string[] = [];
        const finalArray: Array<SpotifyTrack | undefined> = new Array(ids.length);

        let reqIdx = 0;
        for(let idx = 0; idx < ids.length; idx++) {
            const id = ids[idx];
            if(!id){
                finalArray[idx] = undefined;
            } else if(this.tracks[id]) {
                finalArray[idx] = this.tracks[id].value;
            } else {
                toRequest.push(id);
                resMapping[reqIdx] = idx;
                reqIdx++;
            }
        }
        if(!toRequest.length) return finalArray;

        const res = await this.http.trackInfos(toRequest);
        if(!res.tracks) return finalArray;
        for(let idx = 0; idx < res.tracks.length; idx++) {
            const track = res.tracks[idx];
            this.tracks[track.id] = {savedTs: Date.now(), value: track};
            finalArray[resMapping[idx]] = track;
        }
        return finalArray;
    }
}

interface CacheEntry<T> {
    savedTs: number;
    value: T;
}
