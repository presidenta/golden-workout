class WorkoutEngine {
  constructor() {
    this.programKey = null;
    this.prog = null;
    this.exercises = [];
    this.currentExIndex = 0;
    this.currentSet = 1;
    this.logs = [];
    this._record = null;   // запись этой тренировки в базе — после первого подхода
    this.phase = 'idle'; // idle, warmup, exercise, rest, cooldown, complete
    this.startTime = null;
  }

  start(programKey, withWarmup = true) {
    this.programKey = programKey;
    // programs может быть пустым — тогда берём стандартную программу.
    const known = store.getState().programs || {};
    const prog = known[programKey] || DEFAULT_PROGRAMS[programKey] || DEFAULT_PROGRAMS.fullbody;
    this.prog = prog;
    const mainExercises = prog.exercises.map(id => EXERCISE_DB[id]).filter(Boolean);

    this.exercises = withWarmup 
      ? [...WARMUP_EXERCISES.map(id => EXERCISE_DB[id]).filter(Boolean), ...mainExercises, ...COOLDOWN_EXERCISES.map(id => EXERCISE_DB[id]).filter(Boolean)]
      : mainExercises;

    this.withWarmup = withWarmup;
    this.currentExIndex = 0;
    this.currentSet = 1;
    this.logs = [];
    this._record = null;
    this.startTime = Date.now();
    this.phase = withWarmup ? 'warmup' : 'exercise';
    return this.getCurrentState();
  }

  getCurrentExercise() {
    return this.exercises[this.currentExIndex];
  }

  getEffectiveSets() {
    return effectiveSets(this.prog);
  }

  // Отдых после подхода текущего упражнения — с поправкой плана
  getRestSeconds(ex = this.getCurrentExercise()) {
    return ex ? restSecondsFor(ex, this.prog) : 60;
  }

  // Сколько упражнений занимает разминка в общем списке.
  // Нужно, чтобы номер упражнения из плана совпал с номером в движке.
  warmupCount() {
    if (!this.withWarmup) return 0;
    return WARMUP_EXERCISES.map(id => EXERCISE_DB[id]).filter(Boolean).length;
  }

  /* ----- Общий объём тренировки ----- */

  // Сколько подходов у упражнения по его номеру. У разминки и заминки один, у основных — по настройке
  // объёма; своё число упражнения (сборка 42) — поверх того и другого.
  setsForIndex(idx) {
    const mainStart = WARMUP_EXERCISES.length;
    const mainEnd = this.exercises.length - COOLDOWN_EXERCISES.length;
    const isAccessory = this.withWarmup && (idx < mainStart || idx >= mainEnd);
    return setsFor(this.exercises[idx], this.prog, isAccessory);
  }

  // Всего подходов за тренировку — с разминкой и заминкой.
  getTotalSets() {
    let total = 0;
    for (let i = 0; i < this.exercises.length; i++) total += this.setsForIndex(i);
    return total;
  }

  // Сколько уже позади. Текущий подход считается невыполненным,
  // пока его не закрыли.
  getCompletedSets() {
    let done = 0;
    for (let i = 0; i < this.currentExIndex; i++) done += this.setsForIndex(i);
    return done + (this.currentSet - 1);
  }

  isWarmup() {
    return this.phase === 'warmup';
  }

  isCooldown() {
    return this.phase === 'cooldown';
  }

  logSet(data) {
    const ex = this.getCurrentExercise();
    if (!ex) return;
    this.logs.push({
      exerciseId: ex.id,
      set: this.currentSet,
      weight: data.weight || 0,
      actualReps: data.actualReps || repsFor(ex),
      rpe: data.rpe || 7,
      notes: data.notes || '',
      timestamp: Date.now()
    });
  }

  nextSet() {
    const ex = this.getCurrentExercise();
    const setsForThis = this.setsForIndex(this.currentExIndex);

    if (this.currentSet < setsForThis) {
      this.currentSet++;
      return { phase: 'rest', nextPhase: 'exercise', exercise: ex, nextSet: this.currentSet };
    } else {
      return this.nextExercise();
    }
  }

  nextExercise() {
    this.currentExIndex++;
    this.currentSet = 1;

    if (this.currentExIndex >= this.exercises.length) {
      return this.finish();
    }

    const ex = this.getCurrentExercise();
    // Detect phase transitions
    const mainStart = WARMUP_EXERCISES.length;
    const mainEnd = this.exercises.length - COOLDOWN_EXERCISES.length;

    if (this.currentExIndex < mainStart) this.phase = 'warmup';
    else if (this.currentExIndex >= mainEnd) this.phase = 'cooldown';
    else this.phase = 'exercise';

    return { phase: this.phase, exercise: ex, set: 1 };
  }

  /* Записать сделанное в календарь. Зовётся после каждого законченного
     подхода, а не только в конце: раньше подходы копились в памяти, и
     закрытое посреди тренировки приложение теряло их все. Первый подход
     создаёт запись, следующие дополняют её же — в календаре одна
     тренировка, сколько бы раз её ни сохраняли. Пока тренировка идёт,
     запись помечена недоделанной: закроют приложение — так и останется. */
  save(partial = true) {
    if (!this._record) this._record = { uid: newUid(), id: null, date: dateKey() };
    // Своя у каждой тренировки: запоздавшая запись прошлой пишет в прошлую
    const session = this._record;
    const record = {
      uid: session.uid,
      date: session.date,
      program: this.programKey,
      startTime: this.startTime,
      endTime: Date.now(),
      durationMin: Math.round((Date.now() - this.startTime) / 60000),
      exercises: [...this.logs],
      volumeLevel: store.getState().volumeLevel,
      partial: !!partial
    };
    const write = () => session.id === null
      ? db.addWorkout({ ...record }).then(id => { session.id = id; })
      : db.putWorkout({ ...record, id: session.id });
    /* Пишем сразу: календарь и статистику перерисовывают следом, и они
       должны уже видеть этот подход. Ждём, только пока в пути первая
       запись, — без её номера дополнить нечего. База может быть
       недоступна (Safari в приватном режиме) — тренировку тогда просто
       не запишем, но приложение падать не должно. */
    const run = session.busy ? session.busy.then(write) : write();
    const done = run
      .catch(e => console.warn('[Workout] запись не сохранилась:', e))
      .then(() => { if (session.busy === done) session.busy = null; });
    session.busy = done;
    return record;
  }

  // partial — вышли из тренировки на середине. Такой день всё равно
  // считается сделанным: часть работы выполнена, и в календаре она
  // должна остаться.
  finish(partial = false) {
    this.phase = 'complete';
    const record = this.save(partial);
    /* Записанное из журнала убираем. Иначе следующий же переход —
       к другому упражнению, в глаза, на дорожку — видел те же подходы
       непустыми и записывал их ещё раз: один подход превращался в три
       одинаковые тренировки в календаре. В записи остаётся свой массив. */
    this.logs = [];
    this._record = null;
    return { phase: 'complete', record };
  }

  getCurrentState() {
    return {
      phase: this.phase,
      exercise: this.getCurrentExercise(),
      set: this.currentSet,
      totalSets: this.setsForIndex(this.currentExIndex),
      progress: `${this.currentExIndex + 1}/${this.exercises.length}`
    };
  }
}

