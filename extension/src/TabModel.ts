import Tab = browser.tabs.Tab;
import { UpdateActiveEventData,  VideoMetadata, VideoPlayState } from './types';
import { cleanupTabName, isDeepEqual } from './utilities';

export class TabModel {
  get title() {
    return cleanupTabName(this._overriddenTitle) ?? this.metadata?.metadata?.title ?? cleanupTabName(this._title) ?? '';
  }

  protected _title: string = '';
  protected _overriddenTitle?: string;
  id: number = -1;
  windowId: number = -1;
  playState?: VideoPlayState;
  metadata?: VideoMetadata;
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
    if (title === null) this._overriddenTitle = undefined;
    else this._overriddenTitle = title;
  }

  updateMetadata(newMeta?: VideoMetadata) {
    this.metadata = newMeta;
  }

  isEqual(other?: TabModel) {
    return (
      this === other ||
      (!!other &&
        this.id === other.id &&
        this.title === other.title &&
        this.playState === other.playState && isDeepEqual(this.metadata, other.metadata))
    );
  }

  forceAudible(audible: boolean) {
    this.audible = audible;
  }

  forceActive(active: boolean) {
    this.active = active;
  }

  serialize(): UpdateActiveEventData {
    return {
      current: {
        title: this.title,
        artwork: this.metadata?.metadata?.artwork,
        artist: this._overriddenTitle || !this.metadata?.metadata?.artist || this.metadata.metadata.title.includes('-') ? undefined : this.metadata.metadata?.artist,
      },
      state: this.playState,
    };
  }
}


