class WorkoutEngine {
  constructor() {
    this.programKey = null;
    this.prog = null;
    this.exercises = [];
    this.currentExIndex = 0;
    this.currentSet = 1;
    this.logs = [];
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

  // Сколько подходов у упражнения по его номеру.
  // У разминки и заминки всегда один, у основных — по настройке объёма.
  setsForIndex(idx) {
    if (!this.withWarmup) return this.getEffectiveSets();
    const mainStart = WARMUP_EXERCISES.length;
    const mainEnd = this.exercises.length - COOLDOWN_EXERCISES.length;
    const isAccessory = idx < mainStart || idx >= mainEnd;
    return isAccessory ? 1 : this.getEffectiveSets();
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
      actualReps: data.actualReps || ex.reps,
      rpe: data.rpe || 7,
      notes: data.notes || '',
      timestamp: Date.now()
    });
  }

  nextSet() {
    const ex = this.getCurrentExercise();
    const totalSets = this.getEffectiveSets();
    const isAccessory = this.isWarmup() || this.isCooldown();
    const setsForThis = isAccessory ? 1 : totalSets;

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

  // partial — вышли из тренировки на середине. Такой день всё равно
  // считается сделанным: часть работы выполнена, и в календаре она
  // должна остаться.
  finish(partial = false) {
    this.phase = 'complete';
    const record = {
      date: dateKey(),
      program: this.programKey,
      startTime: this.startTime,
      endTime: Date.now(),
      durationMin: Math.round((Date.now() - this.startTime) / 60000),
      exercises: this.logs,
      volumeLevel: store.getState().volumeLevel,
      partial: !!partial
    };
    // База может быть недоступна (Safari в приватном режиме) — тренировку
    // тогда просто не запишем, но приложение падать не должно
    db.addWorkout(record).catch(e => console.warn('[Workout] запись не сохранилась:', e));
    /* Записанное из журнала убираем. Иначе следующий же переход —
       к другому упражнению, в глаза, на дорожку — видел те же подходы
       непустыми и записывал их ещё раз: один подход превращался в три
       одинаковые тренировки в календаре. В записи остаётся свой массив. */
    this.logs = [];
    return { phase: 'complete', record };
  }

  getCurrentState() {
    return {
      phase: this.phase,
      exercise: this.getCurrentExercise(),
      set: this.currentSet,
      totalSets: this.isWarmup() || this.isCooldown() ? 1 : this.getEffectiveSets(),
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

/* Отдых после подхода. Свой у каждого упражнения: суставной хватает
   полминуты, тяжёлому нужно две. В плане недели уровень его растягивает
   или сжимает: новичку дольше — дыхание ещё не поставлено, опытному
   короче — нужна плотность. */
function restSecondsFor(ex, prog) {
  const lvl = prog && prog.level && typeof LEVELS !== 'undefined' ? LEVELS[prog.level] : null;
  // До пяти секунд: «115», а не «113» — так отдых и читается, и помнится
  return Math.round(ex.rest * ((lvl && lvl.restMul) || 1) / 5) * 5;
}
