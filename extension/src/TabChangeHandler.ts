import Tab = browser.tabs.Tab;
import { PlayStateContainer, UpdateEventFn, VideoPlayState } from './types';
import { cleanupTabName } from './utilities';

export class TabChangeHandler {
  currentAudible: Tab[] = [];
  currentlySent?: Tab;
  currentPlayState?: PlayStateContainer;
  playStates: Record<number, PlayStateContainer> = {};

  constructor(
    protected options: { onlyInactive: boolean } = { onlyInactive: true },
    protected activeWindowId: number
  ) {}

  public onUpdate?: UpdateEventFn;

  handleFocus(tabId: number, previous: number | undefined, tab: Tab) {
    this.currentAudible.forEach(x =>
      x.id !== tabId && x.windowId === tab.windowId ? (x.active = false) : (x.active = true)
    );
    if (tab.audible && !this.currentAudible.some(x => x.id === tabId)) {
      this.currentAudible.push(tab);
    } else if (!tab.audible) {
      this.currentAudible = this.currentAudible.filter(x => x.id !== tabId);
    }
    this.findAndUpdateNext();
  }

  handleAudible(tabId: number, audible: boolean, tab: Tab) {
    if (audible) {
      this.currentAudible.push(tab);
    } else if (!audible) {
      this.currentAudible = this.currentAudible.filter(x => x.id !== tabId);
    }

    if (audible && this.currentlySent?.id === tabId) return;
    this.findAndUpdateNext();
  }

  handleTitle(tabId: number, title: string) {
    const el = this.currentAudible.find(x => x.id === tabId);
    if (!el) return;

    el.title = title;
    this.findAndUpdateNext();
  }

  handleRemove(tabId: number) {
    this.currentAudible = this.currentAudible.filter(x => x.id !== tabId);
    delete this.playStates[tabId];
    this.findAndUpdateNext();
  }

  handleWindowFocus(windowId: number) {
    this.activeWindowId = windowId;
    this.findAndUpdateNext();
  }

  handlePlayState(tabId: number, state: PlayStateContainer, tab: Tab) {
    if(state.state.mode === 'playing') {
      this.playStates[tabId] = state;
    } else {
      delete this.playStates[tabId];
    }
    if(this.currentlySent?.id === tabId) {
      if(state.state.mode === 'playing') {
        this.updateCurrent(tab);
      } else {
        this.currentAudible = this.currentAudible.filter(x => x.id === tabId);
        this.updateCurrent();
      }
    } else if(!this.currentlySent && state.state.mode === 'playing' && !tab.active) {
      this.currentlySent = {...tab};
      this.updateCurrent(tab);
    }
  }

  protected findAndUpdateNext() {
    let audible = this.currentAudible.filter(x =>
      x.audible && this.options.onlyInactive ? !x.active || x.windowId !== this.activeWindowId : true
    );
    if(audible.length > 1) audible = audible.filter(x => !x.active);
    this.updateCurrent(audible[0]);
  }

  protected updateCurrent(tab?: Tab) {
    if(!tab) {
      if(this.currentPlayState || this.currentlySent) {
        this.currentPlayState = undefined;
        this.currentlySent = undefined;
        return this.emitInactive();
      }
      return;
    }
    if(
      !this.currentlySent ||
      this.currentlySent.id !== tab.id ||
      this.currentlySent.title !== tab.title ||
      this.currentPlayState !== this.playStates[tab.id ?? -1])
    {
      this.currentlySent = {...tab};
      this.currentPlayState = this.playStates[tab.id ?? -1];
      this.sendTab(tab);
    }
    // do nothing, both are equal
  }

  protected sendTab(tab: Tab) {
    return this.emitActive(tab.title ?? '', this.playStates[tab.id ?? -1]?.state);
  }

  protected emitActive(title: string, playbackState?: VideoPlayState) {
    this.onUpdate?.({ type: 'Active', data: { title: cleanupTabName(title), state: playbackState } });
  }

  protected emitInactive() {
    this.currentlySent = undefined;
    this.onUpdate?.({ type: 'Inactive', data: {} });
  }
}
