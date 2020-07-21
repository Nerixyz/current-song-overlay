import {SpotifyClient} from './spotify/spotify-client.ts';
import {WsServer} from './WsServer.ts';
import {UpdateEventArg, UpdateEventMap} from '../../extension/src/types.ts';
import {createReloader, readCookieEnvVar, splitTitle} from './utilities.ts';
import {VlcClient} from './vlc/vlc-client.ts';
import {ClientServer} from './ClientServer.ts';

const clientServer = new ClientServer(231);
const browserServer = new WsServer<UpdateEventArg<keyof UpdateEventMap>>(232, false);
const browserId = clientServer.createChannel();
browserServer.onMessage = event => {
    if (event.type === 'Active') {
        clientServer.send({
            type: 'StateChanged',
            data: {
                state: 'playing',
                current: splitTitle((event.data as { title: string }).title),
            }
        }, browserId);
    } else if (event.type === 'Inactive') {
        clientServer.send({
            type: 'StateChanged',
            data: {
                state: 'paused',
            }
        }, browserId);
    }
};

const reloader = createReloader();
const client = new SpotifyClient(readCookieEnvVar());
const vlcClient = new VlcClient('localhost:234');
const vlcId = clientServer.createChannel();
vlcClient.onMessage = msg => {
    clientServer.send({
        type: 'StateChanged', data: {
            state: msg.state as any,
            current: {
                name: msg.info.name ?? '',
                artists: msg.info.artists
            }
        }
    }, vlcId);
};
const spotifyId = clientServer.createChannel();
const [handleSpotify, handleSpotifyStart] = ((): [{stop: ()=> boolean}, () => Promise<void>] => {
    let die = false;
    return [{stop: () => die = true}, async () => {
        for await (const message of client.messages()) {
            clientServer.send(message, spotifyId);
        }
    }];
})()
await Promise.race([
    clientServer.start(),
    reloader.push(browserServer, () => browserServer.start()),
    reloader.push(client, async () => {
        await client.connect();
        client.startPing();
    }),
    reloader.push(handleSpotify, handleSpotifyStart),
    reloader.push(vlcClient, () => vlcClient.start())
]).catch(e => console.error(e)).then(async () => {
    console.error('client stopped doctorWtf');
    await reloader.stop();
    Deno.exit();
});
