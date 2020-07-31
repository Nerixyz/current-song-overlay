import Tab = browser.tabs.Tab;
import { PlayStateContainer, UpdateEventFn, VideoPlayState } from './types';
import { cleanupTabName, cloneClass } from './utilities';
import { TabModel } from './TabModel';

export class TabChangeHandler {
  currentlySent?: TabModel;
  currentAudible: Record<number, TabModel> = {};

  constructor(
    protected options: { onlyInactive: boolean } = { onlyInactive: true },
    protected activeWindowId: number,
    initialTabs: Tab[]
  ) {
    for(const tab of initialTabs) this.create(tab);
  }

  public onUpdate?: UpdateEventFn;

  protected getOrCreate(id: number, tab: Tab): TabModel {
    const found = this.currentAudible[id];
    if (found) return found;
    else {
      return (this.currentAudible[id] = new TabModel(tab));
    }
  }

  protected get(id: number): TabModel | undefined {
    return this.currentAudible[id];
  }

  protected forceGet(id: number): TabModel {
    const got = this.get(id);
    if (!got) {
      throw new Error(`No Tab with id ${id} known`);
    }
    return got;
  }

  protected create(tab: Tab) {
    this.currentAudible[tab.id ?? -1] = new TabModel(tab);
  }

  handleCreated(tab: Tab) {
    this.create(tab);
  }

  handleUpdated(updateInfo: Partial<Tab>, tab: Tab) {
    this.forceGet(tab.id ?? -1).update(tab);

    if (typeof updateInfo.audible === 'boolean' && updateInfo.audible && this.currentlySent?.id === tab.id) return;
    this.findAndUpdateNext();
  }

  handleFocus(tabId: number, previous: number | undefined, tab: Tab) {
    Object.values(this.currentAudible).forEach(x =>
      // only update the current window
      x.windowId === tab.windowId ? x.forceActive(x.id === tabId) : undefined
    );
    this.get(tabId)?.update(tab);
    this.findAndUpdateNext();
  }

  handleRemove(tabId: number) {
    delete this.currentAudible[tabId];
    this.findAndUpdateNext();
  }

  handleWindowFocus(windowId: number) {
    this.activeWindowId = windowId;
    this.findAndUpdateNext();
  }

  handlePlayState(tabId: number, state: PlayStateContainer, tab: Tab) {
    const updatedTab = this.getOrCreate(tabId, tab);
    updatedTab.updatePlayState(state.state.mode === 'playing' ? state.state : undefined);
    if (this.currentlySent?.id === tabId) {
      if (state.state.mode === 'playing') {
        this.updateCurrent(updatedTab);
      } else {
        this.updateCurrent();
      }
    } else if (!this.currentlySent && state.state.mode === 'playing' && !tab.active) {
      this.currentlySent = cloneClass(updatedTab);
      this.updateCurrent(this.currentlySent);
    }
  }

  handleOverriddenTitle(tabId: number, title: string) {
    this.get(tabId)?.overrideTitle(title);
    this.findAndUpdateNext();
  }

  protected findAndUpdateNext() {
    let audible = Object.values(this.currentAudible).filter(x =>
      x.audible && (this.options.onlyInactive ? !x.active || x.windowId !== this.activeWindowId : true)
    );
    if (audible.length > 1) audible = audible.filter(x => !x.active);
    this.updateCurrent(audible[0]);
  }

  protected updateCurrent(tab?: TabModel) {
    if (!tab) {
      if (this.currentlySent) {
        this.currentlySent = undefined;
        return this.emitInactive();
      }
      return;
    }
    if (!tab.isEqual(this.currentlySent)) {
      this.currentlySent = cloneClass(tab);
      this.sendTab(tab);
    }
    // do nothing, both are equal
  }

  protected sendTab(tab: TabModel) {
    return this.emitActive(tab.title, tab.playState);
  }

  protected emitActive(title: string, playbackState?: VideoPlayState) {
    this.onUpdate?.({ type: 'Active', data: { title: cleanupTabName(title), state: playbackState } });
  }

  protected emitInactive() {
    this.currentlySent = undefined;
    this.onUpdate?.({ type: 'Inactive', data: {} });
  }
}
