import { listenAndServe } from "https://deno.land/std@0.88.0/http/server.ts";
import type {
  Response,
  ServerRequest,
} from "https://deno.land/std@0.88.0/http/server.ts";
import {
  extname,
  join as pathJoin,
  normalize,
} from "https://deno.land/std@0.88.0/path/mod.ts";
import * as log from "https://deno.land/std@0.88.0/log/mod.ts";
import { randomHexString} from "../utilities.ts";
import { RingBuffer } from './ringBuffer.ts';

export class StaticFileMapSingleton {
  protected knownPaths = new Map<string, string>();
  protected tokenBuffer = new RingBuffer<string>(20);

  private static _instance?: StaticFileMapSingleton;
  static instance(): StaticFileMapSingleton {
    if (StaticFileMapSingleton._instance) {
      return StaticFileMapSingleton._instance;
    }

    StaticFileMapSingleton._instance = new StaticFileMapSingleton();
    return StaticFileMapSingleton._instance;
  }

  public add(url: string, id?: string) {
    if (url.startsWith("file:///")) url = url.substring("file:///".length);

    id ??= randomHexString(20);
    this.knownPaths.set(id, url);
    const toRemove = this.tokenBuffer.push(id);
    if (toRemove) this.knownPaths.delete(toRemove);

    return id;
  }

  public resolve(id: string): string | undefined {
    return this.knownPaths.get(id);
  }
}

const MEDIA_TYPES: Record<string, string> = {
  ".md": "text/markdown",
  ".html": "text/html",
  ".htm": "text/html",
  ".json": "application/json",
  ".map": "application/json",
  ".txt": "text/plain",
  ".ts": "text/typescript",
  ".tsx": "text/tsx",
  ".js": "application/javascript",
  ".jsx": "text/jsx",
  ".gz": "application/gzip",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".mjs": "application/javascript",
};

export async function serve(settings: { port: number; path: string }) {
  return listenAndServe(
    { port: settings.port },
    (req) =>
      handle(req, settings.path).catch((e): Response => {
        // TODO: logging
        return {
          status: 500,
          body: JSON.stringify({ error: "Internal server error." }),
        };
      }).then((res) => req.respond(res)),
  );
}

async function handle(req: ServerRequest, root: string): Promise<Response> {
  log.debug(`${req.method}: ${req.url}`);

  if (req.method === "OPTIONS") {
    return {
      status: 200,
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      }),
    };
  }
  if (req.method !== "GET") {
    return {
      status: 400,
      body: JSON.stringify({ error: "Expected GET request" }),
    };
  }

  const toServe = resolve(root, req.url);
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
        "Content-Type": MEDIA_TYPES[extname(toServe) ?? ""] ??
          "application/octet-stream",
        "Content-Length": stat.size.toString(),
      }),
    };
  } catch (e) {
    log.warning(`serve: failed(${e.message ?? "<no message>"}) => 404`);
    return notFound();
  }
}

function resolve(root: string, url: string) {
  if (url.startsWith("/token.")) {
    const resolver = StaticFileMapSingleton.instance();
    const [, id] = url.match(/^\/token\.([0-9a-fA-F]+)/) ?? [];
    const resolved = resolver.resolve(id);
    if (resolved) return resolved;
  }
  return pathJoin(root, normalizeURL(url));
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
  const startOfParams = normalizedUrl.indexOf("?");
  const normalized = startOfParams > -1
    ? normalizedUrl.slice(0, startOfParams)
    : normalizedUrl;
  if (normalized === "\\") return "/index.html";
  return normalized;
}
