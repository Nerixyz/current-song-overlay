import { tryGetElementByClass } from '../utilities';
import { InternalMessageMap, VideoPlayPosition } from '../types';
import { ContentEventHandler } from 'beaverjs';

(async () => {
  const events = new ContentEventHandler<InternalMessageMap>();

  const progressEl = await tryGetElementByClass<HTMLElement>('playbackTimeline__progressHandle');
  const progressWrapperEl = await tryGetElementByClass('playbackTimeline__progressWrapper');
  const playEl = await tryGetElementByClass('playControl');

  let playPosition: VideoPlayPosition | undefined = undefined;
  const sendPlayState = () => {
    if (playPosition) {
      events.emitBackground('PlayPosition', playPosition);
      events.emitBackground('PlayMode', 'playing');
    } else {
      events.emitBackground('PlayMode', 'none');
    }
  };
  const updatePlayState = async () => {
    if (!playEl.classList.contains('playing')) {
      playPosition = undefined;
      return;
    }
    const duration = Number(progressWrapperEl.attributes.getNamedItem('aria-valuemax')?.value ?? 0);

    // don't use value with 'px'
    while (!progressEl.style.left?.endsWith('%')) await new Promise(resolve => setTimeout(resolve, 75));

    playPosition = {
      duration,
      rate: 1,
      timestamp: Date.now(),
      position: (Number(progressEl.style.left?.replace('%', '') ?? 0) / 100) * duration,
    };
  };
  const updateAndSendPlayState = async () => {
    await updatePlayState();
    await sendPlayState();
  };

  new MutationObserver(mutations => {
    if (!mutations.some(x => x.attributeName === 'class')) return;
    updateAndSendPlayState();
  }).observe(playEl, { attributes: true });

  let lastValueNow = 0;
  new MutationObserver(mutations => {
    if (!mutations.some(x => x.attributeName === 'aria-valuenow')) return;

    const newValue = Number(progressWrapperEl.attributes.getNamedItem('aria-valuenow')?.value ?? 0);
    if (newValue - 1 !== lastValueNow) updateAndSendPlayState();

    lastValueNow = newValue;
  }).observe(progressWrapperEl, { attributes: true });
})();
