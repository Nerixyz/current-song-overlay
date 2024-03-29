import { getFileUrl } from '../extension-api';
import { ContentEventHandler } from 'beaverjs';

const el = document.createElement('script');
el.src = getFileUrl('content-scripts/mediaSessionProxy.inject.js');
el.id = 'current-song-media-session-proxy';
document.documentElement.prepend(el);
el.addEventListener('load', () => el.remove());

// pass through
new ContentEventHandler();
