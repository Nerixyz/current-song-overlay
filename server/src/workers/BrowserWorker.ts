import setupLogging from "../logging.ts";
const stopLogging = await setupLogging("browser");
import { MessageHandler } from "./MessageHandler.ts";
import { BrowserEvents } from "./events/Browser.ts";
import { WsServer } from "../WsServer.ts";
import { splitTitle } from "../utilities.ts";
import * as log from "https://deno.land/std@0.88.0/log/mod.ts";

type UpdateBrowserEventArg<T extends keyof UpdateBrowserEventMap> = {
  type: T;
  data: UpdateBrowserEventMap[T];
};

interface UpdateBrowserEventMap {
  Active: BrowserActiveEvent;
  Inactive: {};
}

interface BrowserActiveEvent {
  metadata: { title: string; artist?: string; artwork?: string };
  position?: BrowserVideoPlayPosition;
}

interface BrowserVideoPlayPosition {
  rate: number;
  timestamp: number;
  duration: number;
  position: number;
}

const handler = new MessageHandler<BrowserEvents>(self as any);

(async () => {
  handler.emit("started", "started");
  const { port } = await handler.awaitEvent("init");

  const browserServer = new WsServer<
    UpdateBrowserEventArg<keyof UpdateBrowserEventMap>
  >(port, false);
  browserServer.onMessage = (event) => {
    if (event.type === "Active") {
      const data = event.data as BrowserActiveEvent;
      handler.emit("playing", {
        playPosition: data.position,
        track: {
          ...(!data.metadata.artist ? splitTitle(data.metadata.title) : {
            artists: [data.metadata.artist],
            title: data.metadata.title,
          }),
          cover: data.metadata.artwork,
        },
      });
    } else if (event.type === "Inactive") {
      handler.emit("paused", "paused");
    }
  };

  log.info(`Listening on ${port}`);
  await browserServer.start();
  stopLogging();
})();
