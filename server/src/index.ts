// load the logger before everything
import setupLogging from './logging.ts';
const stopLogging = await setupLogging();
import { isModuleEnabled, getVarOrDefault, getModuleOptions } from './config.ts';
import { OverlayServer } from "./OverlayServer.ts";
import * as log from "https://deno.land/std@0.75.0/log/mod.ts";
import { serve, StaticFileMapSingleton } from './http/serve.ts';
import { BrowserEvents } from './workers/events/Browser.ts';
import { WorkerHandler } from './WorkerHandler.ts';
import { SpotifyEvents } from './workers/events/Spotify.ts';
import { VlcEvents } from './workers/events/Vlc.ts';

const logger = log.getLogger();
logger.info("\n\n\nStarting Current Song Overlay");

const clientServer = new OverlayServer(getVarOrDefault('websocketPort', 231));


if (getVarOrDefault('overlayEnabled', true)) {
  const port = getVarOrDefault('overlayPort', 230);
  log.debug(`Serving files on :${port}`);
  serve({ port, path: Deno.env.get('NON_BUILD_ENV') ? 'client/public' : 'overlay' }).catch(e => log.error('Serve failed', e));
}

if (isModuleEnabled("browser")) {
  logger.info("Using BrowserHandler");
  const browserConfig = getModuleOptions('browser');
  clientServer.registerWorker(new WorkerHandler<BrowserEvents>('BrowserWorker', {port: browserConfig.port ?? 232}, {}))
}

(() => {
  if (isModuleEnabled("spotify")) {
    logger.info("Using SpotifyHandler");
    const spotifyOptions = getModuleOptions('spotify');
    if(!spotifyOptions.cookies || spotifyOptions.cookies.endsWith('=')) return;

    clientServer.registerWorker(new WorkerHandler<SpotifyEvents>('SpotifyWorker', {cookies: spotifyOptions.cookies}, {}));
 }
})();

if (isModuleEnabled("vlc")) {
  logger.info("Using VlcHandler");
  const vlcOptions = getModuleOptions('vlc');

  clientServer.registerWorker(new WorkerHandler<VlcEvents>('VlcWorker', vlcOptions, {
    serveUrl([url, id]) {
      StaticFileMapSingleton.instance().add(url, id);
    }
  }));
}

await clientServer.start();
stopLogging();
