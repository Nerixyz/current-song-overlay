import { config } from 'https://deno.land/x/dotenv/mod.ts';
config({export: true});

export function splitTitle(title: string): { name: string, artists?: string[] } {
    if (title.includes('-') && !title.match(/\([^()]+-[^()]+\)/)) {
        const [first, ...second] = title.split('-');
        return {artists: [first], name: second.join(' ')};
    } else if (title.includes('by')) {
        // used by SoundCloud
        const [first, ...second] = title.split('by');
        return {artists: [second.join(' ')], name: first};
    } else {
        return {name: title};
    }
}

export function autoReconnect(startFn: () => Promise<unknown>): [() => Promise<void>, () => void] {
    let timeoutId: number | undefined = undefined;
    let die = false;
    const workFn = async () => {
        let factor = 0;
        while (true) {
            if(die) break;
            try {
                await startFn();
                factor = 10;
            } catch (e) {
                factor = Math.min(factor + 10, 300);
            }
            if(die) break;
            await new Promise(resolve => timeoutId = setTimeout(resolve, factor * 1000));
        }
    };
    return [workFn, () => {
        die = true;
        if (timeoutId) clearTimeout(timeoutId);
    }];
}

export function createReloader() {
    const active: [{stop: () => void | Promise<void>}, () => void][] = [];
    return {
        push(obj: {stop: () => any | Promise<any>}, start: () => Promise<void>): Promise<void> {
            const reconnectInfo = autoReconnect(start);
            active.push([obj, reconnectInfo[1]]);
            return reconnectInfo[0]();
        },
        async stop() {
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

function expectAndMirror<T>(value: T | undefined, ifUndefined: string): T {
    if(typeof value === 'undefined') throw new Error(ifUndefined);
    return value;
}



