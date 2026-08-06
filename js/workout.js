class WorkoutEngine {
  constructor() {
    this.programKey = null;
    this.exercises = [];
    this.currentExIndex = 0;
    this.currentSet = 1;
    this.logs = [];
    this.phase = 'idle'; // idle, warmup, exercise, rest, cooldown, complete
    this.startTime = null;
  }

  start(programKey, withWarmup = true) {
    this.programKey = programKey;
    const prog = store.getState().programs[programKey] || DEFAULT_PROGRAMS[programKey] || DEFAULT_PROGRAMS.fullbody;
    const mainExercises = prog.exercises.map(id => EXERCISE_DB[id]).filter(Boolean);

    this.exercises = withWarmup 
      ? [...WARMUP_EXERCISES.map(id => EXERCISE_DB[id]).filter(Boolean), ...mainExercises, ...COOLDOWN_EXERCISES.map(id => EXERCISE_DB[id]).filter(Boolean)]
      : mainExercises;

    this.currentExIndex = 0;
    this.currentSet = 1;
    this.logs = [];
    this.startTime = Date.now();
    this.phase = withWarmup ? 'warmup' : 'exercise';

    store.setState({
      currentWorkout: {
        program: programKey,
        startTime: this.startTime,
        activeExIndex: 0,
        activeSet: 1,
        phase: this.phase
      }
    });
    return this.getCurrentState();
  }

  getCurrentExercise() {
    return this.exercises[this.currentExIndex];
  }

  getEffectiveSets() {
    const s = store.getState();
    let base = s.globalSets;
    if (s.volumeLevel === 'min') return Math.max(1, base - 1);
    if (s.volumeLevel === 'max') return base + 2;
    return base;
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
      this._syncState();
      return { phase: 'rest', nextPhase: 'exercise', exercise: ex, nextSet: this.currentSet, restSeconds: ex.rest };
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

    this._syncState();
    return { phase: this.phase, exercise: ex, set: 1 };
  }

  skipRest() {
    this._syncState();
    return { phase: this.phase, exercise: this.getCurrentExercise(), set: this.currentSet };
  }

  finish() {
    this.phase = 'complete';
    const record = {
      date: new Date().toISOString().split('T')[0],
      program: this.programKey,
      startTime: this.startTime,
      endTime: Date.now(),
      durationMin: Math.round((Date.now() - this.startTime) / 60000),
      exercises: this.logs,
      volumeLevel: store.getState().volumeLevel
    };
    db.addWorkout(record);
    store.setState({ currentWorkout: null });
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

  _syncState() {
    store.setState({
      currentWorkout: {
        ...store.getState().currentWorkout,
        activeExIndex: this.currentExIndex,
        activeSet: this.currentSet,
        phase: this.phase
      }
    });
  }

  getPreviousResult(exerciseId) {
    // Return last logged set for this exercise from previous workouts
    return this.logs.filter(l => l.exerciseId === exerciseId).pop() || null;
  }
}
