import Tab = browser.tabs.Tab;
import { UpdateEventFn } from './types';
import { cleanupTabName } from './utilities';

export class TabChangeHandler {
  currentAudible: Tab[] = [];
  currentlySent?: Tab;

  constructor(protected options: { onlyInactive: boolean } = { onlyInactive: true }, protected activeWindowId: number) {}

  public onUpdate?: UpdateEventFn;

  handleFocus(tabId: number, previous: number | undefined, tab: Tab) {
    this.currentAudible.forEach(x => x.id !== tabId && x.windowId === tab.windowId ? x.active = false : x.active = true);
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
    if(!el) return;

    el.title = title;
    this.findAndUpdateNext();
  }

  handleRemove(tabId: number) {
    this.currentAudible = this.currentAudible.filter(x => x.id !== tabId);
    this.findAndUpdateNext();
  }

  handleWindowFocus(windowId: number) {
    this.activeWindowId = windowId;
    this.findAndUpdateNext();
  }

  protected findAndUpdateNext() {
    let audible = this.currentAudible.filter(x => x.audible && this.options.onlyInactive ? (!x.active || x.windowId !== this.activeWindowId) : true);
    if (!audible.length && this.currentlySent) {
      this.emitInactive();
    } else if(audible.length === 1 && this.currentlySent?.title !== audible[0].title) {
      this.currentlySent = {...audible[0]};
      this.emitActive(audible[0].title);
    } else {
      audible = audible.filter(x => !x.active);
      if(!audible.length){
        return this.currentlySent && this.emitInactive(); // TODO: why?
      }
      // at least one element (one active tab, but before we had >1)
      if(this.currentlySent?.title !== audible[0].title) {
        this.currentlySent = {...audible[0]};
        this.emitActive(audible[0].title);
      }
    }
  }

  protected emitActive(title: string) {
    this.onUpdate({ type: "Active", data: { title: cleanupTabName(title) } });
  }

  protected emitInactive() {
    this.currentlySent = undefined;
    this.onUpdate({ type: 'Inactive', data: {} });
  }
}
