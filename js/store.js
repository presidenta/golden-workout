class Store {
  constructor() {
    this.state = {
      lang: 'ru',
      currentTab: 'workout',
      currentProgram: 'fullbody',
      volumeLevel: 'norm',
      globalSets: 3,
      globalTempo: 4,
      restSeconds: 90,
      // Подсказки дыхания: 'inhale' — только вдох, 'both' — вдох и выдох,
      // 'off' — молча. Выдох очевиден сам по себе, поэтому по умолчанию
      // произносится только вдох.
      breathMode: 'inhale',
      countAloud: true,
      voiceControlEnabled: false,
      reminderTime: '09:00',
      schedule: { 0: 'goltis', 1: 'fullbody', 2: 'glutes', 3: 'arms_chest', 4: 'cardio_core', 5: 'fullbody', 6: 'glutes' },
      // Уровень подготовки: от него зависит и объём, и то, какие
      // упражнения генератор вообще предложит.
      level: 'beginner',
      // Выбранная методика недели (ключ из METHODS) или null, если
      // человек ведёт расписание вручную.
      planMethod: null,
      // Гимнастика для глаз: длительность шагов и настрои вслух
      eyesLevel: 'normal',
      eyesAffirmations: true,
      // Беговая дорожка: на какой неделе плана человек сейчас
      treadmillWeek: 1,
      // Кардио: сколько минут длится занятие по таймеру
      cardioMinutes: 30,
      // Программы — стандартные, собранные генератором и созданные
      // в конструкторе. Наполняется из UI, отсюда их берёт
      // WorkoutEngine при старте.
      programs: {},
      currentWorkout: null,
      theme: 'dark'
    };
    this.listeners = new Set();
  }

  getState() { return Object.freeze({ ...this.state }); }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setState(patch) {
    this.state = { ...this.state, ...patch };
    this._notify();
  }

  _notify() {
    const s = this.getState();
    this.listeners.forEach(fn => { try { fn(s); } catch(e) { console.error(e); } });
  }
}

const store = new Store();

/* Дата в виде YYYY-MM-DD по местному времени.
   toISOString() отдаёт UTC — у того, кто занимается поздно вечером или
   рано утром, запись уезжала в соседний день, и календарь показывал
   тренировку не там, где она была. */
function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
