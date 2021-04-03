import Tab = browser.tabs.Tab;
import { UpdateEventFn, VideoMetadata, VideoPlayMode, VideoPlayPosition } from './types';
import { cloneClass } from './utilities';
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
  currentTab?: TabModel;
  currentAudible = new Map<number, TabModel>();
  windowStates = new Map<number, WindowState>();

  constructor(
    protected options: { onlyInactive: boolean } = { onlyInactive: true },
    protected activeWindowId: number,
    initialTabs: Tab[]
  ) {
    for (const tab of initialTabs) this.createTabModel(tab);
  }

  public onUpdate?: UpdateEventFn;

  protected getOrCreateTabModel(id: number, tab: Tab): TabModel {
    const found = this.currentAudible.get(id);
    if (found) return found;

    const model = new TabModel(tab);
    this.currentAudible.set(id, model);

    return model;
  }

  protected get(id: number): TabModel | undefined {
    return this.currentAudible.get(id);
  }

  protected forceGet(id: number): TabModel {
    const got = this.get(id);
    if (!got) {
      throw new Error(`No Tab with id ${id} known`);
    }
    return got;
  }

  protected createTabModel(tab: Tab): TabModel {
    const model = new TabModel(tab);
    this.currentAudible.set(tab.id ?? -1, model);

    return model;
  }

  onTabCreated(tab: Tab): void {
    this.createTabModel(tab);
  }

  onTabUpdated(updateInfo: Partial<Tab>, tab: Tab): void {
    this.forceGet(tab.id ?? -1).update(tab);

    if (typeof updateInfo.audible === 'boolean' && updateInfo.audible && this.currentTab?.id === tab.id) return;
    this.findAndUpdateNext();
  }

  onTabFocused(previous: number | undefined, focusedTab: Tab): void {
    if (previous) this.get(previous)?.setActive(false);

    this.get(focusedTab.id ?? -1)?.update(focusedTab);
    this.findAndUpdateNext();
  }

  onTabRemoved(tabId: number): void {
    this.currentAudible.delete(tabId);
    this.findAndUpdateNext();
  }

  async onWindowFocused(windowId: number): Promise<void> {
    await this.updateWindowStates();
    this.activeWindowId = windowId;
    this.findAndUpdateNext();
  }

  onWindowRemoved(windowId: number): void {
    this.windowStates.delete(windowId);
  }

  updatePlayPosition(tab: Tab, position: VideoPlayPosition): void {
    this.getOrCreateTabModel(tab.id ?? -1, tab).updatePlayState(position);
    this.findAndUpdateNext();
  }

  updatePlayMode(tab: Tab, mode: VideoPlayMode): void {
    const updatedTab = this.getOrCreateTabModel(tab.id ?? -1, tab).updateMode(mode);
    const tabId = tab.id;
    if (this.currentTab?.id === tabId) {
      this.updateCurrent(mode === 'playing' ? updatedTab : undefined);
    } else if (!this.currentTab && mode === 'playing' && this.isValidTab(updatedTab)) {
      this.updateCurrent(updatedTab);
    }
    // ignored:
    //  - `tab` isn't `currentlySent` => don't send
    //  - `tab` and `currentlySent` are paused
  }

  updateMetadata(tab: Tab, metadata?: VideoMetadata): void {
    this.getOrCreateTabModel(tab.id ?? -1, tab).updateMetadata(metadata);
    this.findAndUpdateNext();
  }

  protected async updateWindowStates() {
    for (const window of await getAllWindows()) {
      this.windowStates.set(window.id ?? -1, WindowState[window.state ?? 'normal']);
    }
  }

  protected isValidTab(tab: TabModel) {
    return (
      !this.options.onlyInactive ||
      ((!tab.active || tab.windowId !== this.activeWindowId) &&
        this.windowStates.get(tab.windowId) !== WindowState.fullscreen)
    );
  }

  protected findAndUpdateNext() {
    let audible = [...this.currentAudible.values()].filter(x => x.isPlaying && this.isValidTab(x));
    if (audible.length > 1) audible = audible.filter(x => !x.active);
    this.updateCurrent(audible[0]);
  }

  protected updateCurrent(tab?: TabModel) {
    if (!tab) {
      if (this.currentTab) {
        this.currentTab = undefined;
        return this.emitInactive();
      }
      return;
    }
    if (!tab.isEqual(this.currentTab)) {
      this.currentTab = cloneClass(tab);
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
    this.currentTab = undefined;
    this.onUpdate?.({ type: 'Inactive', data: {} });
  }
}
