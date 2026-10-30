class Timer {
  constructor(options) {
    this.duration = options.duration || 0;
    this.onTick = options.onTick || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.interval = null;
    this.remaining = 0;
    this.endsAt = 0;
    this.isRunning = false;
  }

  /* Конец отдыха считаем по часам, а не по числу тиков. Когда экран
     погашен или приложение свёрнуто, телефон будит таймер редко, и
     счёт «минус секунда за тик» отставал на минуты. По часам остаток
     верный в любой момент, в том числе сразу после возврата. */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.remaining = this.duration;
    this.endsAt = Date.now() + this.duration * 1000;
    this.onTick(this.remaining, this.duration);
    this.interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
      if (left === this.remaining) return;
      this.remaining = left;
      this.onTick(this.remaining, this.duration);
      if (this.remaining <= 0) {
        this.stop();
        this._done();
      }
    }, 250);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.isRunning = false;
  }

  addSeconds(sec) {
    this.endsAt = Math.max(Date.now(), this.endsAt + sec * 1000);
    this.remaining = Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
    this.onTick(this.remaining, this.duration);
  }

  // Завершение идёт через свой метод: onComplete назначает снаружи
  // интерфейс, и переопределить его в наследнике нельзя
  _done() { this.onComplete(); }
}

class RestTimer extends Timer {
  constructor(seconds) {
    super({ duration: seconds });
  }

  start() {
    if (navigator.vibrate) navigator.vibrate([100]);
    super.start();
  }

  /* Вибрация в конце отдыха. Раньше она стояла в onComplete, но
     интерфейс назначает свой onComplete поверх — и телефон в конце
     отдыха не вздрагивал ни разу. */
  _done() {
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    super._done();
  }
}
