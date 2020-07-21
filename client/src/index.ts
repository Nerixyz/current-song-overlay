import { connectWithReconnect } from './utilities';

document.addEventListener('DOMContentLoaded', () => {
  const obj = connectWithReconnect('ws://localhost:231', makeOnWsMessage());
});

function makeOnWsMessage() {
    const titleElement = document.getElementById('song-title');
    const artistElement = document.getElementById('song-artist');
    const albumArtElement = document.getElementById('song-cover') as HTMLImageElement;
    const wrapper = document.getElementById('current-song');
    return function onWsMessage(message: MessageEvent) {
        if (typeof message.data !== 'string') {
            console.error('no string');
            return;
        }
        const event: WsMessage<keyof WsMessageMap> = JSON.parse(message.data);

        switch (event.type) {
            case 'StateChanged': {
                if(event.data.state === 'playing') {
                    titleElement.textContent = event.data.current.name;
                    artistElement.textContent = event.data.current.artists?.join(', ');
                    albumArtElement.src = event.data.current.albumImageUrl;
                    setConditionalClass(albumArtElement, !event.data.current.albumImageUrl, 'display-none');
                    updateClasses(wrapper, ['shown'], ['hidden']);
                } else  {
                    updateClasses(wrapper, ['hidden'], ['shown']);
                }
                break;
            }
            default: {
                console.error('unhandled event', event);
            }
        }
    }
}

type WsMessage<T extends keyof WsMessageMap> = {
    type: T;
    data: WsMessageMap[T];
}

interface WsMessageMap {
    StateChanged: StateChangedEvent;
}

export interface StateChangedEvent {
    current?: NormalizedTrack;
    previous?: NormalizedTrack;
    next?: NormalizedTrack;
    state: 'playing' | 'paused' | 'unknown';
}

export interface NormalizedTrack {
    name: string;
    artists: string[];
    albumImageUrl: string;
    albumName: string;
}

function updateClasses(el: HTMLElement, add: string[], remove: string[]) {
    el.classList.add(...add);
    el.classList.remove(...remove);
}

function setConditionalClass(el: HTMLElement, condition: boolean, ...classes: string[]) {
    if(condition) {
        el.classList.add(...classes);
    } else {
        el.classList.remove(...classes);
    }
}
