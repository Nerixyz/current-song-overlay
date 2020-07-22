import {createReloader, readEnableEnvVar} from './utilities.ts';
import {ClientServer} from './ClientServer.ts';
import {createBrowserHandler, createServer, createSpotifyClientAndHandler, createVlcClient} from './create-handler.ts';

const clientServer = new ClientServer(231);

const reloader = createReloader();
const promises = [clientServer.start()];

if (readEnableEnvVar('browser'))
    promises.push(reloader.start(createBrowserHandler(clientServer, clientServer.createChannel())));

if (readEnableEnvVar('spotify')) {
    promises.push(reloader.start(createSpotifyClientAndHandler(clientServer, clientServer.createChannel()), console.error));
}

if (readEnableEnvVar('vlc'))
    promises.push(reloader.start(createVlcClient(clientServer, clientServer.createChannel())));

if (readEnableEnvVar('overlay_server'))
    promises.push(reloader.start(createServer()));


await Promise.race(promises).catch(e => console.error(e)).then(async () => {
    console.error('client stopped doctorWtf');
    await reloader.stop();
    Deno.exit();
});
