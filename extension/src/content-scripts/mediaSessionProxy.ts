import { getFileUrl, sendRuntimeMessage } from '../extension-api';

const el = document.createElement('script');
el.src = getFileUrl('content-scripts/mediaSessionProxy.inject.js');
el.id = 'current-song-media-session-proxy';
document.documentElement.prepend(el);

addEventListener('message', async ({data}) => {
    if(typeof data !== 'string' || !data.startsWith('cso:metadata:')) return;

    await sendRuntimeMessage('Metadata', data.substring('cso:metadata:'.length));
});
