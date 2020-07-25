import { connectWithReconnect } from './utilities';
import { ProgressBarAnimation } from './progress-bar-animation';

document.addEventListener('DOMContentLoaded', () => {
  const obj = connectWithReconnect('ws://localhost:231', makeOnWsMessage());
});

function makeOnWsMessage() {
  const [titleElement, artistElement, albumArtElement, wrapper, progressBar] = getElementsById<{ 2: HTMLImageElement }>(
    ['song-title', 'song-artist', 'song-cover', 'current-song', 'progress-bar']
  );
  const progressAnimation = new ProgressBarAnimation();
  return function onWsMessage(message: MessageEvent) {
    if (typeof message.data !== 'string') {
      console.error('no string');
      return;
    }
    const event: WsMessage<keyof WsMessageMap> = JSON.parse(message.data);

    switch (event.type) {
      case 'StateChanged': {
        const data = event.data as StateChangedEvent;
        if (data.state === 'playing') {
          titleElement.textContent = data.current.name;
          artistElement.textContent = data.current.artists?.join(', ');
          albumArtElement.src = data.current.albumImageUrl;
          setConditionalClass(albumArtElement, !data.current.albumImageUrl, 'display-none');
          updateClasses(wrapper, ['shown'], ['hidden']);
        } else {
          updateClasses(wrapper, ['hidden'], ['shown']);
        }
        if (data.position) {
          const position = data.position;
          if (position.playbackSpeed === 0) {
            progressAnimation.stop();
            break;
          }
          updateClasses(progressBar, [], ['display-none']);
          progressAnimation.start({
            maxSec: position.maxPositionSec,
            startSec: position.currentPositionSec,
            speed: position.playbackSpeed,
            startTs: position.startTs,
            fn: percent => setTransform(progressBar, `scaleX(${percent})`),
          });
        } else {
          updateClasses(progressBar, ['display-none']);
          progressAnimation.stop();
        }
        break;
      }
      default: {
        console.error('unhandled event', event);
      }
    }
  };
}

function getElementsById<T extends { [x: number]: HTMLElement }>(ids: string[]): HTMLElement[] & T {
  return ids.map(id => document.getElementById(id)) as HTMLElement[] & T;
}

type WsMessage<T extends keyof WsMessageMap> = {
  type: T;
  data: WsMessageMap[T];
};

interface WsMessageMap {
  StateChanged: StateChangedEvent;
}

export interface StateChangedEvent {
  current?: NormalizedTrack;
  previous?: NormalizedTrack;
  next?: NormalizedTrack;
  state: 'playing' | 'paused' | 'unknown';
  position?: PositionChangedEvent;
}

export interface PositionChangedEvent {
  playbackSpeed: number;
  currentPositionSec: number;
  maxPositionSec: number;
  startTs: number;
}

export interface NormalizedTrack {
  name: string;
  artists: string[];
  albumImageUrl: string;
  albumName: string;
}

function updateClasses(el: HTMLElement, add: string[] = [], remove: string[] = []) {
  el.classList.add(...add);
  el.classList.remove(...remove);
}

function setConditionalClass(el: HTMLElement, condition: boolean, ...classes: string[]) {
  if (condition) {
    el.classList.add(...classes);
  } else {
    el.classList.remove(...classes);
  }
}

function setTransform(el: HTMLElement, transform: string) {
  el.style.transform = transform;
}
