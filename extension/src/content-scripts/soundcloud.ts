import { tryGetElementByClass } from '../utilities';
import { VideoPlayState } from '../types';

(async () => {
  const progressEl = await tryGetElementByClass<HTMLElement>('playbackTimeline__progressHandle');
  const progressWrapperEl = await tryGetElementByClass('playbackTimeline__progressWrapper');
  const playEl = await tryGetElementByClass('playControl');

  const playState: VideoPlayState = {duration: 1, speed: 1,sentTs: 0, currentPos: 0, mode: 'paused'};
  const sendPlayState = () => browser.runtime.sendMessage({
    type: 'PlayState',
    data: playState
  });
  const updatePlayState =async  () => {
    playState.mode = playEl.classList.contains('playing') ? 'playing' : 'paused';
    const duration = Number(progressWrapperEl.attributes.getNamedItem('aria-valuemax')?.value ?? 0);
    playState.duration = duration;
    // don't use value with 'px'
    while (!progressEl.style.left?.endsWith('%')) await new Promise(resolve => setTimeout(resolve, 75));
    playState.currentPos = Number(progressEl.style.left?.replace('%', '') ?? 0) / 100 * duration;
    playState.sentTs = Date.now();
    playState.speed = 1;
  };
  const updateAndSendPlayState =async  () => {
    await updatePlayState();
    await sendPlayState();
  };

  new MutationObserver(mutations => {
    if(!mutations.some(x => x.attributeName === 'class')) return;
    updateAndSendPlayState();
  }).observe(playEl, {attributes: true});
  let lastValueNow = 0;
  new MutationObserver(mutations => {
    if(!mutations.some(x => x.attributeName === 'aria-valuenow')) return;
    const newValue = Number(progressWrapperEl.attributes.getNamedItem('aria-valuenow')?.value ?? 0);
    if(newValue - 1 !== lastValueNow) updateAndSendPlayState();
    lastValueNow = newValue;
  }).observe(progressWrapperEl, {attributes: true});
})();

