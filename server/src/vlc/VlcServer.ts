import * as log from "https://deno.land/std@0.88.0/log/mod.ts";

const closeSymbol = Symbol("closed");
type Connection = Deno.Conn & { [closeSymbol]?: boolean };

const textDecoder = new TextDecoder();

export class VlcServer {
  protected listener?: Deno.Listener;
  protected connections: Deno.Conn[] = [];

  onMessage?: (state: VlcServerState) => void;

  constructor(protected readonly options: VlcOptions) {}

  async start() {
    this.listener = self.Deno.listen({ port: this.options.port ?? 235 });
    for await (const conn of this.listener) {
      log.debug(`New connection: ${(conn.remoteAddr as Deno.NetAddr).port}`);
      this.handleConn(conn as Connection).catch((e) => {
        log.error(`Error handling socket: ${e.stack}`);
      }).finally(() => this.removeConn(conn));
    }
  }

  protected removeConn(conn: Connection) {
    conn[closeSymbol] = true;
    this.connections = this.connections.filter((x) => x !== conn);
  }

  protected async handleConn(conn: Connection) {
    conn[closeSymbol] = false;
    this.connections.push(conn);
    while (!conn[closeSymbol]) {
      const buffer = new Uint8Array(2048);
      const written = await conn.read(buffer);
      if (written === null) break;
      const text = textDecoder.decode(buffer.slice(0, written));
      let json: { type: "state" | string; data: VlcServerState | [] };
      try {
        json = JSON.parse(text);
      } catch {
        log.warning(`Invalid JSON: ${text}`);
        continue;
      }

      if (json.type === "state" && !Array.isArray(json.data)) {
        this.onMessage?.(json.data);
      }
    }
    log.debug(`Connection ended: ${(conn.remoteAddr as Deno.NetAddr).port}`);
    conn[closeSymbol] = true;
    this.removeConn(conn);
  }

  stop() {
    this.connections.forEach((c) => c.close());
    this.listener?.close();

    this.connections = [];
    this.listener = undefined;
  }
}

export type VlcServerState = ({ state: "playing" } & VlcServerStateData) | {
  state: "paused" | "stopped" | "stopping" | "started";
};

export interface VlcServerStateData {
  title?: string;
  artist?: string;
  file: string;
  position: number;
  duration: number;
  rate: number;
  artwork_url?: string;
}

export interface VlcOptions {
  port?: number;
}
