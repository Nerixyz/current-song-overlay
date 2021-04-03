import setupLogging from "../logging.ts";
const stopLogging = await setupLogging("vlc");
import { VlcServer, VlcServerStateData } from "../vlc/VlcServer.ts";
import { MessageHandler } from "./MessageHandler.ts";
import { VlcEvents } from "./events/Vlc.ts";
import { randomHexString, splitTitle } from "../utilities.ts";

const handler = new MessageHandler<VlcEvents>(self as any);

(async () => {
  handler.emit("started", "started");
  const options = await handler.awaitEvent("init");
  const vlc = new VlcServer(options);
  vlc.onMessage = (msg) => {
    if (msg.state !== "playing") {
      handler.emit("paused", "paused");
      return;
    }

    handler.emit("playing", {
      track: {
        ...createCurrentTrack(msg),
        cover: msg.artwork_url && `/token.${serveFile(msg.artwork_url)}`,
      },
      playPosition: {
        rate: msg.rate,
        position: msg.position,
        timestamp: Date.now(),
        duration: msg.duration,
      },
    });
  };
  await Promise.race([vlc.start(), handler.awaitEvent("exit")]);
  vlc.stop();
  stopLogging();
})();

function createCurrentTrack(
  { title, artist, file }: VlcServerStateData,
): { title: string; artists?: string[] } {
  if (!title) {
    return artist ? { artists: [artist], title: file } : { title: file };
  }
  return artist ? { title: title, artists: [artist] } : splitTitle(title);
}

function serveFile(url: string): string {
  const id = randomHexString(20);
  handler.emit("serveUrl", [url, id]);

  return id;
}
