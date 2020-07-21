import { TabChangeHandler } from './TabChangeHandler';
import { connectWithReconnect } from './utilities';
import { UpdateEventArg, UpdateEventMap } from './types';

console.log('background');
const handler = new TabChangeHandler();
browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if ('audible' in changeInfo) handler.handleAudible(tabId, changeInfo.audible, await browser.tabs.get(tabId));
  else if ('title' in changeInfo) handler.handleTitle(tabId, changeInfo.title);
});
browser.tabs.onActivated.addListener(async activeInfo =>
  handler.handleFocus(activeInfo.tabId, activeInfo.previousTabId, await browser.tabs.get(activeInfo.tabId))
);
browser.tabs.onRemoved.addListener(tabId => handler.handleRemove(tabId));
const wsRef = connectWithReconnect('ws://localhost:232');
handler.onUpdate = (e: UpdateEventArg<keyof UpdateEventMap>) => wsRef.value?.send(JSON.stringify(e));
