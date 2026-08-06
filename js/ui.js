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
    ['workout', 'constructor', 'schedule', 'stats'].forEach(t => {
      document.getElementById('tabContent' + this._cap(t)).classList.toggle('hidden', t !== tabId);
    });
    if (tabId === 'stats') this._renderStats();
  }

  _cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  _renderAll() {
    document.getElementById('ui_subtitle').textContent = this.t.subtitle;
    document.getElementById('tabBtnWorkout').textContent = this.t.tabs.workout;
    document.getElementById('tabBtnConstructor').textContent = this.t.tabs.constructor;
    document.getElementById('tabBtnSchedule').textContent = this.t.tabs.schedule;
    document.getElementById('tabBtnStats').textContent = this.t.tabs.stats;
    document.getElementById('ui_set_title').textContent = this.t.settings;
    document.getElementById('btnStartNext').textContent = this.t.start;
    document.getElementById('actionBtn').textContent = this.t.start;
    document.getElementById('btnExportCSV').textContent = this.t.exportCSV;
    document.getElementById('btnFinishSession').textContent = this.t.finishWorkout;
    document.querySelector('[data-vol="min"]').textContent = this.t.volume.min;
    document.querySelector('[data-vol="norm"]').textContent = this.t.volume.norm;
    document.querySelector('[data-vol="max"]').textContent = this.t.volume.max;
    this._renderPrograms();
    this._renderPlanList();
    this._renderConstructor();
    this._renderSchedule();
    this._renderStats();
  }

  _renderPrograms() {
    const box = document.getElementById('programChips');
    box.innerHTML = '';
    Object.keys(this.programs).forEach(key => {
      const chip = document.createElement('div');
      chip.className = 'prog-chip' + (store.getState().currentProgram === key ? ' active' : '');
      chip.textContent = this.programs[key].name;
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
      item.onclick = () => this._startExercise(idx);
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

  _startExercise(index) {
    const state = store.getState();
    this.engine.start(state.currentProgram, true);
    // advance to selected exercise
    while (this.engine.currentExIndex < index && this.engine.phase !== 'complete') {
      this.engine.nextExercise();
    }
    this._showWorkoutScreen();
    this._refreshWorkoutUI();
  }

  _startNext() {
    const prog = this.programs[store.getState().currentProgram];
    const firstIdx = 0;
    this._startExercise(firstIdx);
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

    const tick = () => {
      this.currentRep++;
      const rep = this.currentRep;
      document.getElementById('repDisplay').textContent = rep;
      this._updateSetProgress();
      if (this.speech) this.speech.speak(String(rep));

      // Inhale
      setTimeout(() => {
        document.getElementById('phaseDisplay').textContent = this.t.inhale;
        document.getElementById('breathOverlayText').textContent = this.t.inhale;
        document.getElementById('breathOverlay').className = 'breath-overlay show inhale';
        document.getElementById('counterCircle').className = 'counter-circle state-inhale';
        this._showFrame(0);
        if (this.speech && store.getState().voiceEnabled) this.speech.speak(this.t.inhale);
      }, 400);

      // Exhale
      setTimeout(() => {
        document.getElementById('phaseDisplay').textContent = this.t.exhale;
        document.getElementById('breathOverlayText').textContent = this.t.exhale;
        document.getElementById('breathOverlay').className = 'breath-overlay show exhale';
        document.getElementById('counterCircle').className = 'counter-circle state-exhale';
        this._showFrame(1);
        if (this.speech && store.getState().voiceEnabled) this.speech.speak(this.t.exhale);
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

  /* ----- Анимация упражнения -----
     Кадров два: начало и конец движения. Чередуя их, получаем анимацию.
     Пока идёт подход, кадры переключаются по командам «вдох» и «выдох»,
     то есть в темпе самого упражнения. В покое — сами по себе. */

  _setFrames(ex) {
    const img = document.getElementById('activeMediaImg');
    const box = img.parentElement;
    const oldFb = box.querySelector('.img-fallback');
    if (oldFb) oldFb.remove();

    this.frames = (ex && ex.frames) || [];
    this.frameIndex = 0;

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
        opts += `<option value="${pk}" ${sched[idx] === pk ? 'selected' : ''}>${this.programs[pk].name}</option>`;
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
      voiceEnabled: document.getElementById('setVoice').checked,
      voiceControlEnabled: document.getElementById('setVoiceControl').checked,
      reminderTime: document.getElementById('inputReminderTime').value || '09:00',
      lang: document.getElementById('selectLang').value
    };
    store.setState(s);
    db.set('settings', 'app', s).then(() => {
      this._toggleSettings(false);
      this._renderAll();
      if (this.speech) {
        this.speech.enabled = s.voiceEnabled;
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
      const progName = this.programs[progKey] ? this.programs[progKey].name : progKey;
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
