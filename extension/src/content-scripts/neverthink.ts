import { InternalMessageMap, VideoPlayPosition } from '../types';
import { ContentEventHandler } from 'beaverjs';

const events = new ContentEventHandler<InternalMessageMap>();

window.addEventListener('message', async msg => {
  if (!msg.origin.endsWith('youtube.com')) return;

  const { event, info }: { event: string; info: YTInfoDelivery } = JSON.parse(msg.data);
  if (event !== 'infoDelivery' || !info.videoData || !info.videoData.title || !info.videoData.author) return;

  const playPosition: VideoPlayPosition = {
    position: info.currentTime,
    timestamp: info.currentTimeLastUpdated_ * 1000,
    rate: info.playbackRate,
    duration: info.duration,
  };
  events.emitBackground('PlayPosition', playPosition);
  events.emitBackground('PlayMode', info.playerState === 1 ? 'playing' : 'paused');
  events.emitBackground('Metadata', { title: info.videoData.title, artist: info.videoData.author });
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
