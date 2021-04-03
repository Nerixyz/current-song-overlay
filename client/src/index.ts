import { connectWithReconnect, getCSSVariable, polyfillGetAnimations } from './utilities';
import { ProgressBarAnimation } from './progress-bar-animation';
import { SmolDom } from './SmolDom';
import {
  MySmolDom,
  PlayingEvent,
  PlayPosition,
  WsMessage,
  WsMessageMap
} from './types';
import { useMarquee } from './SmolMarquee';

polyfillGetAnimations();
const songInfoMaxWidth = getCSSVariable('song-info-max-width').replace(/[^\d]/g, '');
const titleEl = document.getElementById('song-title');
if(!titleEl) throw new Error('No title el saj');
const artistEl = document.getElementById('song-artist');
if(!artistEl) throw new Error('No artist el saj');
useMarquee(titleEl, Number(songInfoMaxWidth), 20);
useMarquee(artistEl, Number(songInfoMaxWidth), 20);

connectWithReconnect('ws://localhost:231', makeOnWsMessage());

function makeOnWsMessage() {
  const dom = new SmolDom<MySmolDom>({
    title: 'song-title',
    artist: 'song-artist',
    albumArt: 'song-cover',
    wrapper: 'current-song',
    progressBar: 'progress-bar',
  }).lookup();
  const progressAnimation = new ProgressBarAnimation(dom.getElement('progressBar'));
  addImageAnimation(dom.getElement('albumArt'));
  return function onWsMessage(message: MessageEvent) {
    if (typeof message.data !== 'string') {
      console.error('no string');
      return;
    }
    const event: WsMessage<keyof WsMessageMap> = JSON.parse(message.data);

    switch (event.type) {
      case 'StateChanged': {
        const data = event.data;
        if(data === 'paused') {
          onPause(dom);
        } else {
          onPlaying(data, dom);
        }

        if (data !== 'paused' && data.playPosition) {
          handlePositionChanged(data.playPosition, dom, progressAnimation);
        } else {
          dom.addClass('display-none', 'progressBar');
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

function onPause(dom: SmolDom<MySmolDom>) {
  dom.removeClass('shown', 'wrapper').addClass('hidden', 'wrapper');
}

function onPlaying(event: PlayingEvent, dom: SmolDom<MySmolDom>) {
  dom
    .text({
      title: event.track.title ?? null,
      artist: event.track.artists?.join(', ') ?? null,
    })
    .prop<HTMLImageElement>('src', {
      albumArt: event.track.cover ?? '',
    })
    .conditionalClass('display-none', !event.track.cover, 'albumArt')
    .addClass('shown', 'wrapper')
    .removeClass('hidden', 'wrapper').getElement('wrapper').style.height = event.track.cover ? '4.4em' : '';
}

function handlePositionChanged(event: PlayPosition, dom: SmolDom<MySmolDom>, progressAnimation: ProgressBarAnimation) {
  if (event.rate === 0) {
    progressAnimation.stop();
    return;
  }
  dom.removeClass('display-none', 'progressBar');
  progressAnimation.start({
    maxSec: event.duration,
    startSec: event.position,
    speed: event.rate ?? 1,
    startTs: event.startTs,
  });
}

function addImageAnimation(image: HTMLImageElement) {
  let animation: Animation | undefined;
  image.addEventListener('load', () => {
    animation = image.animate({
      opacity: ['0', '1'],
      transform: ['scale(0.8) translateX(-30%)', 'scale(1) translateX(0)'],
    }, {
      duration: 300,
      easing: 'cubic-bezier(0.05, 0.95, 0.735, 1)'
    });
  });
  image.addEventListener('loadstart', () => {
    if(image.getAnimations) {
      image.getAnimations().forEach(a => a.cancel())
    } else {
      animation?.cancel();
      animation = undefined;
    }
  });
}
