/* ДОСТУП К GOLDENFIT — как у «Кванта» (planner/web/js/core/access-controller.js; владелец 13.11.2026:
   «принцип как сделали в Кванте, точно так же»).

   Администратор «Кванта» ставит в карточке человека галочку «GoldenFit» и срок (сервер — access/apps.js).
   Срок приходит в /api/me?app=goldenfit (accessUntil); телефон хранит его (localStorage gf-access) и решает
   сам, без интернета: пусто — бессрочно, работает всегда; дата наступила — закрывается само, пока при
   следующей связи сервер не пришлёт новую; сервер ответил access_expired — закрыто сразу. Сеть и падение
   сервера закрытием не считаются. История тренировок при закрытии НЕ стирается.

   Закрыто и человек вошёл — поверх всего экран «Доступ закрыт» с кнопками «Проверить» и «Выйти». */

const GF_ACCESS_KEY = 'gf-access';
const GF_ACCESS_UNLIMITED = 'unlimited';
const GF_ACCESS_CLOCK_MS = 12 * 60 * 60 * 1000;

const gfAccess = {
  _read() {
    try { return JSON.parse(localStorage.getItem(GF_ACCESS_KEY) || 'null') || {}; } catch (e) { return {}; }
  },
  _write(s) {
    try { localStorage.setItem(GF_ACCESS_KEY, JSON.stringify(s)); } catch (e) { /* приватный режим — переживём */ }
  },

  // Сервер прислал срок: запомнить и открыть. Пусто — бессрочно
  remember(accessUntil, now = Date.now()) {
    const ms = accessUntil ? Date.parse(accessUntil) : NaN;
    const was = this._read();
    this._write({ until: Number.isNaN(ms) ? GF_ACCESS_UNLIMITED : ms, closed: false, clock: Math.max(was.clock || 0, now) });
  },

  // Сервер ответил access_expired — закрыто, пока не продлят
  close() {
    this._write({ ...this._read(), closed: true });
  },

  isOpen(now = Date.now()) {
    const s = this._read();
    if (s.closed) return false;
    if (s.until === undefined || s.until === null || s.until === GF_ACCESS_UNLIMITED) return true;
    // Часы перевели назад больше чем на 12 часов — по дате не открываем (как «Квант»)
    if (s.clock && now < s.clock - GF_ACCESS_CLOCK_MS) return false;
    if (now > (s.clock || 0)) this._write({ ...s, clock: now });
    return now < s.until;
  },

  until() {
    const u = this._read().until;
    return typeof u === 'number' ? u : null;
  },

  forget() {
    try { localStorage.removeItem(GF_ACCESS_KEY); } catch (e) { /* то же */ }
  }
};

/* Экран «Доступ закрыт» поверх приложения. Рисуется, когда человек вошёл, а доступ закрыт; убирается сам,
   как только сервер пришлёт новый срок или человек выйдет. */
const gfAccessGate = {
  node: null,
  checkedAt: 0,

  update() {
    const closed = !!(gfAccount.session && !gfAccess.isOpen());
    if (!closed) {
      if (this.node) { this.node.remove(); this.node = null; }
      return;
    }
    if (this.node) return;
    const t = gfText();
    const until = gfAccess.until();
    const box = document.createElement('div');
    box.className = 'gf-access-closed';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.innerHTML = `
      <div class="gf-access-closed__card">
        <div class="gf-access-closed__lock" aria-hidden="true">🔒</div>
        <h2></h2>
        <p class="gf-access-closed__until"></p>
        <p class="gf-access-closed__text"></p>
        <button type="button" class="gf-access-closed__check"></button>
        <button type="button" class="gf-access-closed__out"></button>
      </div>`;
    box.querySelector('h2').textContent = t.closedTitle;
    box.querySelector('.gf-access-closed__until').textContent = until ? t.closedUntil(new Date(until).toLocaleDateString()) : '';
    box.querySelector('.gf-access-closed__text').textContent = t.closedText;
    const check = box.querySelector('.gf-access-closed__check');
    check.textContent = t.check;
    check.addEventListener('click', async () => {
      check.disabled = true;
      await gfAccount.refreshProfile();
      check.disabled = false;
      this.update();
      if (this.node) alert(t.stillClosed);
    });
    const out = box.querySelector('.gf-access-closed__out');
    out.textContent = t.logout;
    out.addEventListener('click', () => gfAccount.logout());
    document.body.appendChild(box);
    this.node = box;
  },

  // Сверка срока с сервером при открытии и при возвращении в приложение — не чаще раза в 10 минут
  check() {
    if (!gfAccount.session || Date.now() - this.checkedAt < 10 * 60 * 1000) return;
    this.checkedAt = Date.now();
    gfAccount.refreshProfile().then(() => this.update());
  },

  start() {
    gfAccount.onChange(() => this.update());
    this.update();
    this.check();
    // Дата наступила, пока приложение открыто, — закрыться без сервера
    setInterval(() => this.update(), 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      this.update();
      this.check();
    });
  }
};
