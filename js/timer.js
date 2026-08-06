class Timer {
  constructor(options) {
    this.duration = options.duration || 0;
    this.onTick = options.onTick || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.interval = null;
    this.remaining = 0;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.remaining = this.duration;
    this.onTick(this.remaining, this.duration);
    this.interval = setInterval(() => {
      this.remaining--;
      this.onTick(this.remaining, this.duration);
      if (this.remaining <= 0) {
        this.stop();
        this.onComplete();
      }
    }, 1000);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.isRunning = false;
  }

  pause() { this.stop(); }

  addSeconds(sec) {
    this.remaining = Math.max(0, this.remaining + sec);
    this.onTick(this.remaining, this.duration);
  }
}

class RestTimer extends Timer {
  constructor(seconds) {
    super({ duration: seconds });
  }

  start() {
    if (navigator.vibrate) navigator.vibrate([100]);
    super.start();
  }

  onComplete() {
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    super.onComplete();
  }
}
