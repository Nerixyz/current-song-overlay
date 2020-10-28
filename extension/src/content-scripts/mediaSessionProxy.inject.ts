import { VideoPlayState } from '../types';

(async () => {
  if (!navigator.mediaSession) return;

  const proto: MediaSession = navigator.mediaSession.constructor.prototype;

  let
    positionState: Omit<VideoPlayState, 'mode'> | undefined,
    playbackState: MediaSessionPlaybackState | undefined,
    metadata: MediaMetadata | undefined | null;

  const onUpdate = () => {
    window.postMessage(`cso:metadata:${JSON.stringify({
      mode: playbackState,
      positionState,
      metadata: metadata ? {
        title: metadata.title,
        artist: metadata.artist,
        artwork: metadata.artwork?.[0]?.src
      } : undefined,
    })}`, window.origin);
  };

  interceptFunction(proto, 'setPositionState', (state?: MediaPositionState) => {
    positionState = state ? toPlayState(state) : undefined;
    onUpdate();
  });

  interceptSet(proto, 'playbackState', (state: MediaSession['playbackState']) => {
    playbackState = state;
    onUpdate();
  });

  interceptSet(proto, 'metadata', (meta: MediaSession['metadata']) => {
    metadata = meta;
    onUpdate();
  })
})();

function toPlayState(pos: MediaPositionState): Omit<VideoPlayState, 'mode'> {
  return {
    currentPos: pos.position ?? 0,
    sentTs: Date.now(),
    speed: pos.playbackRate ?? 1,
    duration: pos.duration ?? 0,
  }
}

function interceptSet<K extends string, V>(target: {[x in K]: any}, key: K, fn: (value: V) => void) {
  const desc = Object.getOwnPropertyDescriptor(target, key);
  if(!desc) {
    console.error('Could not get property descriptor', target, key);
    return;
  }
  Object.defineProperty(target, key, {
    ...desc,
    set(value: V) {
      fn(value);
      desc.set?.call(this, value);
    },
  });
}

function interceptFunction<K extends string, V extends (...args: any[]) => any>(target: {[x in K]?: V}, key: K, fn: (...args: Parameters<V>) => void) {
  const base = target[key];
  if(!base) {
    return;
  }
  target[key] = function(...args: Parameters<V>): ReturnType<V> {
    // @ts-ignore -- this is any, that's fine
    const that = this;
    fn.apply(that, args);
    return base.apply(that, args);
  } as V;
}
