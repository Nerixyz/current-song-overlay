// language=JavaScript
import { sendRuntimeMessage } from '../utilities';

const script = `
  (async () => {
    if (!('mediaSession' in navigator)) return;
    
    const proto = navigator.mediaSession.constructor.prototype;
    const baseSetPlaybackState = proto.setPositionState;
    const basePlaybackStateSetter = proto.__lookupSetter__('playbackState');
    const baseMetadataSetter = proto.__lookupSetter__('metadata');
    
    let positionState, playbackState, metadata;
    const onUpdate = () => {
      window.postMessage(\`cso:metadata:\${JSON.stringify({
      mode: playbackState,
        positionState,
        metadata: metadata ? {title: metadata.title, artist: metadata.artist, artwork: metadata.artwork?.[0]?.src} : undefined
      })}\`);
    };
    
    proto.setPositionState = function(...args) {
      const ret = baseSetPlaybackState.apply(this, args);
      positionState = args[0];
      onUpdate();
      return ret;
    };
    proto.__defineSetter__('playbackState', function(...args) {
      const ret = basePlaybackStateSetter.apply(this, args);
      playbackState = args[0];
      onUpdate();
      return ret;
    });
    proto.__defineSetter__('metadata', function(...args) {
      const ret = baseMetadataSetter.apply(this, args);
      metadata = args[0];
      onUpdate();
      return ret;
    });
  })();
`;

const el = document.createElement('script');
el.textContent = script;
el.id = 'current-song-media-session-proxy';
document.documentElement.prepend(el);

addEventListener('message', ({data}) => {
    if(typeof data !== 'string' || !data.startsWith('cso:metadata:')) return;

    sendRuntimeMessage('Metadata', data.substring('cso:metadata:'.length));
});
