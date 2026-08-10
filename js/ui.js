class UI {
  constructor(i18n) {
    this.i18n = i18n;
    this.engine = null;
    this.speech = null;
    this.restTimer = null;
    this.repTimer = null;
    this.currentRep = 0;
    this.programs = { ...DEFAULT_PROGRAMS };
    this.currentLang = 'ru';
    this.t = null;
    this._boundHandlers = {};
  }

  async init(deps) {
    this.speech = deps.speech;
    this.engine = deps.engine;
    this.currentLang = store.getState().lang;
    this.t = this.i18n[this.currentLang];
    await this._loadPrograms();
    this._bindEvents();
    this._bindSystemBack();
    this._renderAll();
    store.subscribe((s) => this._onStateChange(s));
    this._checkReminders();
    setInterval(() => this._checkReminders(), 30000);
    if (this.speech) {
      this.speech.initRecognition();
      this.speech.onCommand = (cmd) => this._onVoiceCommand(cmd);
      this.speech.onStatus = (s) => this._showMicStatus(s);
      this.speech.onHeard = (text, ok) => this._showHeard(text, ok);
    }
  }

  async _loadPrograms() {
    try {
      const progs = await db.getAll('programs');
      progs.forEach(p => { if (p && p.id) this.programs[p.id] = p; });
    } catch (e) {
      console.warn('[UI] Failed to load custom programs:', e);
    }

    // Программы выбранной методики не хранятся в базе: генератор при
    // тех же ответах всегда соберёт ту же неделю. Достаточно помнить,
    // какая методика выбрана и на каком уровне.
    const st = store.getState();
    if (st.planMethod && typeof METHODS !== 'undefined' && METHODS[st.planMethod]) {
      const plan = buildWeekPlan(st.planMethod, st.level);
      if (plan) Object.assign(this.programs, plan.programs);
    }

    // Программа могла исчезнуть вместе со сменой плана — тогда
    // возвращаемся к базовой, иначе экран останется пустым.
    if (!this.programs[st.currentProgram]) {
      store.setState({ currentProgram: Object.keys(this.programs)[0] || 'fullbody' });
    }

    // Движок берёт программы из store, поэтому список нужно продублировать туда.
    store.setState({ programs: this.programs });
  }

  _onStateChange(s) {
    if (s.lang !== this.currentLang) {
      this.currentLang = s.lang;
      this.t = this.i18n[this.currentLang];
      this._renderAll();
    }
  }

  _bindEvents() {
    const on = (id, ev, fn) => {
      const el = document.getElementById(id);
      if (el) { el.addEventListener(ev, fn); this._boundHandlers[id + ev] = fn; }
    };

    // Tabs. Берём кнопку, а не то, по чему попали пальцем:
    // внутри лежат иконка и подпись, у них своего data-tab нет.
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        this._switchTab(btn.dataset.tab);
      });
    });

    // Volume
    document.querySelectorAll('.vol-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        store.setState({ volumeLevel: e.target.dataset.vol });
        document.querySelectorAll('.vol-btn').forEach(b => b.classList.toggle('active', b === e.target));
        this._renderPlanList();
      });
    });

    // Переключение языка прямо из шапки
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => this._setLang(btn.dataset.lang));
    });

    // Голос включается кнопкой прямо на экране упражнения
    on('btnMic', 'click', () => this._toggleMic());

    // Выбор программы
    on('btnOpenPrograms', 'click', () => this._openPrograms());
    on('btnClosePrograms', 'click', () => this._closePrograms());
    on('programSheet', 'click', (e) => {
      if (e.target.id === 'programSheet') this._closePrograms();
    });

    // Settings
    on('btnSettings', 'click', () => this._toggleSettings(true));
    on('btnSaveSettings', 'click', () => this._saveSettings());
    on('btnDismissReminder', 'click', () => document.getElementById('reminderBanner').classList.add('hidden'));

    // Workout
    on('btnStartNext', 'click', () => this._startNext());
    on('actionBtn', 'click', () => this._handleAction());
    on('btnExitWorkout', 'click', () => this._exitWorkout());

    // Rest
    on('btnSkipRest', 'click', () => this._skipRest());
    on('btnFinishSession', 'click', () => this._finishEarly());

    // Карточка упражнения
    on('btnPreviewStart', 'click', () => this._startFromPreview());
    on('btnPreviewClose', 'click', () => this._closePreview());
    on('previewModal', 'click', (e) => {
      // Клик по затемнению вокруг карточки — закрыть
      if (e.target.id === 'previewModal') this._closePreview();
    });
    on('btnRestMinus', 'click', () => { if (this.restTimer) this.restTimer.addSeconds(-10); });
    on('btnRestPlus', 'click', () => { if (this.restTimer) this.restTimer.addSeconds(10); });

    // Log
    on('btnSaveLog', 'click', () => this._saveLog());
    on('btnSkipLog', 'click', () => this._skipLog());
    on('logRpe', 'input', (e) => { document.getElementById('rpeValue').textContent = e.target.value; });

    // Возврат в предыдущий раздел
    on('btnBack', 'click', () => this._goBack());

    // Constructor
    on('btnSaveCustom', 'click', () => this._saveCustomProgram());
    on('btnOpenSettings2', 'click', () => this._toggleSettings(true));

    // Schedule
    on('btnSaveSchedule', 'click', () => this._saveSchedule());

    // План недели: два вопроса и карточки методик
    document.querySelectorAll('#planDaysRow .chip').forEach(chip => {
      chip.addEventListener('click', () => this._pickPlanDays(Number(chip.dataset.days)));
    });
    document.querySelectorAll('#planLevelRow .chip').forEach(chip => {
      chip.addEventListener('click', () => this._pickPlanLevel(chip.dataset.level));
    });
    on('btnApplyPlan', 'click', () => this._applyPlan());

    // Глаза
    on('btnStartEyes', 'click', () => this._startEyes());
    on('btnDailyEyes', 'click', () => this._startEyes());
    on('btnToggleEyesList', 'click', () => this._toggleEyesList());
    on('btnEyesExit', 'click', () => this._exitEyes());
    on('btnEyesExitBottom', 'click', () => this._exitEyes());
    on('btnEyesPrev', 'click', () => this._prevEyesStep());
    on('btnEyesNext', 'click', () => this._nextEyesStep());
    on('btnEyesToggle', 'click', () => this._toggleEyesPause());

    // Stats
    on('btnLogCardio', 'click', () => this._logCardio());
    on('btnExportCSV', 'click', () => this._exportCSV());
    on('btnCalPrev', 'click', () => this._calShift(-1));
    on('btnCalNext', 'click', () => this._calShift(1));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (document.getElementById('screenWorkout').classList.contains('hidden')) return;
      if (e.code === 'Space') { e.preventDefault(); this._handleAction(); }
      if (e.code === 'Escape') this._exitWorkout();
    });
  }

  /* ----- Возврат назад -----
     В установленном на телефон приложении нет ни адресной строки, ни
     кнопки браузера. Поэтому ведём свою историю разделов: её листает
     и стрелка в шапке, и системная кнопка «назад». */

  _canGoBack() {
    const open = ['eyesScreen', 'programSheet', 'previewModal', 'settingsModal', 'screenWorkout']
      .some(id => {
        const el = document.getElementById(id);
        return el && !el.classList.contains('hidden');
      });
    return open || (this._tabHistory && this._tabHistory.length > 0)
        || store.getState().currentTab !== 'workout';
  }

  _goBack() {
    // Сначала закрываем то, что открыто поверх раздела
    const close = [
      ['eyesScreen', () => this._exitEyes()],
      ['programSheet', () => this._closePrograms()],
      ['previewModal', () => this._closePreview()],
      ['settingsModal', () => this._toggleSettings(false)],
      ['screenWorkout', () => this._exitWorkout()]
    ];
    for (const [id, fn] of close) {
      const el = document.getElementById(id);
      if (el && !el.classList.contains('hidden')) { fn(); this._updateBackButton(); return; }
    }
    // Дальше — предыдущий раздел
    const prev = (this._tabHistory || []).pop();
    this._switchTab(prev || 'workout', true);
  }

  _updateBackButton() {
    const btn = document.getElementById('btnBack');
    if (!btn) return;
    btn.classList.toggle('hidden', !this._canGoBack());
  }

  _switchTab(tabId, viaBack) {
    const prev = store.getState().currentTab;
    if (!viaBack && prev && prev !== tabId) {
      this._tabHistory = this._tabHistory || [];
      this._tabHistory.push(prev);
      if (this._tabHistory.length > 20) this._tabHistory.shift();
    }
    store.setState({ currentTab: tabId });
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    ['workout', 'plan', 'health', 'stats', 'more'].forEach(t => {
      const el = document.getElementById('tabContent' + this._cap(t));
      if (el) el.classList.toggle('hidden', t !== tabId);
    });
    if (tabId === 'stats') this._renderStats();
    if (tabId === 'health') this._renderHealth();
    if (tabId === 'plan') this._renderPlanTab();
    if (tabId === 'workout') this._renderDailyEyes();
    this._updateBackButton();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  _cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* Системная кнопка «назад» на телефоне. Держим в истории браузера
     одну лишнюю запись: пока внутри приложения есть куда возвращаться,
     мы её восстанавливаем и закрываем текущий экран сами. Когда
     возвращаться некуда — запись не восстанавливается, и кнопка
     закрывает приложение, как и ожидается. */
  _bindSystemBack() {
    try {
      history.replaceState({ gw: 'root' }, '');
      history.pushState({ gw: 'screen' }, '');
      window.addEventListener('popstate', () => {
        if (this._canGoBack()) {
          history.pushState({ gw: 'screen' }, '');
          this._goBack();
        }
      });
    } catch (e) {
      // Открыто с диска — история может быть недоступна, не беда
      console.warn('[UI] системная кнопка «назад» недоступна:', e);
    }
  }

  // Смена языка кнопкой в шапке. Настройки и голос подхватывают её сразу,
  // страница перерисовывается целиком.
  _setLang(lang) {
    if (!lang || lang === this.currentLang) return;
    store.setState({ lang });
    const sel = document.getElementById('selectLang');
    if (sel) sel.value = lang;
    if (this.speech) {
      this.speech.lang = lang === 'ru' ? 'ru-RU' : lang === 'ua' ? 'uk-UA' : 'en-US';
    }
    db.get('settings', 'app').then(saved => {
      const s = { ...(saved || {}), lang };
      db.set('settings', 'app', s);
    }).catch(() => {});
    this._syncLangButtons();
  }

  _syncLangButtons() {
    document.querySelectorAll('.lang-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === this.currentLang);
    });
  }

  // У встроенных программ название на трёх языках, у созданных
  // в конструкторе — обычная строка, как её ввели.
  _progName(prog) {
    if (!prog || !prog.name) return '';
    return typeof prog.name === 'string'
      ? prog.name
      : (prog.name[this.currentLang] || prog.name.ru);
  }

  // Всё, что помечено в разметке data-i18n, переводится разом.
  // Так новую подпись достаточно пометить в html и добавить в i18n.
  _applyMarkupTexts() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const val = this.t[el.dataset.i18n];
      if (typeof val === 'string') el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const val = this.t[el.dataset.i18nPh];
      if (typeof val === 'string') el.placeholder = val;
    });
  }

  _renderAll() {
    this._syncLangButtons();
    this._applyMarkupTexts();
    document.getElementById('ui_subtitle').textContent = this.t.subtitle;
    // Меняем только подпись — иконку внутри кнопки трогать нельзя
    const tabLabel = (id, text) => {
      const el = document.getElementById(id);
      const lbl = el && el.querySelector('.nav-label');
      if (lbl) lbl.textContent = text;
    };
    tabLabel('tabBtnWorkout', this.t.tabs.workout);
    tabLabel('tabBtnPlan', this.t.tabs.plan);
    tabLabel('tabBtnHealth', this.t.tabs.health);
    tabLabel('tabBtnStats', this.t.tabs.stats);
    tabLabel('tabBtnMore', this.t.tabs.more);
    document.getElementById('ui_set_title').textContent = this.t.settings;
    document.getElementById('btnStartNext').textContent = this.t.start;
    document.getElementById('actionBtn').textContent = this.t.start;
    document.getElementById('btnExportCSV').textContent = this.t.exportCSV;
    document.getElementById('btnFinishSession').textContent = this.t.finishWorkout;

    // Настройки дыхания и счёта
    document.getElementById('ui_breath_label').textContent = this.t.breathLabel;
    document.getElementById('ui_count_label').textContent = this.t.countLabel;
    document.getElementById('ui_count_hint').textContent = this.t.countHint;
    const breathSel = document.getElementById('selectBreath');
    ['inhale', 'both', 'off'].forEach(mode => {
      const opt = breathSel.querySelector(`option[value="${mode}"]`);
      if (opt) opt.textContent = this.t.breathModes[mode];
    });

    document.querySelector('[data-vol="min"]').textContent = this.t.volume.min;
    document.querySelector('[data-vol="norm"]').textContent = this.t.volume.norm;
    document.querySelector('[data-vol="max"]').textContent = this.t.volume.max;
    this._renderPrograms();
    this._renderPlanList();
    this._renderConstructor();
    this._renderSchedule();
    this._renderTreadmill();
    this._renderPlanTab();
    this._renderHealth();
    this._renderDailyEyes();
    this._renderStats();
    this._updateBackButton();
  }

  /* ----- Беговая дорожка ----- */

  _renderTreadmill() {
    const tm = TREADMILL[this.currentLang] || TREADMILL.ru;
    const u = tm.ui;

    document.getElementById('tmModel').textContent = TREADMILL.model;
    document.getElementById('tmGoal').textContent = tm.goal;

    document.getElementById('tmSpecs').innerHTML = tm.specs
      .map(([k, v]) => `<div class="tm-spec-row"><span>${this._esc(k)}</span><span>${this._esc(v)}</span></div>`)
      .join('');

    document.getElementById('tmRule').textContent = tm.rule;

    document.getElementById('tmTitleWeeks').textContent = tm.titles.weeks;
    document.getElementById('tmTitleWalk').textContent = tm.titles.walk;
    document.getElementById('tmTitleTips').textContent = tm.titles.tips;

    document.getElementById('tmWeeks').innerHTML = TREADMILL.plan.map((p, i) => {
      const walk = p.walk > 0
        ? `<span class="tm-chip walk">${u.walk} ${p.walk} ${u.min} · ${p.walkSpeed}</span>`
        : `<span class="tm-chip">${u.nonstop}</span>`;
      const sets = p.sets > 1 ? `<span class="tm-chip">× ${p.sets} ${u.times}</span>` : '';
      return `
        <div class="tm-week${p.runTotal >= 30 ? ' reached' : ''}">
          <div class="tm-week-head">
            <span class="tm-week-no">${u.week} ${p.w}</span>
            <span class="tm-week-total">${u.totalMin} ${p.total} ${u.min} · ${u.runOf} ${p.runTotal}</span>
          </div>
          <div class="tm-week-body">
            <span class="tm-chip run">${u.run} ${p.run} ${u.min} · ${p.runSpeed}</span>
            ${walk}${sets}
          </div>
          <div class="tm-week-note">${this._esc(tm.notes[i] || '')}</div>
        </div>`;
    }).join('');

    document.getElementById('tmWalk').innerHTML = tm.walkDays
      .map(w => `<div class="tm-walk-item"><b>${this._esc(w.title)}</b><div>${this._esc(w.body)}</div></div>`)
      .join('');

    document.getElementById('tmTips').innerHTML = tm.tips
      .map(t => `<li>${this._esc(t)}</li>`).join('');
  }

  /* ----- Выбор программы -----
     На экране только текущая программа, весь список — в окне снизу.
     Программы можно добавлять сколько угодно: список прокручивается,
     а главный экран от этого не растёт. */

  /* Из чего состоит программа. Показываем группы мышц, а не названия
     упражнений: у доски все названия начинаются одинаково («Доска ·
     Синий», «Доска · Жёлтый»), и подпись превращалась в «Доска · Доска».
     Мышцы отвечают на настоящий вопрос — что сегодня будет работать. */
  _progMeta(prog) {
    if (!prog || !prog.exercises) return '';
    const dict = this.t.muscleNames || {};
    const groups = [];
    prog.exercises.forEach(k => {
      const ex = EXERCISE_DB[k];
      if (!ex) return;
      (ex.muscles || []).forEach(m => {
        if (dict[m] && !groups.includes(dict[m])) groups.push(dict[m]);
      });
    });
    const short = groups.slice(0, 4).join(' · ');
    return `${this.t.exCount(prog.exercises.length)} · ${short}${groups.length > 4 ? '…' : ''}`;
  }

  /* Программ стало много, поэтому в окне выбора они разложены по
     разделам: сначала то, что назначено планом на эту неделю, потом
     Голтис, доска, готовые наборы и свои. */
  _programGroups() {
    const keys = Object.keys(this.programs);
    const isAuto = k => k.startsWith('auto_');
    const isGoltis = k => k === 'goltis' || k.startsWith('auto_goltis_way');
    const isBoard = k => k.startsWith('push_board');
    const isCustom = k => k.startsWith('custom_');

    return [
      { title: this.t.groupPlan,   keys: keys.filter(k => isAuto(k) && !isGoltis(k)) },
      { title: this.t.groupGoltis, keys: keys.filter(isGoltis) },
      { title: this.t.groupBoard,  keys: keys.filter(isBoard) },
      { title: this.t.groupReady,  keys: keys.filter(k => !isAuto(k) && !isGoltis(k) && !isBoard(k) && !isCustom(k)) },
      { title: this.t.groupMine,   keys: keys.filter(isCustom) }
    ].filter(g => g.keys.length);
  }

  _renderPrograms() {
    const key = store.getState().currentProgram;
    const prog = this.programs[key];

    document.getElementById('currentProgName').textContent = this._progName(prog);
    document.getElementById('currentProgMeta').textContent = this._progMeta(prog);

    const list = document.getElementById('programList');
    list.innerHTML = '';

    /* Первым делом — глаза. Их ищут именно здесь, среди занятий:
       это такое же ежедневное дело, как тренировка, просто короче. */
    const dailyHead = document.createElement('div');
    dailyHead.className = 'prog-group-title';
    dailyHead.textContent = this.t.groupDaily;
    list.appendChild(dailyHead);

    const eyesRow = document.createElement('button');
    eyesRow.className = 'prog-row prog-row-daily';
    eyesRow.innerHTML = `
      <span class="prog-row-emoji">👁</span>
      <span class="prog-row-body">
        <span class="prog-row-name">${this._esc(this.t.eyesTitleShort)}</span>
        <span class="prog-row-meta">${this._esc(this.t.eyesMeta(EYE_EXERCISES.length, eyeSetMinutes()))}</span>
      </span>`;
    eyesRow.onclick = () => { this._closePrograms(); this._startEyes(); };
    list.appendChild(eyesRow);

    this._programGroups().forEach(group => {
      const head = document.createElement('div');
      head.className = 'prog-group-title';
      head.textContent = group.title;
      list.appendChild(head);

      group.keys.forEach(k => {
        const p = this.programs[k];
        const row = document.createElement('button');
        row.className = 'prog-row' + (k === key ? ' current' : '');
        row.innerHTML = `
          <span class="prog-row-dot"></span>
          <span class="prog-row-body">
            <span class="prog-row-name">${this._esc(this._progName(p))}</span>
            <span class="prog-row-meta">${this._esc(this._progMeta(p))}</span>
          </span>`;
        row.onclick = () => this._pickProgram(k);
        list.appendChild(row);
      });
    });

    // Свой комплекс собирается во вкладке «Ещё» — ведём туда отсюда,
    // чтобы конструктор не потерялся
    const add = document.createElement('button');
    add.className = 'prog-row prog-row-add';
    add.innerHTML = `<span class="prog-row-plus">＋</span>
      <span class="prog-row-body"><span class="prog-row-name">${this._esc(this.t.createOwn)}</span></span>`;
    add.onclick = () => { this._closePrograms(); this._switchTab('more'); };
    list.appendChild(add);
  }

  _pickProgram(key) {
    store.setState({ currentProgram: key });
    this._renderPrograms();
    this._renderPlanList();
    this._closePrograms();
  }

  _openPrograms() {
    this._renderPrograms();
    document.getElementById('programSheet').classList.remove('hidden');
  }

  _closePrograms() {
    document.getElementById('programSheet').classList.add('hidden');
  }

  _renderPlanList() {
    const box = document.getElementById('exerciseList');
    box.innerHTML = '';
    const prog = this.programs[store.getState().currentProgram];
    if (!prog) return;
    const effSets = this._getEffectiveSets();
    let done = 0;

    prog.exercises.forEach((key, idx) => {
      const ex = EXERCISE_DB[key];
      if (!ex) return;
      const loc = ex[this.currentLang] || ex.ru;
      const item = document.createElement('div');
      item.className = 'exercise-item';
      item.innerHTML = `
        <img class="exercise-thumb lazy" alt="" loading="lazy">
        <div class="exercise-info">
          <div class="exercise-name">${this._esc(loc.name)}</div>
          <div class="exercise-details">${effSets} ${this.t.setsShort} × ${ex.reps} ${this.t.reps} | ${this._esc(loc.desc)}</div>
        </div>
        <div class="exercise-status">⭕</div>
      `;
      // Сначала показываем карточку: что за упражнение и как его делать.
      // Начать можно оттуда.
      item.onclick = () => this._openPreview(idx);
      box.appendChild(item);
      // В списке показываем первый кадр упражнения
      const img = item.querySelector('img');
      this._loadImage(img, (ex.frames && ex.frames[0]) || '');
    });

    document.getElementById('sessionProgressLabel').textContent = `${this.t.streak.split(' ')[0]}: ${done}/${prog.exercises.length}`;
  }

  _loadImage(img, url) {
    if (!url) { img.style.display = 'none'; return; }
    const test = new Image();
    test.onload = () => { img.src = url; img.classList.remove('lazy'); };
    test.onerror = () => {
      img.style.display = 'none';
      const fb = document.createElement('div');
      fb.className = 'img-fallback';
      fb.textContent = this.t.fallbackImg;
      img.parentElement.appendChild(fb);
    };
    test.src = url;
  }

  _getEffectiveSets() {
    const s = store.getState();
    if (s.volumeLevel === 'min') return Math.max(1, s.globalSets - 1);
    if (s.volumeLevel === 'max') return s.globalSets + 2;
    return s.globalSets;
  }

  // index — номер упражнения в плане. В движке перед основными идёт
  // разминка, поэтому номер сдвигаем на её длину.
  _startExercise(index) {
    const state = store.getState();
    this.engine.start(state.currentProgram, true);
    const target = this.engine.warmupCount() + index;
    while (this.engine.currentExIndex < target && this.engine.phase !== 'complete') {
      this.engine.nextExercise();
    }
    this._showWorkoutScreen();
    this._refreshWorkoutUI();
  }

  // Тренировка целиком, с самого начала — то есть с разминки
  _startSession() {
    const state = store.getState();
    this.engine.start(state.currentProgram, true);
    this._showWorkoutScreen();
    this._refreshWorkoutUI();
  }

  // Большая кнопка внизу плана — полная тренировка от разминки
  _startNext() {
    this._startSession();
  }

  _showWorkoutScreen() {
    document.getElementById('screenPlan').classList.add('hidden');
    document.getElementById('screenWorkout').classList.remove('hidden');
    document.getElementById('restScreen').classList.add('hidden');
    // Кнопка голоса: если в прошлый раз он был включён — поднимаем сразу
    const mic = SpeechController.micAvailable();
    if (mic !== 'ok') {
      this._showMicStatus(mic);
    } else if (this.speech && store.getState().voiceControlEnabled) {
      this.speech.voiceCommandsEnabled = true;
      this.speech.startListening();
    } else {
      this._showMicStatus('idle');
    }
  }

  _refreshWorkoutUI() {
    const st = this.engine.getCurrentState();
    const ex = st.exercise;
    if (!ex) return;
    const loc = ex[this.currentLang] || ex.ru;
    const t = this.t;

    this._updateSessionProgress();

    document.getElementById('activeExTitle').textContent = loc.name;
    document.getElementById('activeSetBadge').textContent = t.setInfo(st.set, st.totalSets);
    this._setFrames(ex);
    document.getElementById('repDisplay').textContent = '0';
    document.getElementById('phaseDisplay').textContent = t.ready;
    document.getElementById('actionBtn').textContent = t.start;
    document.getElementById('breathOverlay').className = 'breath-overlay';
    document.getElementById('counterCircle').className = 'counter-circle';

    // Новый подход — счётчик повторов с нуля, полоски перерисовываем
    this.currentRep = 0;
    this._updateSetProgress();

    // Phase badge
    const pb = document.getElementById('phaseBadge');
    pb.className = 'phase-badge' + (this.engine.phase === 'warmup' ? ' warmup' : this.engine.phase === 'cooldown' ? ' cooldown' : '');
    pb.textContent = this.engine.phase === 'warmup' ? t.warmup : this.engine.phase === 'cooldown' ? t.cooldown : '';

    // Instructions
    const ib = document.getElementById('instructionsBox');
    ib.innerHTML = `<strong>${t.instructions}:</strong> ${this._esc(loc.instructions)}`;

    // Previous result
    this._showPrevResult(ex.id);

    if (this.speech) this.speech.speak(loc.name);
  }

  _showPrevResult(exId) {
    const strip = document.getElementById('prevResultStrip');
    // For now show from current session logs
    const prev = this.engine.logs.filter(l => l.exerciseId === exId).pop();
    if (prev) {
      strip.textContent = `${this.t.prevResult}: ${prev.actualReps} ${this.t.reps} × ${prev.weight}${this.t.kg} @ RPE ${prev.rpe}`;
    } else {
      strip.textContent = '';
    }
  }

  _handleAction() {
    if (!this.engine || this.engine.phase === 'complete') return;
    const btn = document.getElementById('actionBtn');

    if (btn.dataset.mode === 'active') {
      // Pause
      this._pauseRepTimer();
      btn.textContent = this.t.resume;
      btn.dataset.mode = 'paused';
      if (this.speech) this.speech.speak(this.t.pause);
    } else {
      // Start or Resume
      btn.dataset.mode = 'active';
      btn.textContent = this.t.pause;
      this._startRepTimer();
      if (this.speech) this.speech.speak(this.t.start);
    }
  }

  _startRepTimer() {
    const ex = this.engine.getCurrentExercise();
    if (!ex) return;
    // Счётчик хранится на объекте, а не в локальной переменной:
    // иначе после паузы отсчёт начинался бы заново с нуля.
    if (typeof this.currentRep !== 'number') this.currentRep = 0;
    const tempo = store.getState().globalTempo;
    const half = tempo * 500;

    // Пока идёт подход, кадрами управляют фазы дыхания
    this._stopFrameLoop();

    const overlay = document.getElementById('breathOverlay');
    const overlayText = document.getElementById('breathOverlayText');
    const phaseText = document.getElementById('phaseDisplay');
    const circle = document.getElementById('counterCircle');

    const tick = () => {
      const st = store.getState();
      const breath = st.breathMode || 'inhale';
      const counting = st.countAloud !== false;
      this.currentRep++;
      const rep = this.currentRep;
      document.getElementById('repDisplay').textContent = rep;
      this._updateSetProgress();
      // Счёт говорим первым и не обрываем — он задаёт ритм
      if (this.speech && counting) this.speech.speak(String(rep));

      // Команду дыхания даём с задержкой, чтобы цифра успела прозвучать
      const breathDelay = counting ? Math.min(900, half - 200) : 350;

      // Первая половина цикла — опускание. На нём делается вдох,
      // поэтому и кадр здесь нижний.
      setTimeout(() => {
        this._showFrame(1);
        circle.className = 'counter-circle state-inhale';
        if (breath === 'off') {
          phaseText.textContent = '';
          overlay.className = 'breath-overlay';
          return;
        }
        phaseText.textContent = this.t.inhale;
        // Надпись поверх картинки закрывает технику, поэтому её
        // показываем только когда просили обе фазы
        if (breath === 'both') {
          overlayText.textContent = this.t.inhale;
          overlay.className = 'breath-overlay show inhale';
        }
        if (this.speech) this.speech.speak(this.t.inhale);
      }, breathDelay);

      // Вторая половина — подъём, усилие. Выдох и верхний кадр.
      setTimeout(() => {
        this._showFrame(0);
        circle.className = 'counter-circle state-exhale';
        if (breath !== 'both') {
          // В режимах «только вдох» и «выключено» о выдохе не напоминаем
          phaseText.textContent = '';
          overlay.className = 'breath-overlay';
          return;
        }
        phaseText.textContent = this.t.exhale;
        overlayText.textContent = this.t.exhale;
        overlay.className = 'breath-overlay show exhale';
        if (this.speech) this.speech.speak(this.t.exhale);
      }, half + 200);

      if (rep >= ex.reps) {
        clearInterval(this.repTimer);
        this.repTimer = null;
        setTimeout(() => this._finishSet(), half + 600);
      }
    };

    tick();
    this.repTimer = setInterval(tick, tempo * 1000);
  }

  _pauseRepTimer() {
    if (this.repTimer) { clearInterval(this.repTimer); this.repTimer = null; }
    document.getElementById('breathOverlay').className = 'breath-overlay';
    // Обрываем недоговорённое, иначе счёт продолжится уже на паузе
    if (this.speech) this.speech.stopSpeaking();
    this._startFrameLoop();
  }

  _finishSet() {
    this.currentRep = 0;
    this._startFrameLoop();
    document.getElementById('actionBtn').dataset.mode = '';
    document.getElementById('actionBtn').textContent = this.t.start;
    document.getElementById('breathOverlay').className = 'breath-overlay';
    document.getElementById('counterCircle').className = 'counter-circle';
    if (this.speech) this.speech.speak(this.t.stop);
    this._openLogModal();
  }

  _openLogModal() {
    const ex = this.engine.getCurrentExercise();
    document.getElementById('logReps').value = ex ? ex.reps : 0;
    document.getElementById('logWeight').value = 0;
    document.getElementById('logRpe').value = 7;
    document.getElementById('rpeValue').textContent = '7';
    document.getElementById('logNotes').value = '';
    document.getElementById('prevResultBox').textContent = document.getElementById('prevResultStrip').textContent;
    document.getElementById('logModal').classList.remove('hidden');
  }

  _saveLog() {
    const reps = parseInt(document.getElementById('logReps').value) || 0;
    const weight = parseFloat(document.getElementById('logWeight').value) || 0;
    const rpe = parseInt(document.getElementById('logRpe').value) || 7;
    const notes = document.getElementById('logNotes').value;
    this.engine.logSet({ actualReps: reps, weight, rpe, notes });
    document.getElementById('logModal').classList.add('hidden');
    this._startRest();
  }

  _skipLog() {
    document.getElementById('logModal').classList.add('hidden');
    this._startRest();
  }

  _startRest() {
    const ex = this.engine.getCurrentExercise();
    const restSec = ex ? ex.rest : store.getState().restSeconds;
    const nextInfo = this.engine.nextSet();

    if (nextInfo.phase === 'complete') {
      this._finishWorkout(nextInfo.record);
      return;
    }

    document.getElementById('screenWorkout').classList.add('hidden');
    document.getElementById('restScreen').classList.remove('hidden');
    document.getElementById('restNextText').textContent = this.t.restNext;
    this._updateSessionProgress();

    const circle = document.getElementById('restProgress');
    const timeEl = document.getElementById('restTime');
    const maxDash = 283;

    this.restTimer = new RestTimer(restSec);
    this.restTimer.onTick = (remaining, total) => {
      timeEl.textContent = remaining;
      const pct = remaining / total;
      circle.style.strokeDashoffset = maxDash * (1 - pct);
    };
    this.restTimer.onComplete = () => {
      this._skipRest();
    };
    this.restTimer.start();
  }

  _skipRest() {
    if (this.restTimer) { this.restTimer.stop(); this.restTimer = null; }
    document.getElementById('restScreen').classList.add('hidden');
    document.getElementById('screenWorkout').classList.remove('hidden');
    this._refreshWorkoutUI();
  }

  /* ----- Карточка упражнения ----- */

  _openPreview(idx) {
    const prog = this.programs[store.getState().currentProgram];
    if (!prog) return;
    const ex = EXERCISE_DB[prog.exercises[idx]];
    if (!ex) return;

    const loc = ex[this.currentLang] || ex.ru;
    this.previewIndex = idx;

    document.getElementById('previewName').textContent = loc.name;
    document.getElementById('previewPlan').textContent =
      `${this._getEffectiveSets()} ${this.t.setsShort} × ${ex.reps} ${this.t.reps} · ${this.t.restBetween(ex.rest)}`;
    document.getElementById('previewDesc').textContent = loc.desc;
    document.getElementById('previewInstructions').innerHTML =
      `<strong>${this.t.instructions}:</strong> ${this._esc(loc.instructions)}`;

    // Как дышать в этом движении и почему именно так
    const breathBox = document.getElementById('previewBreathing');
    const guide = this.t.breathingGuide[ex.breath];
    breathBox.innerHTML = guide
      ? `<strong>${this.t.breathingTitle}:</strong> ${this._esc(guide)}`
      : '';
    document.getElementById('btnPreviewStart').textContent = this.t.previewStart;
    document.getElementById('btnPreviewClose').textContent = this.t.close;

    // Кадры листаем и здесь, чтобы движение было видно до начала
    const img = document.getElementById('previewImg');
    const mediaBox = img.parentElement;
    const oldBoard = mediaBox.querySelector('.board-figure');
    if (oldBoard) oldBoard.remove();

    this.previewFrames = ex.frames || [];
    this.previewFrameIndex = 0;
    this._stopPreviewLoop();

    // Для доски показываем схему: куда вставлять ручки и как их развернуть
    if (ex.board) {
      img.style.display = 'none';
      mediaBox.insertAdjacentHTML('beforeend', this._boardFigure(ex));
      document.getElementById('previewModal').classList.remove('hidden');
      return;
    }

    if (this.previewFrames.length) {
      img.style.display = '';
      img.src = this.previewFrames[0];
      if (this.previewFrames.length > 1) {
        this.previewTimer = setInterval(() => {
          this.previewFrameIndex = (this.previewFrameIndex + 1) % this.previewFrames.length;
          img.src = this.previewFrames[this.previewFrameIndex];
        }, 900);
      }
    } else {
      img.style.display = 'none';
    }

    document.getElementById('previewModal').classList.remove('hidden');
  }

  _closePreview() {
    this._stopPreviewLoop();
    document.getElementById('previewModal').classList.add('hidden');
  }

  _stopPreviewLoop() {
    if (this.previewTimer) { clearInterval(this.previewTimer); this.previewTimer = null; }
  }

  _startFromPreview() {
    const idx = this.previewIndex;
    this._closePreview();
    if (typeof idx === 'number') this._startExercise(idx);
  }

  /* ----- Схема доски для отжиманий -----
     Рисуем саму доску сверху: цветные зоны, все гнёзда и подсветку тех,
     куда ставить ручки для текущего упражнения. Своя схема надёжнее
     чужих картинок — совпадает с доской и работает без интернета. */

  // Положение гнёзд на фотографии доски, в процентах от её размеров.
  // Снято с фотографии: половины зеркальны, поэтому у каждой пары
  // одна высота и симметричные отступы слева и справа.
  /* Планка вставляется в ДВА гнезда: нижним концом в общее гнездо,
     верхним — в цветное. Отсюда и разные углы наклона. Расстояние
     между гнёздами одинаковое — это длина планки.
     Координаты сняты с фотографии 1597 x 1142. */
  static get BOARD_GEOMETRY() {
    return {
      w: 1597, h: 1142,
      pivot: { l: { x: 327, y: 725 }, r: { x: 1270, y: 725 } },
      // Расстояние от общего гнезда до каждого — 338–345 пикселей.
      // Это длина планки, она у всех положений одна.
      ends: {
        blue:   { l: { x: 355, y: 385 }, r: { x: 1242, y: 385 }, c: '#4a90e2' },
        red:    { l: { x: 522, y: 442 }, r: { x: 1075, y: 442 }, c: '#e74c3c' },
        green:  { l: { x: 620, y: 542 }, r: { x: 977,  y: 542 }, c: '#2ecc71' },
        yellow: { l: { x: 662, y: 680 }, r: { x: 935,  y: 680 }, c: '#e8c400' }
      }
    };
  }

  // Фотография доски с нарисованной планкой: она перекрывает оба гнезда
  // и стоит ровно под тем углом, под каким её надо поставить.
  _boardPhoto(board) {
    if (!board) return '';
    const geo = UI.BOARD_GEOMETRY;
    const e = geo.ends[board.slot || board.color];
    if (!e) return '';

    const bar = (side) => {
      const a = geo.pivot[side], b = e[side];
      const line = (w, stroke, extra = '') =>
        `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
               stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
      return line(78, 'rgba(0,0,0,0.6)') +
             line(62, e.c, 'opacity="0.92"') +
             line(62, '#fff', 'opacity="0.16" class="board-bar"') +
             `<circle cx="${a.x}" cy="${a.y}" r="26" fill="none" stroke="#fff" stroke-width="6" opacity="0.9"/>
              <circle cx="${b.x}" cy="${b.y}" r="26" fill="none" stroke="#fff" stroke-width="6" opacity="0.9"/>`;
    };

    return `
      <div class="board-photo">
        <img src="assets/board/board.jpg" alt="">
        <svg class="board-overlay" viewBox="0 0 ${geo.w} ${geo.h}" preserveAspectRatio="none">
          ${bar('l')}${bar('r')}
        </svg>
      </div>`;
  }

  // Человечек: вид сверху, куда ставить ладони и куда уходят локти.
  // Именно это чаще всего делают неправильно.
  _formSvg(board) {
    if (!board) return '';
    const f = UI.FORM_VIEWS[board.color];
    if (!f) return '';
    return `
      <svg viewBox="0 0 200 130" class="form-svg" role="img">
        <!-- корпус сверху: голова, плечи, таз -->
        <ellipse cx="100" cy="20" rx="13" ry="14" fill="#3a3a46"/>
        <path d="M78 36 L122 36 L116 104 L84 104 Z" fill="#2f2f3a"/>
        <rect x="92" y="104" width="16" height="20" rx="6" fill="#2f2f3a"/>
        <!-- руки: от плеча через локоть к ладони -->
        <path d="M80 40 L${f.eL} L${f.hL}" fill="none" stroke="#8a8a9e" stroke-width="5"
              stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M120 40 L${f.eR} L${f.hR}" fill="none" stroke="#8a8a9e" stroke-width="5"
              stroke-linecap="round" stroke-linejoin="round"/>
        <!-- локти -->
        <circle cx="${f.eL.split(' ')[0]}" cy="${f.eL.split(' ')[1]}" r="5" fill="${f.c}"/>
        <circle cx="${f.eR.split(' ')[0]}" cy="${f.eR.split(' ')[1]}" r="5" fill="${f.c}"/>
        <!-- ладони на ручках -->
        <rect x="${+f.hL.split(' ')[0] - 9}" y="${+f.hL.split(' ')[1] - 6}" width="18" height="12" rx="4"
              fill="none" stroke="${f.c}" stroke-width="2.5"/>
        <rect x="${+f.hR.split(' ')[0] - 9}" y="${+f.hR.split(' ')[1] - 6}" width="18" height="12" rx="4"
              fill="none" stroke="${f.c}" stroke-width="2.5"/>
      </svg>`;
  }

  // Положения локтей (e) и ладоней (h) для каждого цвета
  static get FORM_VIEWS() {
    return {
      blue:   { eL: '52 62',  eR: '148 62',  hL: '58 88',  hR: '142 88',  c: '#4a90e2' },
      green:  { eL: '70 66',  eR: '130 66',  hL: '84 88',  hR: '116 88',  c: '#2ecc71' },
      red:    { eL: '58 54',  eR: '142 54',  hL: '70 78',  hR: '130 78',  c: '#e74c3c' },
      yellow: { eL: '40 58',  eR: '160 58',  hL: '34 88',  hR: '166 88',  c: '#e8c400' }
    };
  }

  _boardFigure(ex) {
    const b = ex.board;
    return `
      <div class="board-figure">
        ${this._boardPhoto(b)}
        <div class="board-caption">${this.t.boardCaption}: ${this.t.boardGrip[b.grip]}</div>
        ${this._formSvg(b)}
        <div class="board-caption form-caption">${this.t.formCaption}: ${this.t.elbowHints[b.color]}</div>
      </div>`;
  }

  /* ----- Анимация упражнения -----
     Кадров два: начало и конец движения. Чередуя их, получаем анимацию.
     Пока идёт подход, кадры переключаются по командам «вдох» и «выдох»,
     то есть в темпе самого упражнения. В покое — сами по себе. */

  _setFrames(ex) {
    const img = document.getElementById('activeMediaImg');
    const box = img.parentElement;
    const oldFb = box.querySelector('.img-fallback');
    if (oldFb) oldFb.remove();
    const oldBoard = box.querySelector('.board-figure');
    if (oldBoard) oldBoard.remove();

    this.frames = (ex && ex.frames) || [];
    this.frameIndex = 0;

    // Упражнения на доске: вместо фото показываем схему постановки ручек
    if (ex && ex.board) {
      this._stopFrameLoop();
      img.style.display = 'none';
      box.insertAdjacentHTML('beforeend', this._boardFigure(ex));
      return;
    }

    if (!this.frames.length) {
      // Упражнение без картинок — показываем подпись вместо пустоты
      this._stopFrameLoop();
      img.style.display = 'none';
      const fb = document.createElement('div');
      fb.className = 'img-fallback';
      fb.textContent = this.t.fallbackImg;
      box.appendChild(fb);
      return;
    }

    img.style.display = '';
    img.src = this.frames[0];
    this._startFrameLoop();
  }

  _showFrame(i) {
    if (!this.frames || !this.frames.length) return;
    this.frameIndex = i % this.frames.length;
    document.getElementById('activeMediaImg').src = this.frames[this.frameIndex];
  }

  // Спокойное чередование, когда подход не идёт
  _startFrameLoop() {
    this._stopFrameLoop();
    if (!this.frames || this.frames.length < 2) return;
    this.frameTimer = setInterval(() => this._showFrame(this.frameIndex + 1), 900);
  }

  _stopFrameLoop() {
    if (this.frameTimer) { clearInterval(this.frameTimer); this.frameTimer = null; }
  }

  /* ----- Прогресс по текущему упражнению ----- */

  // Полосок столько, сколько подходов у упражнения. Та, что идёт сейчас,
  // убывает с каждым повтором; закрытые остаются пустыми.
  _updateSetProgress() {
    const bars = document.getElementById('setProgressBars');
    const label = document.getElementById('setProgressLabel');
    const ex = this.engine.getCurrentExercise();
    if (!ex) { bars.innerHTML = ''; label.textContent = ''; return; }

    const totalSets = this.engine.setsForIndex(this.engine.currentExIndex);
    const currentSet = this.engine.currentSet;
    const totalReps = ex.reps || 0;
    const doneReps = Math.min(this.currentRep || 0, totalReps);
    const leftReps = Math.max(0, totalReps - doneReps);

    // Перерисовываем полоски только когда меняется их количество,
    // иначе плавное убывание сбрасывалось бы на каждом повторе.
    if (bars.childElementCount !== totalSets) {
      bars.innerHTML = '';
      for (let i = 0; i < totalSets; i++) {
        const bar = document.createElement('div');
        bar.className = 'set-bar';
        bar.innerHTML = '<div class="set-bar-fill"></div>';
        bars.appendChild(bar);
      }
    }

    Array.from(bars.children).forEach((bar, i) => {
      const fill = bar.firstElementChild;
      bar.classList.toggle('current', i === currentSet - 1);
      bar.classList.toggle('done', i < currentSet - 1);
      if (i < currentSet - 1) fill.style.width = '0%';
      else if (i === currentSet - 1) fill.style.width = totalReps > 0 ? `${(leftReps / totalReps) * 100}%` : '100%';
      else fill.style.width = '100%';
    });

    const setsLeft = totalSets - currentSet;
    const tail = totalSets > 1 ? ` <span class="muted">· ${this.t.setsLeftShort(setsLeft)}</span>` : '';
    label.innerHTML = this.t.repsLeft(leftReps, totalReps) + tail;
  }

  /* ----- Общий прогресс тренировки ----- */

  // Полоса убывает: показывает, сколько подходов ещё впереди.
  _updateSessionProgress() {
    const box = document.getElementById('sessionProgress');
    const fill = document.getElementById('sessionProgressFill');
    const total = this.engine.getTotalSets();
    const done = this.engine.getCompletedSets();
    const left = Math.max(0, total - done);

    box.classList.remove('hidden');
    document.getElementById('sessionLeftLabel').textContent = this.t.sessionLeft(left);
    document.getElementById('sessionDoneLabel').textContent = this.t.sessionDone(done, total);
    fill.style.width = total > 0 ? `${(left / total) * 100}%` : '0%';
    fill.classList.toggle('almost-done', left <= 1);
  }

  _hideSessionProgress() {
    document.getElementById('sessionProgress').classList.add('hidden');
  }

  // Досрочное завершение с экрана отдыха: то, что успели сделать,
  // попадает в статистику.
  _finishEarly() {
    if (!confirm(this.t.confirmFinish)) return;
    if (this.repTimer) { clearInterval(this.repTimer); this.repTimer = null; }
    if (this.restTimer) { this.restTimer.stop(); this.restTimer = null; }
    const result = this.engine.finish();
    this._finishWorkout(result.record);
  }

  _finishWorkout(record) {
    this._stopFrameLoop();
    document.getElementById('screenWorkout').classList.add('hidden');
    document.getElementById('screenPlan').classList.remove('hidden');
    document.getElementById('restScreen').classList.add('hidden');
    this._hideSessionProgress();
    if (this.speech) {
      this.speech.stopListening();
      this.speech.speak(this.t.workoutComplete);
    }
    alert(this.t.allExercisesDone + `\n${this.t.streak}: ${record.durationMin} min`);
    this._renderStats();
  }

  _exitWorkout() {
    if (this.repTimer) { clearInterval(this.repTimer); this.repTimer = null; }
    if (this.restTimer) { this.restTimer.stop(); this.restTimer = null; }
    // Уходим со сделанными подходами — записываем их. Раньше выход
    // с середины стирал всю работу, и в календаре день оставался пустым.
    if (this.engine && this.engine.logs && this.engine.logs.length) {
      this.engine.finish(true);
      this._renderStats();
    }
    this._stopFrameLoop();
    document.getElementById('screenWorkout').classList.add('hidden');
    document.getElementById('restScreen').classList.add('hidden');
    document.getElementById('screenPlan').classList.remove('hidden');
    this._hideSessionProgress();
    this._showMicStatus('idle');
    if (this.speech) this.speech.stopListening();
  }

  /* ----- Голосовые команды -----
     Включаются кнопкой на самом экране упражнения. Так надо и браузеру
     (доступ к микрофону он даёт только после нажатия), и человеку —
     сразу видно, слушает программа или нет. */

  _showMicStatus(status) {
    const btn = document.getElementById('btnMic');
    const text = document.getElementById('micText');
    if (!btn) return;

    if (status === 'listening') {
      btn.className = 'mic-btn on';
      text.textContent = this.t.micListening;
    } else if (status === 'denied') {
      btn.className = 'mic-btn off';
      text.textContent = this.t.micDenied;
    } else if (status === 'insecure') {
      btn.className = 'mic-btn off';
      text.textContent = this.t.micInsecure;
    } else if (status === 'unsupported') {
      btn.className = 'mic-btn off';
      text.textContent = this.t.micUnsupported;
    } else {
      btn.className = 'mic-btn';
      text.textContent = this.t.micOff;
    }
  }

  // Показать, что именно расслышал телефон. Если слово не подошло —
  // видно, какое пришло, и можно сказать иначе.
  _showHeard(text, ok = true) {
    const el = document.getElementById('micText');
    if (!el || !text) return;
    el.textContent = ok ? `✓ ${text}` : `«${text}»`;
    clearTimeout(this._heardTimer);
    this._heardTimer = setTimeout(() => {
      if (this.speech && this.speech.wantListening) el.textContent = this.t.micListening;
    }, 2500);
  }

  async _toggleMic() {
    if (!this.speech) return;

    // Уже слушаем — выключаем
    if (this.speech.wantListening) {
      this.speech.stopListening();
      this.speech.voiceCommandsEnabled = false;
      store.setState({ voiceControlEnabled: false });
      this._persistSetting('voiceControlEnabled', false);
      this._showMicStatus('idle');
      return;
    }

    const mic = SpeechController.micAvailable();
    if (mic !== 'ok') { this._showMicStatus(mic); return; }

    // Просим микрофон явно: так браузер показывает понятный запрос,
    // а мы узнаём об отказе сразу, а не через ошибку распознавания.
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (e) {
      this._showMicStatus('denied');
      return;
    }

    this.speech.voiceCommandsEnabled = true;
    store.setState({ voiceControlEnabled: true });
    this._persistSetting('voiceControlEnabled', true);
    const chk = document.getElementById('setVoiceControl');
    if (chk) chk.checked = true;
    this.speech.startListening();
  }

  // Сохранить одну настройку, не трогая остальные
  _persistSetting(key, value) {
    return this._persistSettings({ [key]: value });
  }

  // Несколько настроек разом: по одной их пришлось бы писать
  // параллельно, и последняя запись затёрла бы предыдущие
  _persistSettings(patch) {
    return db.get('settings', 'app')
      .then(saved => db.set('settings', 'app', { ...(saved || {}), ...patch }))
      .catch(() => {});
  }

  _onVoiceCommand(cmd) {
    if (cmd === 'start') this._handleAction();
    else if (cmd === 'pause') this._pauseRepTimer();
    else if (cmd === 'complete') this._finishSet();
    else if (cmd === 'rest') this._skipRest();
  }

  /* ----- План недели -----
     Два вопроса — сколько дней и какой уровень — и приложение само
     раскладывает неделю по методике. Ручная правка осталась ниже,
     для тех, кто хочет по-своему. */

  _renderPlanTab() {
    const st = store.getState();
    if (!this.planLevel) this.planLevel = st.level || 'beginner';
    if (!this.planDays) {
      this.planDays = st.planMethod && METHODS[st.planMethod]
        ? METHODS[st.planMethod].days
        : 3;
    }
    // Неделя показывается сразу: пустой экран с вопросами ничего не
    // объясняет, а готовый план видно и можно просто пролистать
    if (!this.planPreviewId) {
      this.planPreviewId = (st.planMethod && METHODS[st.planMethod])
        ? st.planMethod
        : (Object.keys(METHODS).find(id => METHODS[id].days === this.planDays) || 'fullbody3');
    }

    document.getElementById('planQDays').textContent = this.t.planQDays;
    document.getElementById('planQLevel').textContent = this.t.planQLevel;
    document.getElementById('planQMethod').textContent = this.t.planQMethod;
    document.getElementById('planQWeek').textContent = this.t.planQWeek;
    document.getElementById('btnApplyPlan').textContent = this.t.applyWeek;
    document.getElementById('manualSchedTitle').textContent = this.t.manualSchedule;

    document.querySelectorAll('#planDaysRow .chip').forEach(c => {
      c.textContent = this.t.daysShort(Number(c.dataset.days));
      c.classList.toggle('active', Number(c.dataset.days) === this.planDays);
    });
    document.querySelectorAll('#planLevelRow .chip').forEach(c => {
      const lvl = LEVELS[c.dataset.level];
      c.textContent = lvl ? lvl[this.currentLang].name : c.dataset.level;
      c.classList.toggle('active', c.dataset.level === this.planLevel);
    });

    this._renderMethodList();
    this._renderPlanPreview();
    document.getElementById('planPreview').classList.remove('hidden');
  }

  // Карточки методик. Сначала те, что совпали с выбранным числом дней,
  // остальные ниже — их всё равно видно и можно выбрать.
  _renderMethodList() {
    const box = document.getElementById('methodList');
    box.innerHTML = '';
    const st = store.getState();

    const ids = Object.keys(METHODS).sort((a, b) => {
      const da = Math.abs(METHODS[a].days - this.planDays);
      const dbb = Math.abs(METHODS[b].days - this.planDays);
      return da - dbb || METHODS[a].days - METHODS[b].days;
    });

    ids.forEach(id => {
      const m = METHODS[id];
      const loc = m[this.currentLang] || m.ru;
      const fits = m.days === this.planDays;
      const active = this.planPreviewId === id;
      const applied = st.planMethod === id;

      const card = document.createElement('div');
      card.className = 'method-card'
        + (fits ? ' fits' : '')
        + (active ? ' open' : '')
        + (applied ? ' applied' : '');
      card.innerHTML = `
        <div class="method-top">
          <span class="method-name">${this._esc(loc.name)}</span>
          <span class="method-days">${this._esc(this.t.daysShort(m.days))}</span>
        </div>
        <div class="method-author">${this._esc(loc.author)}</div>
        <div class="method-short">${this._esc(loc.short)}</div>
        <div class="method-body">
          <div class="method-desc">${this._esc(loc.desc)}</div>
          <div class="method-for"><b>${this._esc(this.t.forWhom)}</b> ${this._esc(loc.forWhom)}</div>
        </div>
        ${applied ? `<div class="method-applied">✓ ${this._esc(this.t.planApplied)}</div>` : ''}`;
      card.onclick = () => this._previewMethod(id);
      box.appendChild(card);
    });
  }

  _previewMethod(id) {
    this.planPreviewId = id;
    this._renderMethodList();
    this._renderPlanPreview();
    document.getElementById('planPreview').classList.remove('hidden');
    document.getElementById('planPreview').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  _renderPlanPreview() {
    const plan = buildWeekPlan(this.planPreviewId, this.planLevel);
    if (!plan) return;
    this._previewPlan = plan;

    const box = document.getElementById('planWeek');
    box.innerHTML = '';
    const todayDow = new Date().getDay();

    // Показываем с понедельника — так неделя читается привычнее
    plan.days.slice().sort((a, b) => a.order - b.order).forEach(day => {
      const focus = FOCUS[day.focus];
      const loc = focus[this.currentLang] || focus.ru;
      const row = document.createElement('div');
      row.className = 'week-row' + (day.isRest ? ' easy' : '') + (day.dow === todayDow ? ' today' : '');
      const minutes = estimateDayMinutes(day);
      const meta = day.isRest
        ? this.t.easyDayMeta
        : `${this.t.exCount(day.exercises.length)} · ${day.sets} ${this.t.setsShort} · ~${minutes} ${this.t.min}`;
      row.innerHTML = `
        <span class="week-dow">${this._esc(this.t.weekdaysShort[day.dow])}</span>
        <span class="week-body">
          <span class="week-name">${this._esc(loc.name)}</span>
          <span class="week-meta">${this._esc(meta)}</span>
        </span>`;
      row.onclick = () => alert(`${loc.name}\n\n${loc.note}`);
      box.appendChild(row);
    });

    // Сколько раз за неделю достанется каждой группе мышц
    const load = weekMuscleLoad(plan);
    const lbox = document.getElementById('muscleLoad');
    const names = this.t.muscleNames || {};
    const items = Object.keys(load)
      .filter(m => names[m])
      .sort((a, b) => load[b] - load[a])
      .map(m => `<span class="load-chip${load[m] >= 2 ? ' ok' : ''}">${this._esc(names[m])} ${load[m]}×</span>`);
    lbox.innerHTML = `<div class="load-title">${this._esc(this.t.weekLoadTitle)}</div>
      <div class="load-chips">${items.join('')}</div>
      <div class="load-hint">${this._esc(this.t.weekLoadHint)}</div>`;
  }

  _pickPlanDays(days) {
    this.planDays = days;
    // Выбранная раньше методика могла не подойти под новое число дней
    if (this.planPreviewId && METHODS[this.planPreviewId].days !== days) {
      const match = Object.keys(METHODS).find(id => METHODS[id].days === days);
      this.planPreviewId = match || this.planPreviewId;
    }
    this._renderPlanTab();
  }

  _pickPlanLevel(level) {
    this.planLevel = level;
    this._renderPlanTab();
  }

  _applyPlan() {
    const plan = this._previewPlan;
    if (!plan) return;

    Object.assign(this.programs, plan.programs);

    // Сегодняшний день плана становится текущей программой —
    // чтобы с экрана тренировки можно было сразу начать
    const todayKey = plan.schedule[new Date().getDay()];

    store.setState({
      programs: this.programs,
      schedule: plan.schedule,
      planMethod: plan.methodId,
      level: plan.level,
      currentProgram: todayKey || store.getState().currentProgram
    });

    this._persistSettings({ planMethod: plan.methodId, level: plan.level });
    db.set('settings', 'schedule', plan.schedule).catch(() => {});

    this._renderPrograms();
    this._renderPlanList();
    this._renderSchedule();
    this._renderMethodList();

    const loc = plan.method[this.currentLang] || plan.method.ru;
    alert(`${this.t.planAppliedFull}\n\n${loc.name}`);
    this._switchTab('workout');
  }

  /* ----- Constructor ----- */
  _renderConstructor() {
    const box = document.getElementById('constructorExercisesList');
    box.innerHTML = '';
    Object.keys(EXERCISE_DB).forEach(key => {
      const ex = EXERCISE_DB[key];
      const loc = ex[this.currentLang] || ex.ru;
      const row = document.createElement('div');
      row.className = 'exercise-item';
      row.style.cursor = 'default';
      row.innerHTML = `
        <input type="checkbox" value="${key}" id="chk_${key}" style="width:18px;height:18px;accent-color:var(--gold-primary);">
        <label for="chk_${key}" style="flex:1;cursor:pointer;margin-left:8px;">
          <div class="exercise-name">${this._esc(loc.name)}</div>
          <div class="exercise-details">${this._esc(loc.desc)}</div>
        </label>
      `;
      box.appendChild(row);
    });
  }

  _saveCustomProgram() {
    const name = document.getElementById('customProgName').value.trim();
    if (!name) { alert('Введите название'); return; }
    const checked = Array.from(document.querySelectorAll('#constructorExercisesList input:checked')).map(cb => cb.value);
    if (!checked.length) { alert('Выберите упражнения'); return; }
    const id = 'custom_' + Date.now();
    const prog = { id, name, exercises: checked };
    this.programs[id] = prog;
    store.setState({ programs: this.programs, currentProgram: id });
    this._renderPrograms();
    this._renderPlanList();
    this._switchTab('workout');
    // Ключ у этого хранилища лежит внутри записи, поэтому программа
    // кладётся целиком. Раньше здесь была обёртка {key, value} —
    // база её отвергала, и свои комплексы пропадали при перезапуске.
    db.putProgram(prog).catch(e => console.warn('[UI] программа не сохранилась:', e));
    document.getElementById('customProgName').value = '';
    document.querySelectorAll('#constructorExercisesList input:checked').forEach(cb => { cb.checked = false; });
  }

  /* ----- Schedule ----- */
  _renderSchedule() {
    const box = document.getElementById('scheduleList');
    box.innerHTML = '';
    const sched = store.getState().schedule;
    this.t.weekdays.forEach((dayName, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'exercise-item';
      wrap.style.flexDirection = 'column'; wrap.style.alignItems = 'flex-start'; wrap.style.gap = '4px'; wrap.style.cursor = 'default';
      let opts = '';
      Object.keys(this.programs).forEach(pk => {
        opts += `<option value="${pk}" ${sched[idx] === pk ? 'selected' : ''}>${this._progName(this.programs[pk])}</option>`;
      });
      wrap.innerHTML = `
        <div style="font-weight:700;font-size:0.8rem;color:var(--gold-light);">${dayName}</div>
        <select id="sched_day_${idx}" style="width:100%;padding:6px;background:#050507;border:1px solid #333;color:#fff;border-radius:6px;font-size:0.8rem;">${opts}</select>
      `;
      box.appendChild(wrap);
    });
  }

  _saveSchedule() {
    const s = {};
    for (let i = 0; i < 7; i++) s[i] = document.getElementById('sched_day_' + i).value;
    // Руками правленое расписание больше не принадлежит методике
    store.setState({ schedule: s, planMethod: null });
    this._persistSettings({ planMethod: null });
    db.set('settings', 'schedule', s)
      .then(() => alert(this.t.scheduleSaved))
      .catch(() => alert(this.t.scheduleSaved));
    this._renderMethodList();
  }

  /* ----- Здоровье: глаза, кардио, дорожка ----- */

  // Напоминание про глаза на главном экране: раздел «Здоровье» —
  // не первое место, куда смотрят, а дело это ежедневное
  async _renderDailyEyes() {
    const name = document.getElementById('dailyEyesName');
    const meta = document.getElementById('dailyEyesMeta');
    const badge = document.getElementById('dailyEyesBadge');
    if (!name || !meta || !badge) return;

    name.textContent = this.t.eyesTitleShort;
    meta.textContent = this.t.eyesMeta(EYE_EXERCISES.length, eyeSetMinutes());

    const day = await db.getDay(dateKey()).catch(() => null);
    const done = !!(day && day.eyes);
    badge.textContent = done ? this.t.doneToday : this.t.startShort;
    badge.classList.toggle('done', done);
  }

  async _renderHealth() {
    const t = this.t;
    document.getElementById('eyesTitle').textContent = t.eyesTitle;
    document.getElementById('eyesMeta').textContent = t.eyesMeta(EYE_EXERCISES.length, eyeSetMinutes());
    document.getElementById('btnStartEyes').textContent = t.eyesStart;
    document.getElementById('btnToggleEyesList').textContent =
      this._eyesListOpen ? t.eyesHideList : t.eyesShowList;
    document.getElementById('eyesNote').textContent = t.eyesWarning;
    this._renderEyesList();

    // Отметки за сегодня — видно сразу, не заглядывая в календарь
    const day = await db.getDay(dateKey()).catch(() => null);

    const eyesBadge = document.getElementById('eyesTodayBadge');
    const eyesDone = !!(day && day.eyes);
    eyesBadge.textContent = eyesDone ? t.doneToday : t.notDoneToday;
    eyesBadge.classList.toggle('done', eyesDone);

    const cardioBadge = document.getElementById('cardioTodayBadge');
    const mins = (day && day.cardioMin) || 0;
    cardioBadge.textContent = mins ? `${mins} ${t.min}` : t.notDoneToday;
    cardioBadge.classList.toggle('done', mins > 0);
  }

  _renderEyesList() {
    const box = document.getElementById('eyesList');
    box.classList.toggle('hidden', !this._eyesListOpen);
    if (!this._eyesListOpen) return;
    box.innerHTML = '';
    EYE_EXERCISES.forEach((ex, i) => {
      const loc = ex[this.currentLang] || ex.ru;
      const amount = ex.type === 'time'
        ? `${ex.value} ${this.t.sec}`
        : `${ex.value} ${this.t.timesShort}`;
      const row = document.createElement('div');
      row.className = 'eye-item';
      row.innerHTML = `
        <div class="eye-item-head">
          <span class="eye-item-num">${i + 1}</span>
          <span class="eye-item-name">${this._esc(loc.name)}</span>
          <span class="eye-item-amount">${this._esc(amount)}</span>
        </div>
        <div class="eye-item-desc">${this._esc(loc.desc)}</div>
        <div class="eye-item-how">${this._esc(loc.how)}</div>
        <div class="eye-item-src">${this._esc(this.t.bySource)} ${this._esc(ex.source)}</div>`;
      box.appendChild(row);
    });
  }

  _toggleEyesList() {
    this._eyesListOpen = !this._eyesListOpen;
    document.getElementById('btnToggleEyesList').textContent =
      this._eyesListOpen ? this.t.eyesHideList : this.t.eyesShowList;
    this._renderEyesList();
  }

  /* ----- Сессия гимнастики для глаз -----
     Точка на экране ведёт взгляд по нужной траектории, снизу — сколько
     осталось. Считать самому не нужно, глаза заняты другим. */

  _startEyes() {
    this.eyesIndex = 0;
    this.eyesPaused = false;
    document.getElementById('eyesScreen').classList.remove('hidden');
    this._showEyesStep();
  }

  _showEyesStep() {
    const ex = EYE_EXERCISES[this.eyesIndex];
    if (!ex) { this._finishEyes(); return; }
    const loc = ex[this.currentLang] || ex.ru;

    document.getElementById('eyesStepCount').textContent =
      `${this.eyesIndex + 1} / ${EYE_EXERCISES.length}`;
    document.getElementById('eyesStepName').textContent = loc.name;
    document.getElementById('eyesStepDesc').textContent = loc.desc;
    document.getElementById('eyesStepHow').textContent = loc.how;
    document.getElementById('btnEyesToggle').textContent = this.t.pause;

    // Траекторию рисует CSS — здесь только говорим, какая нужна
    const stage = document.getElementById('eyesStage');
    stage.dataset.move = ex.id;
    const isPalming = ex.id.startsWith('palming');
    document.getElementById('eyesPalming').classList.toggle('hidden', !isPalming);
    document.getElementById('eyesDot').classList.toggle('hidden', isPalming);

    this._eyesTotal = eyeStepSeconds(ex);
    this._eyesLeft = this._eyesTotal;
    this._paintEyesTimer();

    if (this.speech) this.speech.speak(loc.name);

    this._stopEyesTimer();
    this._eyesTimer = setInterval(() => {
      if (this.eyesPaused) return;
      this._eyesLeft--;
      this._paintEyesTimer();
      if (this._eyesLeft <= 0) this._nextEyesStep();
    }, 1000);
  }

  _paintEyesTimer() {
    document.getElementById('eyesTimer').textContent = `${Math.max(0, this._eyesLeft)} ${this.t.sec}`;
    const pct = this._eyesTotal ? (this._eyesLeft / this._eyesTotal) * 100 : 0;
    document.getElementById('eyesTrackFill').style.width = `${Math.max(0, pct)}%`;
  }

  _stopEyesTimer() {
    if (this._eyesTimer) { clearInterval(this._eyesTimer); this._eyesTimer = null; }
  }

  _nextEyesStep() {
    this._stopEyesTimer();
    this.eyesIndex++;
    if (this.eyesIndex >= EYE_EXERCISES.length) { this._finishEyes(); return; }
    this._showEyesStep();
  }

  _prevEyesStep() {
    this._stopEyesTimer();
    this.eyesIndex = Math.max(0, this.eyesIndex - 1);
    this._showEyesStep();
  }

  _toggleEyesPause() {
    this.eyesPaused = !this.eyesPaused;
    document.getElementById('btnEyesToggle').textContent =
      this.eyesPaused ? this.t.resume : this.t.pause;
    document.getElementById('eyesStage').classList.toggle('paused', this.eyesPaused);
  }

  // Выход посреди комплекса: отметку не ставим, но и не ругаемся
  _exitEyes() {
    this._stopEyesTimer();
    document.getElementById('eyesScreen').classList.add('hidden');
    this._updateBackButton();
  }

  async _finishEyes() {
    this._stopEyesTimer();
    document.getElementById('eyesScreen').classList.add('hidden');
    if (this.speech) this.speech.speak(this.t.eyesDoneVoice);

    await db.mergeDay(dateKey(), {
      eyes: true,
      eyesAt: Date.now(),
      eyesVersion: EYE_SET_VERSION
    }).catch(e => console.warn('[Eyes] отметка не сохранилась:', e));

    alert(this.t.eyesDone);
    this._renderHealth();
    this._renderDailyEyes();
    this._renderStats();
    this._updateBackButton();
  }

  /* ----- Stats ----- */
  /* Календарь помнит всё: тренировки, кардио и глаза. Месяцы листаются,
     любой день открывается и показывает, что именно было сделано. */
  async _renderStats() {
    const now = new Date();
    if (this.calYear === undefined) {
      this.calYear = now.getFullYear();
      this.calMonth = now.getMonth();
    }
    const year = this.calYear, month = this.calMonth;

    document.getElementById('statsMonthTitle').textContent = `${this._monthName(month)} ${year}`;

    // Вперёд дальше текущего месяца ходить незачем
    const atCurrent = year === now.getFullYear() && month === now.getMonth();
    document.getElementById('btnCalNext').disabled = atCurrent;

    const [workouts, days] = await Promise.all([
      db.getAllWorkouts().catch(() => []),
      db.getAllDays().catch(() => [])
    ]);
    this._workoutsByDate = {};
    workouts.forEach(w => {
      (this._workoutsByDate[w.date] = this._workoutsByDate[w.date] || []).push(w);
    });
    this._daysByDate = {};
    days.forEach(d => { this._daysByDate[d.date] = d; });

    // Шапка: неделя начинается с понедельника, как в жизни
    const dow = document.getElementById('calDow');
    dow.innerHTML = [1, 2, 3, 4, 5, 6, 0]
      .map(i => `<span>${this._esc(this.t.weekdaysMin[i])}</span>`).join('');

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    // Пустые клетки до первого числа, чтобы дни встали под своими днями недели
    const firstDow = new Date(year, month, 1).getDay();
    const offset = (firstDow + 6) % 7;
    for (let i = 0; i < offset; i++) {
      const pad = document.createElement('div');
      pad.className = 'cal-day empty';
      grid.appendChild(pad);
    }

    const totalDays = new Date(year, month + 1, 0).getDate();
    const todayKey = dateKey(now);

    for (let d = 1; d <= totalDays; d++) {
      const ds = dateKey(new Date(year, month, d));
      const w = this._workoutsByDate[ds];
      const day = this._daysByDate[ds];
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      if (w && w.length) cell.classList.add('completed');
      if (ds === todayKey) cell.classList.add('today');
      if (ds === this._selectedDay) cell.classList.add('selected');
      if (ds > todayKey) cell.classList.add('future');

      const marks = [];
      if (w && w.length) marks.push('<i class="m-w"></i>');
      if (day && day.cardioMin) marks.push('<i class="m-c"></i>');
      if (day && day.eyes) marks.push('<i class="m-e"></i>');

      cell.innerHTML = `<div class="cal-num">${d}</div><div class="cal-marks">${marks.join('')}</div>`;
      cell.onclick = () => this._showDayCard(ds);
      grid.appendChild(cell);
    }

    document.getElementById('calLegend').innerHTML =
      `<span><i class="m-w"></i>${this._esc(this.t.legendWorkout)}</span>` +
      `<span><i class="m-c"></i>${this._esc(this.t.legendCardio)}</span>` +
      `<span><i class="m-e"></i>${this._esc(this.t.legendEyes)}</span>`;

    document.getElementById('statsStreak').textContent =
      `${this.t.streak}: ${this._currentStreak(now)} ${this.t.days}`;

    if (this._selectedDay) this._showDayCard(this._selectedDay, true);

    // Прогресс по весам — по последним записям, независимо от месяца
    const chart = document.getElementById('weightProgressChart');
    const last5 = workouts.slice(-5);
    if (!last5.length) { chart.textContent = this.t.noData; return; }
    chart.innerHTML = last5.map(w => {
      const totalVol = (w.exercises || []).reduce((sum, ex) => sum + (ex.weight * ex.actualReps), 0);
      return `<div style="margin-bottom:4px;">${w.date}: ${totalVol} ${this.t.kg}·${this.t.reps}</div>`;
    }).join('');
  }

  // Серия — сколько дней подряд подряд было хоть что-нибудь: тренировка,
  // кардио или глаза. Обрывается на первом пустом дне, считая от сегодня.
  _currentStreak(now) {
    let streak = 0;
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 0; i < 400; i++) {
      const ds = dateKey(cursor);
      const w = this._workoutsByDate[ds];
      const day = this._daysByDate[ds];
      const any = (w && w.length) || (day && (day.cardioMin || day.eyes));
      if (any) streak++;
      // Сегодняшний день ещё может состояться — пустой не обрывает серию
      else if (i > 0) break;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  _calShift(delta) {
    const m = this.calMonth + delta;
    this.calYear += Math.floor(m / 12);
    this.calMonth = ((m % 12) + 12) % 12;
    this._selectedDay = null;
    document.getElementById('dayCard').classList.add('hidden');
    this._renderStats();
  }

  // Карточка дня: то, чего раньше не было совсем — что именно
  // сделано в конкретный день
  _showDayCard(ds, keepOpen) {
    const box = document.getElementById('dayCard');
    if (this._selectedDay === ds && !keepOpen) {
      this._selectedDay = null;
      box.classList.add('hidden');
      document.querySelectorAll('.cal-day.selected').forEach(c => c.classList.remove('selected'));
      return;
    }
    this._selectedDay = ds;
    document.querySelectorAll('.cal-day').forEach(c => c.classList.remove('selected'));

    const workouts = (this._workoutsByDate || {})[ds] || [];
    const day = (this._daysByDate || {})[ds];
    const parts = [];

    workouts.forEach(w => {
      const prog = this.programs[w.program];
      const title = prog ? this._progName(prog) : w.program;
      const sets = (w.exercises || []).length;
      const byEx = {};
      (w.exercises || []).forEach(l => {
        (byEx[l.exerciseId] = byEx[l.exerciseId] || []).push(l);
      });
      const lines = Object.keys(byEx).map(id => {
        const ex = EXERCISE_DB[id];
        const name = ex ? (ex[this.currentLang] || ex.ru).name : id;
        const logs = byEx[id];
        const reps = logs.map(l => l.actualReps).join('/');
        const weight = logs.find(l => l.weight > 0);
        return `<div class="day-ex"><span>${this._esc(name)}</span>
          <span class="day-ex-num">${logs.length}×${this._esc(reps)}${weight ? ` · ${weight.weight} ${this.t.kg}` : ''}</span></div>`;
      }).join('');

      parts.push(`
        <div class="day-block">
          <div class="day-block-head">
            <span class="day-tag w">${this._esc(this.t.legendWorkout)}</span>
            <span class="day-block-title">${this._esc(title)}</span>
            ${w.partial ? `<span class="day-partial">${this._esc(this.t.partialMark)}</span>` : ''}
          </div>
          <div class="day-block-meta">${sets} ${this._esc(this.t.setsShort)} · ${w.durationMin} ${this._esc(this.t.min)}</div>
          ${lines}
        </div>`);
    });

    if (day && day.cardioMin) {
      parts.push(`<div class="day-block">
        <div class="day-block-head">
          <span class="day-tag c">${this._esc(this.t.legendCardio)}</span>
          <span class="day-block-title">${day.cardioMin} ${this._esc(this.t.min)}</span>
        </div></div>`);
    }

    if (day && day.eyes) {
      const at = day.eyesAt ? new Date(day.eyesAt) : null;
      const time = at ? `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}` : '';
      parts.push(`<div class="day-block">
        <div class="day-block-head">
          <span class="day-tag e">${this._esc(this.t.legendEyes)}</span>
          <span class="day-block-title">${this._esc(this.t.doneToday)}${time ? ` · ${time}` : ''}</span>
        </div></div>`);
    }

    const d = new Date(ds + 'T00:00:00');
    box.innerHTML = `
      <div class="day-card-head">
        <span>${d.getDate()} ${this._esc(this._monthNameGen(d.getMonth()))}, ${this._esc(this.t.weekdays[d.getDay()].toLowerCase())}</span>
        <button class="sheet-close" id="btnCloseDay" aria-label="Закрыть">✕</button>
      </div>
      ${parts.length ? parts.join('') : `<div class="day-empty">${this._esc(this.t.dayEmpty)}</div>`}`;
    box.classList.remove('hidden');
    const close = document.getElementById('btnCloseDay');
    if (close) close.onclick = () => {
      this._selectedDay = null;
      box.classList.add('hidden');
      document.querySelectorAll('.cal-day.selected').forEach(c => c.classList.remove('selected'));
    };

    // Подсветить выбранную клетку
    document.querySelectorAll('.cal-day').forEach(c => {
      const num = c.querySelector('.cal-num');
      if (num && Number(num.textContent) === d.getDate() && !c.classList.contains('empty')) {
        c.classList.add('selected');
      }
    });
  }

  _monthName(m) {
    const names = this.currentLang === 'en' 
      ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      : this.currentLang === 'ua'
      ? ['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру']
      : ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
    return names[m];
  }

  // Месяц в родительном падеже: «10 августа», а не «10 август».
  // В английском и украинском форма одна, поэтому там просто месяц.
  _monthNameGen(m) {
    if (this.currentLang !== 'ru') return this._monthName(m);
    return ['января','февраля','марта','апреля','мая','июня',
            'июля','августа','сентября','октября','ноября','декабря'][m];
  }

  // Кардио теперь действительно записывается: раньше кнопка просто
  // рисовала надпись, и минуты пропадали вместе с закрытием страницы
  async _logCardio() {
    const input = document.getElementById('cardioMinutesInput');
    const mins = parseInt(input.value, 10);
    if (!mins || mins <= 0) return;

    const key = dateKey();
    const day = await db.getDay(key).catch(() => null);
    const total = ((day && day.cardioMin) || 0) + mins;

    await db.mergeDay(key, { cardioMin: total })
      .catch(e => console.warn('[Cardio] запись не сохранилась:', e));

    document.getElementById('cardioLogStatus').textContent =
      `✓ ${total} ${this.t.min} ${this.t.today}`;
    input.value = '';
    this._renderHealth();
    this._renderStats();
  }

  async _exportCSV() {
    const workouts = await db.getAllWorkouts().catch(() => []);
    if (!workouts.length) { alert('Нет данных'); return; }
    const rows = ['Date,Program,Exercise,Set,Weight,Reps,RPE,Notes'];
    workouts.forEach(w => {
      w.exercises.forEach(ex => {
        rows.push(`${w.date},${w.program},${ex.exerciseId},${ex.set},${ex.weight},${ex.actualReps},${ex.rpe},"${(ex.notes||'').replace(/"/g,'""')}"`);
      });
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `golden-workout-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  /* ----- Settings ----- */
  _toggleSettings(show) {
    document.getElementById('settingsModal').classList.toggle('hidden', !show);
  }

  _saveSettings() {
    const s = {
      globalSets: parseInt(document.getElementById('inputGlobalSets').value) || 3,
      globalTempo: parseInt(document.getElementById('inputGlobalTempo').value) || 4,
      restSeconds: parseInt(document.getElementById('inputRestSeconds').value) || 90,
      breathMode: document.getElementById('selectBreath').value,
      countAloud: document.getElementById('setCountAloud').checked,
      voiceControlEnabled: document.getElementById('setVoiceControl').checked,
      reminderTime: document.getElementById('inputReminderTime').value || '09:00',
      lang: document.getElementById('selectLang').value
    };
    store.setState(s);
    db.set('settings', 'app', s).then(() => {
      this._toggleSettings(false);
      this._renderAll();
      if (this.speech) {
        // Голос нужен, если просят считать вслух или подсказывать дыхание
        this.speech.enabled = s.countAloud || s.breathMode !== 'off';
        this.speech.voiceCommandsEnabled = s.voiceControlEnabled;
        this.speech.lang = s.lang === 'ru' ? 'ru-RU' : s.lang === 'ua' ? 'uk-UA' : 'en-US';
      }
    });
  }

  _checkReminders() {
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    const s = store.getState();
    if (timeStr === s.reminderTime) {
      const day = now.getDay();
      const progKey = s.schedule[day] || 'fullbody';
      const progName = this.programs[progKey] ? this._progName(this.programs[progKey]) : progKey;
      document.getElementById('reminderText').textContent = this.t.reminderBanner(s.reminderTime, progName);
      document.getElementById('reminderBanner').classList.remove('hidden');
      if (this.speech) this.speech.speak(this.t.reminderBanner(s.reminderTime, progName).replace('⏰ ',''));
    }
  }

  _esc(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}
