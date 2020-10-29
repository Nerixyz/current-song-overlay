import Tab = browser.tabs.Tab;
import { PlayStateContainer, UpdateEventFn, VideoMetadata, VideoPlayState } from './types';
import { cleanupTabName, cloneClass } from './utilities';
import { TabModel } from './TabModel';
import { getAllWindows } from './extension-api';

enum WindowState {
  normal,
  minimized,
  maximized,
  fullscreen,
  docked,
}

export class TabChangeHandler {
  currentlySent?: TabModel;
  currentAudible: Record<number, TabModel> = {};
  windowStates: Record<number, WindowState> = {};

  constructor(
    protected options: { onlyInactive: boolean } = { onlyInactive: true },
    protected activeWindowId: number,
    initialTabs: Tab[]
  ) {
    for (const tab of initialTabs) this.create(tab);
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

  async handleWindowFocus(windowId: number) {
    await this.updateWindowStates();
    this.activeWindowId = windowId;
    this.findAndUpdateNext();
  }

  handleWindowRemoved(windowId: number) {
    delete this.windowStates[windowId];
  }

  handlePlayState(tabId: number, state: PlayStateContainer, tab: Tab) {
    const updatedTab = this.getOrCreate(tabId, tab);
    updatedTab.updatePlayState(state.state?.mode === 'playing' ? state.state : undefined);
    if (this.currentlySent?.id === tabId) {
      if (state.state?.mode === 'playing') {
        this.updateCurrent(updatedTab);
      } else {
        this.updateCurrent();
      }
    } else if (
      !this.currentlySent &&
      state.state?.mode === 'playing' &&
      (this.isValidTab(updatedTab))
    ) {
      this.updateCurrent(updatedTab);
    }
  }

  handleOverriddenTitle(tabId: number, title: string | null) {
    this.get(tabId)?.overrideTitle(title);
    this.findAndUpdateNext();
  }

  handleMetadataUpdated(tabId: number, metadata?: VideoMetadata) {
    this.get(tabId)?.updateMetadata(metadata);
    this.findAndUpdateNext();
  }

  protected async updateWindowStates() {
    for (const window of await getAllWindows()) {
      this.windowStates[window.id ?? -1] = WindowState[window.state ?? 'normal'];
    }
  }

  protected isValidTab(tab: TabModel) {
    return !this.options.onlyInactive || (
      (!tab.active || tab.windowId !== this.activeWindowId) &&
      this.windowStates[tab.windowId] !== WindowState.fullscreen);
  }

  protected findAndUpdateNext() {
    let audible = Object.values(this.currentAudible).filter(x => x.audible && this.isValidTab(x));
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
    return this.emitActive(tab);
  }

  protected emitActive(tab: TabModel) {
    this.onUpdate?.({ type: 'Active', data: tab.serialize() });
  }

  protected emitInactive() {
    this.currentlySent = undefined;
    this.onUpdate?.({ type: 'Inactive', data: {} });
  }
}
