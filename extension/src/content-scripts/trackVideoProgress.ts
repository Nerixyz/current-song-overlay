import { sendRuntimeMessage } from '../utilities';
import { VideoPlayState } from '../types';

function changeHandler({target}: {target: unknown}) {
  if(!(target instanceof HTMLVideoElement)) return;
  sendCurrent(target).catch(console.error);
}

document.addEventListener('playing', changeHandler, true);
document.addEventListener('pause', changeHandler, true);
document.addEventListener('ratechange', changeHandler, true);
document.addEventListener('seeked', changeHandler, true);

function createState(target: HTMLVideoElement): VideoPlayState {
  return {
    speed: target.playbackRate,
    mode: target.paused ? 'paused' : 'playing',
    sentTs: Date.now(),
    duration: target.duration,
    currentPos: target.currentTime,
  };
}

async function sendCurrent(target: HTMLVideoElement) {
  let counter = 0;
  while(Number.isNaN(target.duration) && counter < 20) {
    await new Promise(resolve => setTimeout(resolve, 100));
    counter++;
  }
  if(Number.isNaN(target.duration)) {
    return console.error('doctorWtf', 'duration is NaN', target);
  }
  return sendRuntimeMessage('PlayState', createState(target));
}
