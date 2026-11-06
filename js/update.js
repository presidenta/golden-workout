/* ОБНОВЛЕНИЕ GOLDENFIT (сборка 37).

   Владелец 07.11.2026: «не обновляется до 36-й», «кружочек в кабинете — зачем он, если не делает запрос на
   обновление». Приложение со значка на экране живёт неделями, не перезагружаясь: вернулся в него — та же
   страница, та же сборка. А кружок в карточке аккаунта только сохранял историю на сервер.

   Работающую сборку знает сама страница (метка ?v= у её скриптов), выложенную — sw.js на сайте
   (const VERSION). Сравниваем:
     при открытии и при каждом возвращении в приложение — новая есть и тренировка не идёт: перезагружаемся;
     кружком в карточке аккаунта — сразу, и говорим словами, что вышло.
   Посреди тренировки сами не перезагружаемся: обновится, когда человек вернётся после неё. */

const GF_UPDATE_TEXTS = {
  ru: {
    checking: 'Проверяю обновление…',
    latest: n => `Сборка ${n} — последняя`,
    updating: n => `Есть сборка ${n} — обновляю`,
    offline: 'Нет связи с сайтом — проверю, когда появится интернет'
  },
  ua: {
    checking: 'Перевіряю оновлення…',
    latest: n => `Збірка ${n} — остання`,
    updating: n => `Є збірка ${n} — оновлюю`,
    offline: 'Немає зв’язку з сайтом — перевірю, коли з’явиться інтернет'
  },
  en: {
    checking: 'Checking for updates…',
    latest: n => `Build ${n} is the latest`,
    updating: n => `Build ${n} is out — updating`,
    offline: 'No connection to the site — will check when online'
  }
};

const GFUpdate = {
  _busy: false,

  _t() {
    const lang = (typeof store !== 'undefined' && store.getState().lang) || 'ru';
    return GF_UPDATE_TEXTS[lang] || GF_UPDATE_TEXTS.ru;
  },

  // Сборка, на которой работает эта страница: метка у её же скрипта
  running() {
    const s = document.querySelector('script[src*="js/app.js?v="]');
    const m = s && /\?v=(\d+)/.exec(s.getAttribute('src'));
    return m ? Number(m[1]) : 0;
  },

  // Сборка на сайте. Мимо всех кэшей: sw.js пропускает просьбы no-store, не трогая их
  async published() {
    const res = await fetch(`sw.js?check=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const m = /const VERSION = '(\d+)'/.exec(await res.text());
    return m ? Number(m[1]) : 0;
  },

  // Идёт тренировка — полоса подходов на экране
  _training() {
    const bar = document.getElementById('sessionProgress');
    return !!bar && !bar.classList.contains('hidden');
  },

  /**
   * @param {{manual?: boolean}} [opts] manual — нажали кружок: обновить сразу и сказать, что вышло
   * @returns {Promise<'latest'|'updating'|'later'|'offline'>}
   */
  async check({ manual = false } = {}) {
    if (this._busy) return 'later';
    this._busy = true;
    const t = this._t();
    try {
      if (manual) this._say(t.checking);
      let latest;
      try {
        latest = await this.published();
      } catch (e) {
        if (manual) this._say(t.offline);
        return 'offline';
      }
      const mine = this.running();
      if (!(latest > mine)) {
        if (manual) this._say(t.latest(mine));
        return 'latest';
      }
      if (!manual && this._training()) return 'later';
      /* Сама — только один раз ради одной сборки. Во время выкладки сайт может отдать новый sw.js при
         прежней странице; без этого запрета приложение перезагружалось бы по кругу, пока сайт не догонит. */
      if (!manual && this._tried() === latest) return 'later';
      this._remember(latest);
      this._say(t.updating(latest));
      try {
        const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
      } catch (e) { /* новый работник встанет и сам — страница всё равно придёт с сайта */ }
      setTimeout(() => location.reload(), 600);
      return 'updating';
    } finally {
      this._busy = false;
    }
  },

  _tried() {
    try { return Number(sessionStorage.getItem('gf.updateTried')) || 0; } catch (e) { return 0; }
  },

  _remember(n) {
    try { sessionStorage.setItem('gf.updateTried', String(n)); } catch (e) { /* приватный режим */ }
  },

  _say(text) {
    let box = document.getElementById('gfUpdateToast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'gfUpdateToast';
      box.className = 'gf-update-toast';
      box.setAttribute('role', 'status');
      document.body.appendChild(box);
    }
    box.textContent = text;
    box.classList.remove('hidden');
    clearTimeout(this._sayTimer);
    this._sayTimer = setTimeout(() => box.classList.add('hidden'), 4000);
  },

  start() {
    this.check();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.check();
    });
  }
};
