import { VideoPlayState } from '../types';
import { tryGetElementByClass } from '../utilities';
import { sendRuntimeMessage } from '../extension-api';

let playState: VideoPlayState | undefined;
const resetProgress = () => (playState = undefined);
const sendPlayState = () =>
  sendRuntimeMessage('PlayState', playState ?? { mode: 'paused', speed: 0, sentTs: 0, currentPos: 0, duration: 1 });

tryGetElementByClass('community__song-playing', (el: HTMLParagraphElement) => {
  initPlayStateEventListener();
  const update = () => sendRuntimeMessage('Title', el.title || null);
  update().catch(console.error);
  const observer = new MutationObserver(() => update().catch(console.error));
  observer.observe(el, {
    attributes: true,
  });
}).catch(console.error);

async function tryUpdatePlayState() {
  const iframe = Array.from(document.getElementsByTagName('iframe')).find(x => x.id === 'sc-frame');
  if (!iframe) {
    resetProgress();
    return;
  }
  while (!iframe.contentWindow) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  iframe.contentWindow.postMessage(
    JSON.stringify({
      method: 'getDuration',
    }),
    '*'
  );
  const data = (await Promise.race([
    new Promise(resolve => {
      const listener = (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        if (data.method === 'getDuration') {
          window.removeEventListener('message', listener);
          resolve(data);
        }
      };
      window.addEventListener('message', listener, false);
    }),
    new Promise(resolve => setTimeout(resolve, 100)),
  ])) as { value: number } | undefined;
  if (!data) {
    resetProgress();
  } else if (!playState)
    playState = {
      mode: 'paused',
      currentPos: 0,
      duration: data.value / 1000,
      sentTs: Date.now(),
      speed: 1,
    };
  else playState.duration = data.value / 1000;
  await sendPlayState();
}

function initPlayStateEventListener() {
  window.addEventListener(
    'message',
    e => {
      if (!(e.source instanceof Window)) return;
      if (e.origin.includes('soundcloud')) {
        const data: SoundCloudEvent = JSON.parse(e.data);
        if (typeof data.value === 'object' && (data.method === 'play' || data.method === 'seek')) {
          playState = {
            sentTs: Date.now(),
            duration: makeDuration(data.value.currentPosition, data.value.relativePosition) / 1000,
            speed: 1,
            currentPos: data.value.currentPosition / 1000,
            mode: 'playing',
          };
          sendPlayState().catch(console.error);
          tryUpdatePlayState().catch(console.error); // get duration
        } else if (data.method === 'isPaused' && data.value) {
          resetProgress();
          sendPlayState().catch(console.error);
        }
      } else if (e.origin.includes('yt.bug.dj')) {
        const content = e.data;
        if (typeof content !== 'string' || !content.startsWith('cso:plugdj:yt:')) return;

        playState = JSON.parse(content.substring('cso:plugdj:yt:'.length));
        sendPlayState().catch(console.error);
      }
    },
    false
  );
}

interface SoundCloudEvent {
  widgetId: string;
  method: string;
  value:
    | boolean
    | number
    | {
        currentPosition: number;
        relativePosition: number;
      };
}

function makeDuration(current: number, relative: number): number {
  if (current === 0) return 1; // default
  const value = current / relative;
  if (value % 1 === 0) return value;
  if (((current + 1) / relative) % 1 === 0) return (current + 1) / relative;
  return value;
}