/* Сколько подходов у рабочего упражнения программы. У программ плана
   недели объём свой: его задают уровень и день — новичку два подхода,
   опытному четыре, лёгкий день в один. Раньше тренировка всегда шла по
   общей цифре из настроек, и план, где написано «1 подх.», давал три.
   У готовых и своих комплексов — общая цифра. «Мин/Макс» — поверх. */
function effectiveSets(prog, s = store.getState()) {
  const base = (prog && prog.sets) || s.globalSets;
  if (s.volumeLevel === 'min') return Math.max(1, base - 1);
  if (s.volumeLevel === 'max') return base + 2;
  return base;
}

/* СВОИ ЧИСЛА У КАЖДОГО УПРАЖНЕНИЯ (сборка 42).

   Владелец 07.11.2026: «делаю доску синюю — грудь, отжимаюсь двадцать, а там забито двенадцать, и
   поменять негде; общая настройка неправильная — нужна своя в каждом упражнении: подходы, повторы,
   скорость». Свои числа лежат в настройках (exerciseSettings: { id: { sets, reps, tempo } }) и уходят на
   сервер вместе с остальными. Чего у упражнения своего нет — берётся как прежде: повторы из описания
   упражнения, подходы из программы и объёма, темп общий. Окно правки — js/exercise-settings/. */
function exerciseOwn(ex, s = store.getState()) {
  return (ex && s.exerciseSettings && s.exerciseSettings[ex.id]) || {};
}

// Повторы (у статики — секунды удержания)
function repsFor(ex, s = store.getState()) {
  return exerciseOwn(ex, s).reps || (ex ? ex.reps : 0);
}

// Секунд на одно повторение: с этим шагом идут счёт и «вдох»
function tempoFor(ex, s = store.getState()) {
  return exerciseOwn(ex, s).tempo || s.globalTempo || 4;
}

// Подходы: своё число упражнения, иначе один у разминки и заминки, иначе по программе и объёму
function setsFor(ex, prog, isAccessory = false, s = store.getState()) {
  return exerciseOwn(ex, s).sets || (isAccessory ? 1 : effectiveSets(prog, s));
}

/* Отдых после подхода. Свой у каждого упражнения: суставной хватает
   полминуты, тяжёлому нужно две. В плане недели уровень его растягивает
   или сжимает: новичку дольше — дыхание ещё не поставлено, опытному
   короче — нужна плотность. */
function restSecondsFor(ex, prog) {
  const lvl = prog && prog.level && typeof LEVELS !== 'undefined' ? LEVELS[prog.level] : null;
  // До пяти секунд: «115», а не «113» — так отдых и читается, и помнится
  return Math.round(ex.rest * ((lvl && lvl.restMul) || 1) / 5) * 5;
}
