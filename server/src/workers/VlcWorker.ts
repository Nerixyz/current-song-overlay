import { VlcServer, VlcServerStateData } from '../vlc/VlcServer.ts';
import { MessageHandler } from './messaging.ts';
import { VlcEvents } from './events/Vlc.ts';
import { randomHexString, splitTitle } from '../utilities.ts';

const handler = new MessageHandler<VlcEvents>(self as any);

(async () => {
  const options = await handler.awaitEvent('init');
  console.log(options);
  const vlc = new VlcServer(options);
  vlc.onMessage = msg => {
    if (msg.state !== 'playing') {
      handler.emit('paused', 'paused');
      return;
    }

    handler.emit('playing', {
      song: {
        ...createCurrentTrack(msg),
        cover: msg.artwork_url && `/token.${serveFile(msg.artwork_url)}`,
      },
      playPosition: {
        rate: msg.rate,
        position: msg.position,
        startTs: Date.now(),
        duration: msg.duration
      }
    });
  };
  await Promise.race([vlc.start(), handler.awaitEvent('exit')]);
  vlc.stop();
})();

function createCurrentTrack({ title, artist, file }: VlcServerStateData): {title: string, artists?: string[]} {
  if (!title) {
    return artist ? { artists: [artist], title: file } : { title: file };
  }
  return artist ? { title: title, artists: [artist] } : splitTitle(title);
}

function serveFile(url: string): string {
  const id = randomHexString(20);
  handler.emit('serveUrl', [url, id]);

  return id;
}

