import { WsServer } from "./WsServer.ts";
import {
  OverlayClientEvent,
  OverlayClientEventMap,
} from "./types.ts";
import * as log from "https://deno.land/std@0.75.0/log/mod.ts";
import { PlayingEvent, SongSourceEvents } from './workers/events/SongSource.ts';
import { WorkerHandler } from './WorkerHandler.ts';

export class OverlayServer extends WsServer<
  OverlayClientEvent<keyof OverlayClientEventMap>
> {
  protected channelIdx = 0;
  protected channelStatuses = new Map<number, PlayingEvent>();
  protected lastStatusSender?: number;

  constructor(port: number) {
    super(port, true);
  }

  sendPlaying({song, playPosition}: PlayingEvent) {
    this.sendToAll({
      type: 'StateChanged',
      data: {
        current: {
          name: song.title,
          albumImageUrl: song.cover,
          artists: song.artists,
        },
        position: playPosition && {
          playbackSpeed: playPosition.rate ?? 1,
          currentPositionSec: playPosition.position,
          startTs: playPosition.startTs,
          maxPositionSec: playPosition.duration
        },
        state: 'playing'
      }
    });
  }

  sendPaused() {
    this.sendToAll({
      type: 'StateChanged',
      data: {
        state: 'paused'
      }
    });
  }

  onPause(channelId: number) {
    this.channelStatuses.delete(channelId);
    // fast path
    if(this.lastStatusSender === undefined) {
      log.debug(`(${channelId}) Tried falling back; lastStatusSender is undefined`);
      return this.sendPaused();
    }

    const nextAudible = first(this.channelStatuses.entries());
    if(!nextAudible) {
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

  registerWorker(handler: WorkerHandler<any>) {
    handler = handler as WorkerHandler<SongSourceEvents>; // TS doesn't want this as a parameter

    const id = this.createChannel();
    handler.events.on('playing', event => this.onPlay(id, event));
    handler.events.on('paused', () => this.onPause(id));
  }

  createChannel(): number {
    return this.channelIdx++;
  }
}

function first<T>(iter: Iterator<T>): T | undefined {
  return iter.next().value;
}

function stringifyState({playPosition, song: {title, artists}}: PlayingEvent) {
  return (
    `[Playing] Current(title: '${
          title
        }' artists: '${artists?.join(", ") ?? ''}')` +
    (playPosition
      ? ` Position(pos: ${playPosition.position} speed: ${playPosition.rate ?? 1} duration: ${playPosition.duration} ts: ${playPosition.startTs})`
      : "")
  );
}
