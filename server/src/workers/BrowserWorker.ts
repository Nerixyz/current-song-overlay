import { MessageHandler } from './MessageHandler.ts';
import { BrowserEvents } from './events/Browser.ts';
import { WsServer } from '../WsServer.ts';
import { splitTitle } from '../utilities.ts';

type UpdateBrowserEventArg<T extends keyof UpdateBrowserEventMap> = { type: T; data: UpdateBrowserEventMap[T] };

interface UpdateBrowserEventMap {
  Active: BrowserActiveEvent ;
  Inactive: {};
}

interface BrowserActiveEvent {
  current: {title: string, artist?: string, artwork?: string};
  state?: BrowserVideoPlayState;
}

interface BrowserVideoPlayState {
  speed: number;
  mode: 'playing' | 'paused';
  sentTs: number;
  duration: number;
  currentPos: number;
}

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
        track: {
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
