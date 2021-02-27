import { MessageHandler } from './MessageHandler.ts';
import { SpotifyEvents } from './events/Spotify.ts';
import { SpotifyClient } from '../spotify/SpotifyClient.ts';
import { sleep } from '../utilities.ts';


const handler = new MessageHandler<SpotifyEvents>(self as any);

(async () => {
    const { cookies } = await handler.awaitEvent('init');
    const exitPromise = handler.awaitEvent('exit');

    while(true) {
      try {
        const client = new SpotifyClient(cookies, message => {
          if (message === 'paused') {
            handler.emit('paused', 'paused');
            return;
          }
          handler.emit('playing', message);
        });
        await client.start();
        if(await Promise.race([exitPromise, client.closePromise]) === 'exit') {
          break;
        }
      } catch (e) {
        await sleep(5000);
      }
    }
})();
