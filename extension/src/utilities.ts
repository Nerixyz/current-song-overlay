export function cleanupTabName(name: string) {
  return name.replace(/(^\([^ ]+\))|(- \w+$)/g, '').trim();
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
