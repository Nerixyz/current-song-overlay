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

export function autoReconnect(startFn: () => Promise<unknown>, onError?: (e: Error) => void, name = '<unknown work>'): [() => Promise<void>, () => void] {
    let timeoutId: number | undefined = undefined;
    let die = false;
    const workFn = async () => {
        let factor = 0;
        log.info(`Starting work for ${name}.`);
        while (true) {
            if(die) break;
            try {
                await startFn();
                factor = 0;
            } catch (e) {
                onError?.(e);
                factor = Math.min(factor + 10, 300);
                log.debug(`Work failed for ${name} - waiting ${factor}s`);
            }
            if(die) break;
            await new Promise(resolve => timeoutId = setTimeout(resolve, factor * 1000));
        }
        log.info(`Work for ${name} ended.`);
    };
    return [workFn, () => {
        die = true;
        if (timeoutId) clearTimeout(timeoutId);
    }];
}

export interface Reloadable {
    stop(): any | Promise<any>;

    /**
     *
     * @returns {Promise<void>} resolves/rejects once the reloadable is stopped
     */
    start(): Promise<void>;
}
export function createReloader() {
    const active: [Reloadable, () => void][] = [];
    return {
        start(obj: Reloadable, onError?: (e: Error) => void, name?: string): Promise<void> {
            log.info(`Adding ${name} as reloadable`);
            const reconnectInfo = autoReconnect(() => obj.start(), onError, name);
            active.push([obj, reconnectInfo[1]]);
            return reconnectInfo[0]();
        },
        async stop() {
            log.info('Stopping all reloadable tasks');
            for(const item of active) {
                item[1]();
                await item[0].stop();
            }
        },
    }
}

export function readCookieEnvVar(): string {
    return expectAndMirror(Deno.env.get('SPOTIFY_COOKIES'), 'No SPOTIFY_COOKIES, the cookie monster is sad now');
}

/**
 * Gets ENABLE_{vlc/spotify...}
 * @param {string} component
 * @returns {boolean} if not defined: false, if 0 or false: false, else true
 */
export function readEnableEnvVar(component: string): boolean {
    const content = Deno.env.get(`ENABLE_${component.toUpperCase()}`)?.toLowerCase();
    if(typeof content !== 'undefined') {
        return !['0', 'false'].includes(content);
    }
    return false;
}

function expectAndMirror<T>(value: T | undefined, ifUndefined: string): T {
    if(typeof value === 'undefined') throw new Error(ifUndefined);
    return value;
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


