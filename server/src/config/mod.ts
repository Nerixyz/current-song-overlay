import { config as envConfig } from 'https://deno.land/x/dotenv@v1.0.1/mod.ts';
import * as log from "https://deno.land/std@0.75.0/log/mod.ts";
import { Config, ModuleOptions } from './config.types.ts';

await initDotEnv();
await initConfig();

envConfig({export: true});

const config = await readConfig();

export function isModuleEnabled(name: keyof ModuleOptions): boolean {
    const mod = config.modules?.[name];

    return !!mod && (typeof mod === 'boolean' ? mod : !!mod.enabled);
}

export function getModuleOptions<K extends keyof ModuleOptions>(name: K): ModuleOptions[K] {
    const mod = config.modules?.[name];
    if(!mod || typeof mod !== 'object') return {};

    return mod.options ?? {};
}

export function getVarOrDefault<K extends keyof Config>(key: K, defaultValue: Config[K]): Config[K] {
    const fromConfig = config[key];

    // this is okay to cast as `undefined` is from the Partial<T> but here we check if it's undefined or a value and typescript doesn't know
    return fromConfig === undefined ? defaultValue: fromConfig as Config[K];
}


async function initDotEnv() {
    const hasDotEnv = await Deno.stat('.env').then(() => true).catch(() => false);
    if(!hasDotEnv) {
        await Deno.copyFile('.env.example', '.env');
    }
}

async function initConfig() {
    const hasConfig = await Deno.stat('config.json').then(() => true).catch(() => false);
    if(!hasConfig) {
        await Deno.copyFile('config.json.example', 'config.json');
    }
}

async function readConfig(): Promise<Partial<Config>> {
    const text = new TextDecoder().decode(await Deno.readFile('config.json'));
    try {
        const config = JSON.parse(text);
        return resolveConfigOptions(config);
    }catch(e) {
        log.error(`Config: ${e.stack}`);
        return {};
    }
}

function resolveConfigOptions<T extends object>(obj: T): T {
    const resolve = (v: any) => {
        if(typeof v === 'string')
            return resolveStringOption(v);
        if(typeof v === 'object')
            return resolveConfigOptions(v);
        return v;
    }
    if(Array.isArray(obj)) {
        return obj.map(resolve) as T;
    }
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => {
        v = resolve(v);
        return [k, v];
    })) as T;
}

export function resolveStringOption(option: string): string | undefined {
    if(option.startsWith(':env#')) {
        const envName = option.substring(':env#'.length);
        return Deno.env.get(envName);
    } else if(option.startsWith('\\:')) {
        return option.substring(1);
    }
    return option;
}
