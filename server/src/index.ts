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
logger.info("\n\n\nStarting Current Song Overlay");

const clientServer = new OverlayServer(231);

const reloader = createReloader();
const promises = [clientServer.start()];

if (readEnableEnvVar("browser")) {
  logger.info("Using BrowserHandler");
  promises.push(
    reloader.start(
      createBrowserHandler(clientServer, clientServer.createChannel()),
      undefined,
      "BrowserHandler"
    )
  );
}

if (readEnableEnvVar("spotify")) {
  logger.info("Using SpotifyHandler");
  promises.push(
    reloader.start(
      createSpotifyClientAndHandler(clientServer, clientServer.createChannel()),
      (e) => logger.error(`Spotify: ${e.message}`),
      "SpotifyHandler"
    )
  );
}

if (readEnableEnvVar("vlc")) {
  logger.info("Using VlcHandler");
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
