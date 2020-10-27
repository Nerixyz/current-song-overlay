import { WsServer } from "./WsServer.ts";
import {
  OverlayClientEvent,
  OverlayClientEventMap,
  OverlayClientStateChangedEvent,
} from "./types.ts";
import * as log from "https://deno.land/std@0.75.0/log/mod.ts";

export class OverlayServer extends WsServer<
  OverlayClientEvent<keyof OverlayClientEventMap>
> {
  protected channelIdx = 0;
  protected channelStatuses: OverlayClientStateChangedEvent[] = [];
  protected lastStatusSender?: number;

  constructor(port: number) {
    super(port, true);
  }

  send(
    event: OverlayClientEvent<keyof OverlayClientEventMap>,
    channelId: number
  ) {
    if (event.type === "StateChanged") {
      const data = event.data as OverlayClientStateChangedEvent;
      const actualChannelId = channelId;
      if (data?.state !== "playing") {
        if (this.lastStatusSender !== undefined) {
          const nextAudibleId = findLastIndex(
            this.channelStatuses,
            (x, i) => x?.state === "playing" && i !== channelId
          );
          if (nextAudibleId !== -1) {
            event.data = this.channelStatuses[nextAudibleId];
            channelId = nextAudibleId;
            log.debug(
              `(${channelId}) Falling back from ${actualChannelId} to ${channelId}`
            );
          } else {
            log.debug(`(${channelId}) Tried falling back; no audible source`);
          }
        } else {
          log.debug(`(${channelId}) Tried falling back; lastStatusSender is undefined`);
        }
      } else {
        log.debug(`(${channelId}) Sending ${stringifyState(data)}`);
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

function findLastIndex<T>(
  arr: T[],
  predicate: (item: T, index: number) => boolean
): number | -1 {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i], i)) return i;
  }
  return -1;
}

function stringifyState(data: OverlayClientStateChangedEvent) {
  return (
    `[${data.state}]` +
    (data.current
      ? ` current { name: '${
          data.current.name
        }' artists: '${data.current.artists?.join(", ") ?? ''}' }`
      : "") +
    (data.position
      ? ` position { pos: ${data.position.currentPositionSec} speed: ${data.position.playbackSpeed} duration: ${data.position.maxPositionSec} ts: ${data.position.startTs} }`
      : "")
  );
}
