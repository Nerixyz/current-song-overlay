export function connectWithReconnect(url: string, onMessageFn: (e:MessageEvent) => void): {value?: WebSocket} {
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
      });
      obj.value.addEventListener('message', onMessageFn);
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
