import { listenAndServe } from 'https://deno.land/std@0.75.0/http/server.ts';
import type { Response, ServerRequest } from 'https://deno.land/std@0.75.0/http/server.ts';
import { normalize, join as pathJoin, extname } from 'https://deno.land/std@0.75.0/path/mod.ts';
import * as log from "https://deno.land/std@0.75.0/log/mod.ts";

const MEDIA_TYPES: Record<string, string> = {
    '.md': 'text/markdown',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.json': 'application/json',
    '.map': 'application/json',
    '.txt': 'text/plain',
    '.ts': 'text/typescript',
    '.tsx': 'text/tsx',
    '.js': 'application/javascript',
    '.jsx': 'text/jsx',
    '.gz': 'application/gzip',
    '.css': 'text/css',
    '.wasm': 'application/wasm',
    '.mjs': 'application/javascript',
};

export async function serve(settings: { port: number, path: string }) {
    return listenAndServe({ port: settings.port }, req => handle(req, settings.path).catch((e): Response => {
        // TODO: logging
        return {
            status: 500,
            body: JSON.stringify({ error: 'Internal server error.' })
        };
    }).then(res => req.respond(res)));
}

async function handle(req: ServerRequest, root: string): Promise<Response> {
    log.debug(`${req.method}: ${req.url}`);

    if (req.method === 'OPTIONS') return {
        status: 200,
        headers: new Headers({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
        }),
    };
    if (req.method !== 'GET') return { status: 400, body: JSON.stringify({ error: 'Expected GET request' }) };

    const toServe = pathJoin(root, normalizeURL(req.url));
    log.debug(`serving: ${toServe}`);

    const notFound = (): Response => ({
        status: 404,
    });

    try {
        const stat = await Deno.stat(toServe);
        if (stat.isDirectory) return notFound();

        const file = await Deno.open(toServe);

        req.done.then(() => file.close());
        return {
            status: 200,
            body: file,
            headers: new Headers({
                'Content-Type': MEDIA_TYPES[extname(toServe) ?? ''] ?? 'application/octet-stream',
                'Content-Length': stat.size.toString(),
            }),
        };
    } catch (e) {
        log.warning(`serve: failed(${e.message ?? '<no message>'}) => 404`);
        return notFound();
    }
}

function normalizeURL(url: string): string {
    let normalizedUrl = url;
    try {
        normalizedUrl = decodeURI(normalizedUrl);
    } catch (e) {
        if (!(e instanceof URIError)) {
            throw e;
        }
    }
    normalizedUrl = normalize(normalizedUrl);
    const startOfParams = normalizedUrl.indexOf('?');
    const normalized = startOfParams > -1
        ? normalizedUrl.slice(0, startOfParams)
        : normalizedUrl;
    if (normalized === '\\') return '/index.html';
    return normalized;
}

