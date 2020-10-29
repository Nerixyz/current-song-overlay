import { VideoPlayState } from '../types';
import { sendRuntimeMessage } from '../extension-api';

window.addEventListener('message', async msg => {
  if (!msg.origin.endsWith('youtube.com')) return;

  const { event, info }: { event: string; info: YTInfoDelivery } = JSON.parse(msg.data);
  if (event !== 'infoDelivery' || !info.videoData || !info.videoData.title || !info.videoData.author) return;

  const state: VideoPlayState = {
    mode: info.playerState === 1 ? 'playing' : 'paused',
    currentPos: info.currentTime,
    sentTs: info.currentTimeLastUpdated_ * 1000,
    speed: info.playbackRate,
    duration: info.duration
  };
  await Promise.all([
    sendRuntimeMessage('PlayState', state),
    sendRuntimeMessage('Title', `${info.videoData.author} - ${info.videoData.title}`)
  ]);
});

interface YTInfoDelivery {
  playerState: number;
  currentTime: number;
  duration: number;
  videoData: {
    video_id: string;
    author: string;
    title: string;
    video_quality: string;
    video_quality_features: unknown[];
  };
  currentTimeLastUpdated_: number;
  playbackRate: number;
}
