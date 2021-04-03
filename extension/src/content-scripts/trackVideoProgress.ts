import { InternalMessageMap, VideoPlayPosition } from '../types';
import { ContentEventHandler } from 'beaverjs';

function changeHandler({ target }: { target: unknown }) {
  if (!(target instanceof HTMLVideoElement)) return;
  sendCurrent(target).catch(console.error);
}

const events = new ContentEventHandler<InternalMessageMap>();

document.addEventListener('playing', changeHandler, true);
document.addEventListener('pause', changeHandler, true);
document.addEventListener('ratechange', changeHandler, true);
document.addEventListener('seeked', changeHandler, true);

function createPosition(target: HTMLVideoElement): VideoPlayPosition {
  return {
    rate: target.playbackRate,
    timestamp: Date.now(),
    duration: target.duration,
    position: target.currentTime,
  };
}

async function sendCurrent(target: HTMLVideoElement) {
  let counter = 0;
  while (Number.isNaN(target.duration) && counter < 20) {
    await new Promise(resolve => setTimeout(resolve, 100));
    counter++;
  }
  if (Number.isNaN(target.duration)) {
    return console.error('doctorWtf', 'duration is NaN', target);
  }
  events.emitBackground('PlayPosition', createPosition(target));
  events.emitBackground('PlayMode', target.paused ? 'paused' : 'playing');
}
