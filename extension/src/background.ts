import { TabChangeHandler } from './TabChangeHandler';
import { connectWithReconnect, fixChrome } from './utilities';
import { UpdateEventArg, UpdateEventMap, VideoPlayState } from './types';

fixChrome();

(async () => {
  console.log('background');
  const currentWindow = await browser.windows.getCurrent();
  const handler = new TabChangeHandler({onlyInactive: true}, currentWindow?.id ?? -1);
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (typeof changeInfo.audible === 'boolean') handler.handleAudible(tabId, changeInfo.audible, await browser.tabs.get(tabId));
    else if (typeof changeInfo.title === 'string') handler.handleTitle(tabId, changeInfo.title);
  });
  browser.tabs.onActivated.addListener(async activeInfo =>
    handler.handleFocus(activeInfo.tabId, activeInfo.previousTabId, await browser.tabs.get(activeInfo.tabId))
  );
  browser.tabs.onRemoved.addListener(tabId => handler.handleRemove(tabId));

  browser.windows.onFocusChanged.addListener(windowId => handler.handleWindowFocus(windowId));

  browser.runtime.onMessage.addListener((message: VideoPlayState, sender) => {
    handler.handlePlayState(sender.tab?.id ?? -1, {
      state: message,
      tabId: sender.tab?.id ?? -1,
    }, sender.tab!);
  });

  const wsRef = connectWithReconnect('ws://localhost:232');
  handler.onUpdate = (e: UpdateEventArg<keyof UpdateEventMap>) => {
    console.log(e);
    wsRef.value?.send(JSON.stringify(e));
  };

})();
