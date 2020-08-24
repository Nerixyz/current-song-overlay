import { VideoPlayState } from '../types';

let source: Window;
let origin: string;
addEventListener('message', e => {
  if(e.origin.includes('plug.dj') && e.source instanceof Window) {
    source = e.source;
    origin = e.origin;
  }
  if(!e.origin.includes('youtube.com')) {
    return;
  }

  const data = JSON.parse(e.data);
  if(
    data.event !== 'infoDelivery' ||
    typeof data.info?.currentTime !== 'number' ||
    typeof data.info?.duration !== 'number' ||
    typeof data.info?.currentTimeLastUpdated_ !== 'number' ||
    typeof data.info?.playbackRate !== 'number' ||
    typeof data.info?.playerState !== 'number'
  ) return;
  const info = data.info;

  const state: VideoPlayState = {
    mode: info.playerState === 1 ? 'playing' : 'paused',
    currentPos: info.currentTime,
    sentTs: info.currentTimeLastUpdated_ * 1000,
    speed: info.playbackRate,
    duration: info.duration
  };

  source.postMessage(`cso:plugdj:yt:${JSON.stringify(state)}`, origin)
}, true);
