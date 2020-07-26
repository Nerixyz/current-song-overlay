import {WsServer} from './WsServer.ts';
import {OverlayClientEvent, OverlayClientEventMap, OverlayClientStateChangedEvent} from './types.ts';

export class OverlayServer extends WsServer<OverlayClientEvent<keyof OverlayClientEventMap>> {

    protected channelIdx = 0;
    protected channelStatuses: OverlayClientStateChangedEvent[] = [];
    protected lastStatusSender?: number;


    constructor(port: number) {
        super(port, true);
    }

    send(event: OverlayClientEvent<keyof OverlayClientEventMap>, channelId: number) {
        if (event.type === 'StateChanged') {
            const data = event.data as OverlayClientStateChangedEvent;
            const actualChannelId = channelId;
            if (typeof this.lastStatusSender !== 'undefined' && data?.state !== 'playing') {
                const nextAudibleId = findLastIndex(this.channelStatuses,
                    (x, i) => x?.state === 'playing' && i !== channelId);
                if (nextAudibleId !== -1) {
                    event.data = this.channelStatuses[nextAudibleId];
                    channelId = nextAudibleId;
                }
            }
            this.lastStatusSender = channelId;
            this.channelStatuses[actualChannelId] = data;
        }
        this.sendToAll(event);
    }

    createChannel(): number {
        return this.channelIdx++;
    }
}

function findLastIndex<T>(arr: T[], predicate: (item: T, index: number) => boolean): number | -1 {
    for(let i = arr.length - 1; i >= 0; i--){
        if(predicate(arr[i], i))
            return i;
    }
    return -1;
}
