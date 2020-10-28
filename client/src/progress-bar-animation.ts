export class ProgressBarAnimation {
  protected data?: ProgressBarData;
  protected animation?: Animation;

  constructor(protected el: HTMLElement) {}

  stop() {
    this.stopAnimation();
  }

  start(data: ProgressBarData) {
    const last = this.getCurrentPercentage();
    this.data = data;

    this.stopAnimation();
    this.slide(last);
  }

  protected stopAnimation() {
    if(!this.animation)return;
    this.animation.cancel();
  }

  protected slide(last = 0) {
    this.animation = this.el.animate({
      transform: [`scaleX(${last})`,`scaleX(${this.getCurrentPercentage(0.15)})`],
    }, {
      duration: 150,
      easing: 'cubic-bezier(0, .775, 0, 1)',
    });
    this.animation.addEventListener('finish', () => this.onSlideFinished());
  }

  protected onSlideFinished() {
    this.animation = this.el.animate([{
      transform: `scaleX(${this.getCurrentPercentage()})`,
    }, {
      transform: `scaleX(1)`,
    }], {
      duration: this.getRemainingTimeSec() * 1000,
    });
    this.animation.addEventListener('finish', () => this.onProgressAnimationFinished());
  }

  protected onProgressAnimationFinished() {
    this.el.animate({
      opacity: ['1', '0']
    }, 2000);
  }

  protected getCurrentPercentage(offset = 0): number {
    if(!this.data) return 0;

    const delta = Date.now() - this.data.startTs;

    const timeSec = delta / 1000.0 * this.data.speed;
    const actualSongTime = this.data.startSec + timeSec + offset;

    return clamp(actualSongTime / this.data.maxSec, 0, 1);
  }

  protected getRemainingTimeSec(): number {
    if(!this.data) return 0;

    const delta = Date.now() - this.data.startTs;
    const timeSec = delta / 1000.0 * this.data.speed;
    const actualSongTime = this.data.startSec + timeSec;

    return clamp(this.data.maxSec - actualSongTime, 0, this.data.maxSec);
  }
}

export interface ProgressBarData {
  speed: number;
  maxSec: number;
  startSec: number;
  startTs: number;
}

function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}
