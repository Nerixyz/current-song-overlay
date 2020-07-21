import {VlcClient} from './vlc-client.ts';
import {autoReconnect} from '../utilities.ts';

const client = new VlcClient('localhost:234');
client.onMessage = console.log;
await autoReconnect(() => client.start())[0];


