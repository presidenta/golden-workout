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
    this._renderAll();
    store.subscribe((s) => this._onStateChange(s));
    this._checkReminders();
    setInterval(() => this._checkReminders(), 30000);
    if (this.speech) {
      this.speech.initRecognition();
      this.speech.onCommand = (cmd) => this._onVoiceCommand(cmd);
    }
  }

  async _loadPrograms() {
    try {
      const progs = await db.getAll('programs');
      progs.forEach(p => { this.programs[p.id] = p; });
    } catch (e) {
      console.warn('[UI] Failed to load custom programs:', e);
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

    // Tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => this._switchTab(e.target.dataset.tab));
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

    // Constructor
    on('btnSaveCustom', 'click', () => this._saveCustomProgram());

    // Schedule
    on('btnSaveSchedule', 'click', () => this._saveSchedule());

    // Stats
    on('btnLogCardio', 'click', () => this._logCardio());
    on('btnExportCSV', 'click', () => this._exportCSV());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (document.getElementById('screenWorkout').classList.contains('hidden')) return;
      if (e.code === 'Space') { e.preventDefault(); this._handleAction(); }
      if (e.code === 'Escape') this._exitWorkout();
    });
  }

  _switchTab(tabId) {
    store.setState({ currentTab: tabId });
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    ['workout', 'constructor', 'treadmill', 'schedule', 'stats'].forEach(t => {
      document.getElementById('tabContent' + this._cap(t)).classList.toggle('hidden', t !== tabId);
    });
    if (tabId === 'stats') this._renderStats();
  }

  _cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

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
    document.getElementById('tabBtnWorkout').textContent = this.t.tabs.workout;
    document.getElementById('tabBtnConstructor').textContent = this.t.tabs.constructor;
    document.getElementById('tabBtnTreadmill').textContent = this.t.tabs.treadmill;
    document.getElementById('tabBtnSchedule').textContent = this.t.tabs.schedule;
    document.getElementById('tabBtnStats').textContent = this.t.tabs.stats;
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
    this._renderStats();
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

  _renderPrograms() {
    const box = document.getElementById('programChips');
    box.innerHTML = '';
    Object.keys(this.programs).forEach(key => {
      const chip = document.createElement('div');
      chip.className = 'prog-chip' + (store.getState().currentProgram === key ? ' active' : '');
      chip.textContent = this._progName(this.programs[key]);
      chip.onclick = () => { store.setState({ currentProgram: key }); this._renderPrograms(); this._renderPlanList(); };
      box.appendChild(chip);
    });
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
    if (this.speech && store.getState().voiceControlEnabled) this.speech.startListening();
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
      this.currentRep++;
      const rep = this.currentRep;
      document.getElementById('repDisplay').textContent = rep;
      this._updateSetProgress();
      if (this.speech && st.countAloud !== false) this.speech.speak(String(rep));

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
      }, 400);

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
  static get BOARD_SLOTS() {
    return {
      blue:     { l: 6.7,  r: 93.3, y: 48.5, c: '#4a90e2' },  // синяя зона, средний ряд
      blueWide: { l: 4.7,  r: 95.3, y: 19.9, c: '#4a90e2' },  // синяя зона, крайние верхние
      red:      { l: 31.7, r: 68.3, y: 27.6, c: '#e74c3c' },  // на красной стрелке
      green:    { l: 38.2, r: 61.8, y: 48.5, c: '#2ecc71' },  // на зелёных стрелках
      yellow:   { l: 40.5, r: 59.5, y: 76.5, c: '#e8c400' }   // в жёлтой зоне, внизу
    };
  }

  // Фотография доски: в нужные гнёзда пририсованы сами ручки,
  // повёрнутые так, как их надо поставить.
  _boardPhoto(board) {
    if (!board) return '';
    const s = UI.BOARD_SLOTS[board.slot || board.color];
    if (!s) return '';
    const cls = board.grip === 'across' ? 'across' : 'along';
    const mark = (left) => `
      <span class="board-mark ${cls}" style="left:${left}%; top:${s.y}%; --mc:${s.c};">
        <span class="board-handle"></span>
      </span>`;
    return `
      <div class="board-photo">
        <img src="assets/board/board.jpg" alt="">
        ${mark(s.l)}${mark(s.r)}
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
    this._stopFrameLoop();
    document.getElementById('screenWorkout').classList.add('hidden');
    document.getElementById('restScreen').classList.add('hidden');
    document.getElementById('screenPlan').classList.remove('hidden');
    this._hideSessionProgress();
    if (this.speech) this.speech.stopListening();
  }

  _onVoiceCommand(cmd) {
    if (cmd === 'start') this._handleAction();
    else if (cmd === 'pause') this._pauseRepTimer();
    else if (cmd === 'complete') this._finishSet();
    else if (cmd === 'rest') this._skipRest();
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
    db.set('programs', id, prog).then(() => {
      store.setState({ programs: this.programs, currentProgram: id });
      this._renderPrograms();
      this._renderPlanList();
      this._switchTab('workout');
    });
  }

  /* ----- Schedule ----- */
  _renderSchedule() {
    const box = document.getElementById('scheduleList');
    box.innerHTML = '';
    const days = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
    const tdays = this.currentLang === 'en' 
      ? ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
      : this.currentLang === 'ua' ? ['Неділя','Понеділок','Вівторок','Середа','Четвер',"П'ятниця",'Субота']
      : days;
    const sched = store.getState().schedule;
    tdays.forEach((dayName, idx) => {
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
    store.setState({ schedule: s });
    db.set('settings', 'schedule', s).then(() => alert('Расписание сохранено'));
  }

  /* ----- Stats ----- */
  async _renderStats() {
    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth();
    document.getElementById('statsMonthTitle').textContent = `${this._monthName(month)} ${year}`;
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    const totalDays = new Date(year, month + 1, 0).getDate();
    let streak = 0, maxStreak = 0;
    const workouts = await db.getAllWorkouts().catch(() => []);
    const dateMap = {};
    workouts.forEach(w => { dateMap[w.date] = w; });

    for (let d = 1; d <= totalDays; d++) {
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      if (dateMap[ds]) { cell.classList.add('completed'); streak++; maxStreak = Math.max(maxStreak, streak); }
      else { cell.classList.add('missed'); streak = 0; }
      if (d === now.getDate()) cell.classList.add('today');
      cell.innerHTML = `<div>${d}</div>`;
      grid.appendChild(cell);
    }
    document.getElementById('statsStreak').textContent = `${this.t.streak}: ${maxStreak} ${this.t.days}`;

    // Weight progress (simple text list)
    const chart = document.getElementById('weightProgressChart');
    const last5 = workouts.slice(-5);
    if (!last5.length) { chart.textContent = this.t.noData; return; }
    chart.innerHTML = last5.map(w => {
      const totalVol = w.exercises.reduce((sum, ex) => sum + (ex.weight * ex.actualReps), 0);
      return `<div style="margin-bottom:4px;">${w.date}: ${totalVol} ${this.t.kg}·${this.t.reps}</div>`;
    }).join('');
  }

  _monthName(m) {
    const names = this.currentLang === 'en' 
      ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      : this.currentLang === 'ua'
      ? ['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру']
      : ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
    return names[m];
  }

  _logCardio() {
    const mins = document.getElementById('cardioMinutesInput').value;
    if (!mins) return;
    document.getElementById('cardioLogStatus').textContent = `✓ ${mins} мин`;
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
