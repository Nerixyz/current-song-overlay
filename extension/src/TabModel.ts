import Tab = browser.tabs.Tab;
import { VideoPlayState } from './types';

export class TabModel {

  get title() {
    return this._overriddenTitle ?? this._title;
  }

  protected _title: string = '';
  protected _overriddenTitle?: string;
  id: number = -1;
  windowId: number = -1;
  playState?: VideoPlayState;
  active: boolean = false;
  audible: boolean = false;


  constructor(tab: Tab) {
    this.update(tab);
  }

  update(tab: Tab) {
    this._title = tab.title ?? '';
    this.id = tab.id ?? -1;
    this.windowId = tab.windowId ?? -1;
    this.active = tab.active;
    this.audible = !!tab.audible;
  }

  updatePlayState(state?: VideoPlayState) {
    this.playState = state;
  }

  overrideTitle(title: string | null) {
    if(title === null) this._overriddenTitle = undefined;
    else this._overriddenTitle = title;
  }

  isEqual(other?: TabModel) {
    return this === other || (
      !!other &&
      this.id === other.id &&
      this.title === other.title &&
      this.playState === other.playState
    );
  }

  forceAudible(audible: boolean) {
    this.audible = audible;
  }

  forceActive(active: boolean) {
    this.active = active;
  }

}
