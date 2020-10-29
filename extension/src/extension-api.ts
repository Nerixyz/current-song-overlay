import { InternalMessageMap } from './types';
import { tryPromisify } from './utilities';

(function fixChrome() {
  if (!globalThis.browser) {
    // @ts-ignore -- fix for chrome
    globalThis.browser = chrome;
  }
  tryPromisify(browser.tabs, 'get');
  tryPromisify(browser.windows, 'getCurrent');
  tryPromisify(browser.windows, 'getAll');
})();

export function getFileUrl(path: string) {
  return browser.runtime.getURL(path);
}

export function sendRuntimeMessage<T extends keyof InternalMessageMap>(type: T, data: InternalMessageMap[T]) {
  return browser.runtime.sendMessage({
    type,
    data
  });
}

export function getAllWindows() {
  return browser.windows.getAll();
}
