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
      voiceEnabled: true,
      voiceControlEnabled: false,
      reminderTime: '09:00',
      schedule: { 0: 'goltis', 1: 'fullbody', 2: 'glutes', 3: 'arms_chest', 4: 'cardio_core', 5: 'fullbody', 6: 'glutes' },
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

export const store = new Store();
