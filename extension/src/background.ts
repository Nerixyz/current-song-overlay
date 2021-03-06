import './extension-api'; // fix chrome
import { TabChangeHandler } from './TabChangeHandler';
import { connectWithReconnect } from './utilities';
import { InternalMessage, UpdateEventArg, UpdateEventMap, VideoPlayState } from './types';

(async () => {
  console.log('background');
  const isChrome = !browser.tabs.detectLanguage.length;

  const currentWindow = await browser.windows.getCurrent();
  const handler = new TabChangeHandler(
    { onlyInactive: true },
    isChrome ? -1 : currentWindow?.id ?? -1,
    await browser.windows.getAll({ populate: true }).then(windows => windows.map(x => x.tabs ?? []).flat())
  );
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo) =>
    handler.handleUpdated(changeInfo, await browser.tabs.get(tabId))
  );
  browser.tabs.onActivated.addListener(async activeInfo =>
    handler.handleFocus(activeInfo.tabId, activeInfo.previousTabId, await browser.tabs.get(activeInfo.tabId))
  );
  browser.tabs.onCreated.addListener(tab => handler.handleCreated(tab));
  browser.tabs.onRemoved.addListener(tabId => handler.handleRemove(tabId));

  // do not use windows api on chrome see: https://bugs.chromium.org/p/chromium/issues/detail?id=387377
  // returns 1 on firefox and 0 on chrome
  if(!isChrome) {
    browser.windows.onFocusChanged.addListener(windowId => handler.handleWindowFocus(windowId).catch(console.error));
    browser.windows.onRemoved.addListener(windowId => handler.handleWindowRemoved(windowId));
  }

  browser.runtime.onMessage.addListener((message: InternalMessage, sender) => {
    if (message.type === 'PlayState') {
      handler.handlePlayState(
        sender.tab?.id ?? -1,
        {
          state: message.data as VideoPlayState | undefined,
          tabId: sender.tab?.id ?? -1,
        },
        sender.tab!
      );
    } else if (message.type === 'Title') {
      handler.handleOverriddenTitle(sender.tab?.id ?? -1, message.data as string | null);
    } else if(message.type === 'Metadata') {
      handler.handleMetadataUpdated(sender.tab?.id ?? -1, JSON.parse(message.data as string) || undefined);
    }
  });

  const wsRef = connectWithReconnect('ws://localhost:232');
  handler.onUpdate = (e: UpdateEventArg<keyof UpdateEventMap>) => {
    wsRef.value?.send(JSON.stringify(e));
  };
})();
