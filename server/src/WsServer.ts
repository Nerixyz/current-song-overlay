import {serve, Server} from 'https://deno.land/std/http/server.ts';
import {
    acceptWebSocket,
    isWebSocketCloseEvent,
    WebSocket,
} from 'https://deno.land/std/ws/mod.ts';


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
            ws.send(JSON.stringify(message));
        }
    }

    async start() {
        this.sockets = [];
        //this.server = serve(`localhost:${this.port}`);
        console.debug(`listening on :${this.port}`);
        for await (const req of serve({port: this.port})) {
            const {conn, r: bufReader, w: bufWriter, headers} = req;
            console.debug(`new connection on :${this.port} ${headers.get('user-agent')}`);
            acceptWebSocket({
                conn,
                bufReader,
                bufWriter,
                headers,
            }).then(sock => this.handleWs(sock)).catch(async (err) => {
                console.error(`failed to accept websocket: ${err.stack}`);
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
    }

    public async stop(): Promise<void> {
        console.debug(`Stop :${this.port}`);
        this.server?.close();
        await Promise.all(this.sockets.map(s => s.close()));
    }
}
