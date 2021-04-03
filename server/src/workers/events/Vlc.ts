import { VlcOptions } from "../../vlc/VlcServer.ts";
import { SongSourceEvents } from "./SongSource.ts";
import { LifecycleEvents } from "./Lifecycle.ts";

export interface VlcEvents
  extends SongSourceEvents, LifecycleEvents<VlcOptions> {
  serveUrl: [string, string];
}
