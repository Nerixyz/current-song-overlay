export function cleanupTabName(name: string) {
  return name.replace(/(^\([^ ]+\))|(- \w+$)/g, '').trim();
}

export function connectWithReconnect(url: string): {value?: WebSocket} {
  const obj: {value?: WebSocket} = {value: undefined};
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
      })
    }catch(e) {
      console.error(e);
      reset();
    }
  }
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
  if(!globalThis.browser) {
    // @ts-ignore -- fix for chrome
    globalThis.browser = chrome;
  }
  if(browser.tabs.get.length === 0) {
    const initialGet = browser.tabs.get;
    browser.tabs.get = tabId => new Promise(resolve => {
      // @ts-ignore -- chrome i guess
      initialGet(tabId, resolve);
    })
  }
}
