import { PlayingEvent } from "../../types.ts";

export interface SongSourceEvents {
  playing: PlayingEvent;
  paused: "paused";
}
