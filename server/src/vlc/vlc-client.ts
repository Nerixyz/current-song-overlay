export class VlcClient {
    protected conn?: Deno.Conn;

    protected lastState?: string;
    protected lastInfo?: { artist?: string, name: string };

    constructor(protected address: string, protected pollInterval = 300) {
    }

    onMessage?: (msg: VlcMessage) => void;

    async start() {
        this.conn = await Deno.connect({
            port: Number(this.address.split(':')[1] ?? '8000'),
            hostname: this.address.split(':')[0],
        });
        this.initPollLoop();
        const decoder = new TextDecoder();
        for await(const pack of Deno.iter(this.conn)) {
            const stringContent = decoder.decode(pack);
            if (stringContent.startsWith('+')) {
                const info = extractInfoFromMessage(parseInfoResponse(stringContent));
                if (!this.lastInfo || info.name !== this.lastInfo.name || info.artist !== this.lastInfo.artist) {
                    this.lastInfo = info;
                    this.emit();
                }
            } else if (stringContent.startsWith('(')) {
                const obj = parseStatusResponse(stringContent);
                if (obj.state !== this.lastState) {
                    this.lastState = obj.state;
                    this.emit();
                }
            }
        }
        this.stopPolling();
    }

    protected pollLoopId?: number;

    protected initPollLoop() {
        const encoder = new TextEncoder();
        let reqInfo = false;
        this.pollLoopId = setInterval(() => {
            if (reqInfo) {
                (this.lastState === 'playing' || !this.lastInfo) && this.conn?.write(encoder.encode('info\n'));
            } else {
                this.conn?.write(encoder.encode('status\n'));
            }
            reqInfo = !reqInfo;
        }, this.pollInterval / 2);
    }

    protected stopPolling() {
        if (this.pollLoopId) {
            clearInterval(this.pollLoopId);
            this.pollLoopId = undefined;
        }
    }

    public stop() {
        this.stopPolling();
        this.conn?.close();
    }

    protected emit() {
        this.onMessage?.({
            info: {
                artists: this.lastInfo?.artist ? [this.lastInfo.artist] : [],
                name: this.lastInfo?.name
            }, state: this.lastState ?? 'stopped'
        });
    }
}

export interface VlcMessage {
    state: 'playing' | 'paused' | 'stopped' | string;
    info: { artists?: string[], name?: string };
}

function extractInfoFromMessage(msg: VlcInfoMessage): { artist?: string, name: string } {
    return {
        artist: msg.metadata.artist,
        name: msg.metadata.title ?? msg.metadata.filename,
    };
}


function parseInfoResponse(content: string): VlcInfoMessage {
    const partial: Partial<VlcInfoMessage> = {streams: []};
    for (const obj of content.split('+----[')) {
        if (!obj.length) continue;
        const [objHeader, ...objContent] = obj.split(']');
        switch (objHeader.replace(/\d/g, '').trim().toLowerCase()) {
            case 'meta data': {
                partial.metadata = parseInfoSubObj(objContent.join(']')) as any;
                break;
            }
            case 'stream': {
                const [, id] = objHeader.match(/Stream (\d+)/) ?? [];
                const stream = parseInfoSubObj(objContent.join(']'));
                stream._id = id;
                partial.streams!.push(stream as any); // pogo typescript
                break;
            }
            case 'end of stream info':
                break;
            default:
                console.log(objHeader);
        }
    }
    return partial as VlcInfoMessage;
}

function parseInfoSubObj(content: string): Record<string, string> {
    const obj: Record<string, string> = {};
    for (const line of content.split('|')) {
        const actualLine = line.trim();
        if (!actualLine) continue;
        const [key, ...value] = actualLine.split(':');
        obj[toCamelCase(key)] = value.join(':').trim();
    }
    return obj;
}

function parseStatusResponse(content: string): VlcStatusMessage {
    const obj: Record<string, string> = {};
    for (const line of content.split('\n')) {
        const actualLine = line.substring(1, line.length - 2).trim();
        if (!actualLine) continue;
        if (actualLine.includes(':')) {
            const [key, ...values] = actualLine.split(':');
            obj[toCamelCase(key)] = values.join(':').trim();
        } else {
            const [key, ...values] = actualLine.split(' ');
            obj[toCamelCase(key)] = values.join(' ').trim();
        }
    }
    return obj as any;
}

export interface VlcInfoMessage {
    metadata: VlcInfoMetadata;
    streams: VlcStreamInfo[];
}

export interface VlcInfoMetadata {
    encodedBy: string;
    filename: string;
    artworkUrl: string;
    description?: string;
    date?: string;
    genre?: string;
    trackNumber?: string;
    iTunesSMPB?: string;
    rating?: string;
    iTunesAccountID?: string;
    iTunMOVI?: string;
    trackTotal?: string;
    artist?: string;
    iTunNORM?: string;
    album?: string;
    iTunesCatalogID?: string;
    writer?: string;
    catalogNumber?: string;
    title?: string;
    language?: string;
}

export interface VlcStreamInfo {
    _id: number;
    codec: string;
    channels: string;
    bitsPerSample: string;
    sampleRate: string;
    type: 'Audio' | 'Video' | 'Subtitle' | string;
    language?: string;
}

export interface VlcStatusMessage {
    newInput: string;
    audioVolume: string;
    state: string;
}

function toCamelCase(str: string): string {
    return firstLowerCase(str.split(/[_\- ]/g).reduce((acc, value) => acc + firstUpperCase(value), ''));
}

function firstLowerCase(str: string): string {
    return str ? str.charAt(0).toLowerCase() + str.substring(1) : str;
}

function firstUpperCase(str: string): string {
    return str ? str.charAt(0).toUpperCase() + str.substring(1) : str;
}
