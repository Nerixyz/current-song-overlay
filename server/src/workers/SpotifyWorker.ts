import { MessageHandler } from './messaging.ts';
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
          if(message.state !== 'playing') {
            handler.emit('paused', 'paused');
            return;
          }
          handler.emit('playing', {
            playPosition: message.position && {
              duration: message.position.maxPositionSec,
              startTs: message.position.startTs,
              position: message.position.currentPositionSec,
              rate: message.position.playbackSpeed
            },
            song: {
              artists: message.current!.artists,
              cover: message.current!.albumImageUrl,
              title: message.current!.name
            }
          })
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
