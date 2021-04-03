import { WsServer } from "./WsServer.ts";
import {
  OverlayClientEvent,
  OverlayClientEventMap,
  PlayingEvent,
} from "./types.ts";
import * as log from "https://deno.land/std@0.88.0/log/mod.ts";
import { SongSourceEvents } from "./workers/events/SongSource.ts";
import { WorkerWrapper } from "./WorkerWrapper.ts";

export class OverlayServer extends WsServer<
  OverlayClientEvent<keyof OverlayClientEventMap>
> {
  protected channelIdx = 0;
  protected channelStatuses = new Map<number, PlayingEvent>();
  protected lastStatusSender?: number;

  constructor(port: number) {
    super(port, true);
  }

  sendPlaying(event: PlayingEvent) {
    this.sendToAll({
      type: "StateChanged",
      data: event,
    });
  }

  sendPaused() {
    this.sendToAll({
      type: "StateChanged",
      data: "paused",
    });
  }

  onPause(channelId: number) {
    this.channelStatuses.delete(channelId);
    // fast path
    if (this.lastStatusSender === undefined) {
      log.debug(
        `(${channelId}) Tried falling back; lastStatusSender is undefined`,
      );
      return this.sendPaused();
    }

    const nextAudible = first(this.channelStatuses.entries());
    if (!nextAudible) {
      log.debug(`(${channelId}) Tried falling back; no audible source`);
      return this.sendPaused();
    }
    const [audibleId, data] = nextAudible;
    this.lastStatusSender = audibleId;
    this.sendPlaying(data);
    log.debug(`(${channelId}) Falling back from ${channelId} to ${audibleId}`);
  }

  onPlay(channelId: number, event: PlayingEvent) {
    this.channelStatuses.set(channelId, event);
    this.lastStatusSender = channelId;
    this.sendPlaying(event);
    log.debug(`(${channelId}) Sending ${stringifyState(event)}`);
  }

  registerWorker(handler: WorkerWrapper<any>) {
    handler = handler as WorkerWrapper<SongSourceEvents>; // TS doesn't want this as a parameter

    const id = this.createChannel();
    handler.events.on("playing", (event) => this.onPlay(id, event));
    handler.events.on("paused", () => this.onPause(id));
  }

  createChannel(): number {
    return this.channelIdx++;
  }
}

function first<T>(iter: Iterator<T>): T | undefined {
  return iter.next().value;
}

function stringifyState(
  { playPosition, track: { title, artists } }: PlayingEvent,
) {
  return (
    `[Playing] Current(title: '${title}' artists: '${artists?.join(", ") ??
      ""}')` +
    (playPosition
      ? ` Position(pos: ${playPosition.position} speed: ${playPosition.rate ??
        1} duration: ${playPosition.duration} ts: ${playPosition.timestamp})`
      : "")
  );
}
