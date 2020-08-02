import { TabChangeHandler } from './TabChangeHandler';
import { connectWithReconnect, fixChrome } from './utilities';
import { InternalMessage, UpdateEventArg, UpdateEventMap, VideoPlayState } from './types';

fixChrome();

(async () => {
  console.log('background');
  const currentWindow = await browser.windows.getCurrent();
  const handler = new TabChangeHandler(
    { onlyInactive: true },
    currentWindow?.id ?? -1,
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
  browser.windows.onFocusChanged.addListener(windowId => handler.handleWindowFocus(windowId).catch(console.error));
  browser.windows.onRemoved.addListener(windowId => handler.handleWindowRemoved(windowId));

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
    }
  });

  const wsRef = connectWithReconnect('ws://localhost:232');
  handler.onUpdate = (e: UpdateEventArg<keyof UpdateEventMap>) => {
    wsRef.value?.send(JSON.stringify(e));
  };
})();
