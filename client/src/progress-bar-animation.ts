export class ProgressBarAnimation {

  protected isRunning = false;
  protected data?: ProgressBarData;

  stop() {
    this.isRunning = false;
  }

  start(data: ProgressBarData) {
    this.data = data;
    if (!this.isRunning) {
      this.isRunning = true;
      this.onFrame();
    }
  }

  protected onFrame() {
    if (!this.isRunning) {
      return;
    }

    if(this.data) {
      const delta = Date.now() - this.data.startTs;

      const timeSec = delta / 1000.0 * this.data.speed;
      const actualSongTime = this.data.startSec + timeSec;
      this.data.fn(Math.min(actualSongTime / this.data.maxSec, 1));
    }

    requestAnimationFrame(() => this.onFrame());
  }
}

export interface ProgressBarData {
  speed: number;
  maxSec: number;
  startSec: number;
  startTs: number;
  fn: (percent: number) => void;
}
