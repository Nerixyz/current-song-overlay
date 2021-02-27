import { MessageHandler } from './messaging.ts';
import { BrowserEvents } from './events/Browser.ts';
import { WsServer } from '../WsServer.ts';
import { BrowserActiveEvent, UpdateBrowserEventArg, UpdateBrowserEventMap } from '../types.ts';
import { splitTitle } from '../utilities.ts';

const handler = new MessageHandler<BrowserEvents>(self as any);

(async () => {
  const {port} = await handler.awaitEvent('init');

  const browserServer = new WsServer<UpdateBrowserEventArg<keyof UpdateBrowserEventMap>>(port, false);
  browserServer.onMessage = event => {
    if (event.type === 'Active') {
      const data = event.data as BrowserActiveEvent;
      handler.emit('playing', {
        playPosition: data.state && data.state.mode === 'playing' ? {
          startTs: data.state.sentTs,
          duration: data.state.duration,
          rate: data.state.speed,
          position: data.state.currentPos,
        } : undefined,
        song: {
          ...(!data.current.artist ? splitTitle(data.current.title) : {
            artists: [data.current.artist],
            title: data.current.title,
          }),
          cover: data.current.artwork
        }
      });
    } else if (event.type === 'Inactive') {
      handler.emit('paused', 'paused');
    }
  };
  await browserServer.start();
})();
