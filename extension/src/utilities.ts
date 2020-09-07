import { InternalMessageMap } from './types';

export function cleanupTabName(name?: string) {
  return name?.replace(/(^\([^ ]+\))|(- \w+$)/g, '')?.trim();
}

export function connectWithReconnect(url: string): { value?: WebSocket } {
  const obj: { value?: WebSocket } = { value: undefined };
  let factor = 0;
  const updateFactor = () => factor = Math.min(factor + 5, 120);
  const resetFactor = () => factor = 0;
  const set = () => {
    try {
      console.log('connecting to', url);
      obj.value = new WebSocket(url);
      obj.value.addEventListener('close', () => {
        updateFactor();
        reset();
      });
      obj.value.addEventListener('open', () => {
        console.log('connected to', url);
        resetFactor();
      });
    } catch (e) {
      console.error(e);
      reset();
    }
  };
  const reset = () => {
    console.log(`reset in ${factor}s`);
    obj.value = undefined;
    setTimeout(() => {
      set();
    }, factor * 1000);
  };
  set();
  return obj;
}

export function fixChrome() {
  if (!globalThis.browser) {
    // @ts-ignore -- fix for chrome
    globalThis.browser = chrome;
  }
  tryPromisify(browser.tabs, 'get');
  tryPromisify(browser.windows, 'getCurrent');
  tryPromisify(browser.windows, 'getAll');
}

function tryPromisify<K extends string, T extends { [x in K]: (arg: any) => Promise<any> }>(obj: T, key: K) {
  if (obj[key].length === 0) {
    // assume this is chrome
    const base = obj[key];
    // @ts-ignore -- wrong types or something, this is fine
    obj[key] = arg1 => new Promise(resolve => base(arg1, resolve));
  }
}

export function cloneClass<T>(base: T): T {
  return Object.assign(Object.create(Object.getPrototypeOf(base)), base);
}

export function isDeepEqual<T>(a: T, b: T): boolean {
  if(typeof a !== 'object') return a === b;

  const aEntries = Object.entries(a);

  for(const [key, value] of aEntries) {
    if(!isDeepEqual(value,
      // @ts-expect-error -- these are the "same"
      b[key])
    ) return false;
  }
  return true;
}

export async function tryGetElementByClass<T extends Element>(name: string, fn?: (el: T) => void): Promise<T> {
  while (true) {
    const el = document.getElementsByClassName(name);
    if (!el || el.length === 0 || el[0] === null) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }
    fn?.(el[0] as T);
    return el[0] as T;
  }
}

export function sendRuntimeMessage<T extends keyof InternalMessageMap>(type: T, data: InternalMessageMap[T]) {
  return browser.runtime.sendMessage({
    type,
    data
  })
}
