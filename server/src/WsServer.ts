import {serve, Server} from 'https://deno.land/std@0.75.0/http/server.ts';
import {
    acceptWebSocket,
    isWebSocketCloseEvent,
    WebSocket,
} from 'https://deno.land/std@0.75.0/ws/mod.ts';
import * as log from "https://deno.land/std@0.75.0/log/mod.ts";


export class WsServer<MsgType = unknown> {
    sockets: WebSocket[] = [];
    server?: Server;
    lastMessage?: MsgType;

    constructor(protected port: number, protected persistMessage: boolean) {
    }

    onMessage?: (event: MsgType) => void;

    sendToAll(message: MsgType) {
        this.lastMessage = message;
        for (const ws of this.sockets) {
            if(!ws.isClosed)
                ws.send(JSON.stringify(message));
        }
    }

    async start() {
        this.sockets = [];
        log.debug(`:${this.port} - listening`);
        for await (const req of serve({port: this.port})) {
            const {conn, r: bufReader, w: bufWriter, headers} = req;
            log.debug(`:${this.port} - new connection from ${headers.get('user-agent')}`);
            acceptWebSocket({
                conn,
                bufReader,
                bufWriter,
                headers,
            }).then(sock => this.handleWs(sock)).catch(async (err) => {
                log.error(`:${this.port} - failed to accept websocket: ${err.stack}`);
                await req.respond({status: 400});
            });
        }
    }

    protected async handleWs(ws: WebSocket) {
        this.sockets.push(ws);
        if (this.persistMessage && this.lastMessage) ws.send(JSON.stringify(this.lastMessage));
        for await(const event of ws) {
            if (isWebSocketCloseEvent(event)) this.sockets = this.sockets.filter(x => x !== ws);
            if (typeof event === 'string') this.onMessage?.(JSON.parse(event));
        }
        this.sockets = this.sockets.filter(x => x !== ws);
    }

    public async stop(): Promise<void> {
        log.debug(`:${this.port} - stop`);
        this.server?.close();
        await Promise.all(this.sockets.map(s => s.close()));
    }
}
