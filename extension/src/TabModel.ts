import Tab = browser.tabs.Tab;
import { UpdateActiveEventData, VideoMetadata, VideoPlayMode, VideoPlayPosition } from './types';
import { cleanupTabName, isDeepEqual } from './utilities';

export class TabModel {
  get title(): string {
    return this.metadata?.title ?? cleanupTabName(this._tabTitle) ?? '';
  }

  get artist(): string | undefined {
    return !this.metadata?.artist || this.metadata.title.includes('-') // either no artist or the artist is in the title
      ? undefined
      : this.metadata.artist;
  }

  get isPlaying(): boolean {
    return this.playMode === 'playing' || (!this.playMode && this.audible);
  }

  /**
   * This is only the tabs title
   * @type {string}
   * @protected
   */
  protected _tabTitle: string = '';

  id: number = -1;
  windowId: number = -1;
  active: boolean = false;
  audible: boolean = false;

  playPosition?: VideoPlayPosition;
  metadata?: VideoMetadata;
  playMode?: VideoPlayMode = undefined;

  constructor(tab: Tab) {
    this.update(tab);
  }

  update(tab: Tab) {
    this._tabTitle = tab.title ?? '';
    this.id = tab.id ?? -1;
    this.windowId = tab.windowId ?? -1;
    this.active = tab.active;
    this.audible = !!tab.audible;
  }

  updatePlayState(state?: VideoPlayPosition): this {
    this.playPosition = state;

    return this;
  }

  updateMetadata(newMeta?: VideoMetadata): this {
    this.metadata = newMeta;

    return this;
  }

  /**
   *
   * @param {VideoPlayMode} mode This can't be `undefined`.
   *    `undefined` indicates there's no content-script.
   *    Once this is called there's at least once script matching.
   * @returns {this}
   */
  updateMode(mode: VideoPlayMode): this {
    this.playMode = mode;

    if (this.playMode !== 'playing') {
      // clear the position, the script has to re-send it
      this.playPosition = undefined;
    }

    return this;
  }

  setAudible(audible: boolean) {
    this.audible = audible;
  }

  setActive(active: boolean) {
    this.active = active;
  }

  isEqual(other?: TabModel) {
    return (
      this === other ||
      (!!other &&
        this.id === other.id &&
        this.title === other.title &&
        this.playMode === other.playMode &&
        this.playPosition === other.playPosition &&
        isDeepEqual(this.metadata, other.metadata))
    );
  }

  serialize(): UpdateActiveEventData {
    return {
      metadata: {
        title: this.title,
        artwork: this.metadata?.artwork,
        artist: this.artist,
      },
      position: this.playPosition,
    };
  }
}
