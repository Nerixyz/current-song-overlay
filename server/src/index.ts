// load the logger before everything
import setupLogging from './logging.ts';
const stopLogging = await setupLogging();
import { isModuleEnabled, getVarOrDefault } from './config.ts';
import { createReloader } from "./utilities.ts";
import { OverlayServer } from "./OverlayServer.ts";
import {
  createBrowserHandler,
  createServer,
  createSpotifyClientAndHandler,
  createVlcServer,
} from './create-handler.ts';
import * as log from "https://deno.land/std@0.75.0/log/mod.ts";

const logger = log.getLogger();
logger.info("\n\n\nStarting Current Song Overlay");

const clientServer = new OverlayServer(getVarOrDefault('websocketPort', 231));

const reloader = createReloader();
const promises = [clientServer.start()];

if (isModuleEnabled("browser")) {
  logger.info("Using BrowserHandler");
  promises.push(
    reloader.start(
      createBrowserHandler(clientServer, clientServer.createChannel()),
      undefined,
      "BrowserHandler"
    )
  );
}

if (isModuleEnabled("spotify")) {
  logger.info("Using SpotifyHandler");
  const spotify = createSpotifyClientAndHandler(clientServer, clientServer.createChannel());
  if(spotify) {
    promises.push(
        reloader.start(
            spotify,
            (e) => logger.error(`Spotify: ${ e.message }`),
            "SpotifyHandler"
        )
    );
  }
}

if (isModuleEnabled("vlc")) {
  logger.info("Using VlcHandler");
  // promises.push(
  //   reloader.start(
  //     createVlcClient(clientServer, clientServer.createChannel()),
  //     undefined,
  //     "VlcHandler"
  //   )
  // );

  promises.push(
      reloader.start(
          createVlcServer(clientServer, clientServer.createChannel()),
          undefined,
          "VlcHandler"
      )
  );
}

if (getVarOrDefault('overlayEnabled', true)) {
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
