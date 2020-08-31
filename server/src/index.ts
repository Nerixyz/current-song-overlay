// load the logger before everything
import setupLogging from './logging.ts';
const stopLogging = await setupLogging();

import { createReloader, readEnableEnvVar } from "./utilities.ts";
import { OverlayServer } from "./OverlayServer.ts";
import {
  createBrowserHandler,
  createServer,
  createSpotifyClientAndHandler,
  createVlcClient,
} from "./create-handler.ts";
import * as log from "https://deno.land/std/log/mod.ts";

const logger = log.getLogger();
logger.info("Starting Current Song Overlay");

const clientServer = new OverlayServer(231);

const reloader = createReloader();
const promises = [clientServer.start()];

if (readEnableEnvVar("browser")) {
  logger.info("Using Browser Handler");
  promises.push(
    reloader.start(
      createBrowserHandler(clientServer, clientServer.createChannel()),
      undefined,
      "BrowserHandler"
    )
  );
}

if (readEnableEnvVar("spotify")) {
  logger.info("Using Spotify Handler");
  promises.push(
    reloader.start(
      createSpotifyClientAndHandler(clientServer, clientServer.createChannel()),
      (e) => logger.debug(`Spotify: ${e.message}`),
      "SpotifyHandler"
    )
  );
}

if (readEnableEnvVar("vlc")) {
  logger.info("Using VLC Handler");
  promises.push(
    reloader.start(
      createVlcClient(clientServer, clientServer.createChannel()),
      undefined,
      "VlcHandler"
    )
  );
}

if (readEnableEnvVar("overlay_server")) {
  logger.info("Serving static files");
  promises.push(reloader.start(createServer(), undefined, "StaticServer"));
}

await Promise.race(promises)
  .catch((e) =>
    logger.critical(`Client errored: ${e.message ?? e} ${e.stack ?? ""}`)
  )
  .finally(async () => {
    logger.info("Client stopped");
    await reloader.stop();
    stopLogging();
    Deno.exit();
  });
