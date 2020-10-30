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

export function getCSSVariable(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}

export function createElement(type: string, options: {id?: string, classes?: string[]}) {
  const el = document.createElement(type);
  if(options.id) el.id = options.id;
  if(options.classes) el.setAttribute('class', options.classes.join(' '));

  return el;
}

export function polyfillGetAnimations() {
  if(!Element.prototype.getAnimations) {
    const baseFn = Element.prototype.animate;
    const Animations = Symbol('animations');
    Element.prototype.animate = function(...args) {
      const ret = baseFn.apply(this, args);
      // @ts-ignore -- indexing is allowed
      const animations: Set<Animation> = (this[Animations] ??= new Set());
      animations.add(ret);
      ret.addEventListener('cancel', () => animations.delete(ret));

      return ret;
    };
    Element.prototype.getAnimations = function() {
      // @ts-ignore
      const animations: Set<Animation> | undefined = this[Animations];

      return animations ? Array.from(animations) : [];
    }
  }
}

