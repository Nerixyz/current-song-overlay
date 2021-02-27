import * as log from "https://deno.land/std@0.75.0/log/mod.ts";

export function splitTitle(title: string): { title: string, artists?: string[] } {
    if (title.includes('-') && !title.match(/\([^()]+-[^()]+\)/)) {
        const [first, ...second] = title.split('-');
        return {artists: [first], title: second.join(' ')};
    } else if (title.includes('by')) {
        // used by SoundCloud
        const [first, ...second] = title.split('by');
        return {artists: [second.join(' ')], title: first};
    } else {
        return {title: title};
    }
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function rejectNonOk(res: Response): Response {
    if(res.status !== 200) throw new Error(`Expected 200, got ${res.status} - ${res.statusText}`);

    return res;
}

export function jsonFetch<T = any>(info: RequestInfo, init?: RequestInit): Promise<T> {
    return fetch(info, init).then(rejectNonOk).then(x => x.json());
}

export function logFetchError(loggerFn: (arg: string) => void, operation: string) {
    return (e: Error) => {
        loggerFn(`Failed to ${operation}: ${e.message ?? e}`);
        throw e;
    };
}

export class RingBuffer<T> {
    private readonly data: Array<T | undefined>;
    private ptr = 0;

    constructor(public readonly length: number) {
        this.data = [...new Array(length)];
    }

    public push(item: T): T | undefined {
        const prev = this.data[this.ptr];
        this.ptr = (this.ptr + 1) % this.length;
        this.data[this.ptr] = item;

        return prev;
    }
}

export function randomHexString(length: number) {
    return [...new Array(length)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}


