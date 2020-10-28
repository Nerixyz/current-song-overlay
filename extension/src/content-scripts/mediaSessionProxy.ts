// language=JavaScript
import { sendRuntimeMessage } from '../utilities';

const el = document.createElement('script');
el.src = browser.runtime.getURL('content-scripts/mediaSessionProxy.inject.js');
el.id = 'current-song-media-session-proxy';
document.documentElement.prepend(el);

addEventListener('message', async ({data}) => {
    if(typeof data !== 'string' || !data.startsWith('cso:metadata:')) return;

    await sendRuntimeMessage('Metadata', data.substring('cso:metadata:'.length));
});
