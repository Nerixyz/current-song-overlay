import './extension-api'; // fix chrome
import { TabChangeHandler } from './TabChangeHandler';
import { connectWithReconnect } from './utilities';
import { InternalMessageMap, UpdateEventArg, UpdateEventMap } from './types';
import { BackgroundEventHandler } from 'beaverjs';

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
    handler.onTabUpdated(changeInfo, await browser.tabs.get(tabId))
  );
  browser.tabs.onActivated.addListener(async activeInfo =>
    handler.onTabFocused(activeInfo.previousTabId, await browser.tabs.get(activeInfo.tabId))
  );
  browser.tabs.onCreated.addListener(tab => handler.onTabCreated(tab));
  browser.tabs.onRemoved.addListener(tabId => handler.onTabRemoved(tabId));

  // do not use windows api on chrome see: https://bugs.chromium.org/p/chromium/issues/detail?id=387377
  // returns 1 on firefox and 0 on chrome
  if (!isChrome) {
    browser.windows.onFocusChanged.addListener(windowId => handler.onWindowFocused(windowId).catch(console.error));
    browser.windows.onRemoved.addListener(windowId => handler.onWindowRemoved(windowId));
  }

  const events = new BackgroundEventHandler<InternalMessageMap>();
  events.on('PlayPosition', (position, sender) => handler.updatePlayPosition(sender.tab!, position));
  events.on('Metadata', (meta, sender) => handler.updateMetadata(sender.tab!, meta));
  events.on('PlayMode', (mode, sender) => handler.updatePlayMode(sender.tab!, mode));

  const wsRef = connectWithReconnect('ws://localhost:232');
  handler.onUpdate = (e: UpdateEventArg<keyof UpdateEventMap>) => {
    wsRef.value?.send(JSON.stringify(e));
  };
})();
