/* НАСТРОЙКА УПРАЖНЕНИЯ (сборка 42): свои подходы, повторы и темп у каждого упражнения.

   Владелец 07.11.2026: «делаю доску синюю — грудь, отжимаюсь двадцать раз, а забито двенадцать, и я не
   знаю, где поменять; пока он считает двенадцать, я уже двадцать отжался — нужна скорость; общая
   настройка неправильная, нужна своя в каждом упражнении, логично и легко».

   Числа хранит state.exerciseSettings = { id: { sets, reps, tempo } } — в той же записи настроек, что
   уходит на сервер. Считают по ним движок и счёт: repsFor, tempoFor, setsFor в js/workout.js. Здесь —
   только окно: открыть, показать действующие числа, сохранить своё или вернуть общее.

   Снаружи: GFExerciseSettings.start({ ui }) из app.js; кнопки в разметке — #btnExSettings (экран подхода)
   и #btnPreviewSettings (карточка упражнения). */

const GES_LIMITS = {
  sets: { min: 1, max: 10, step: 1 },
  reps: { min: 1, max: 300, step: 1 },
  hold: { min: 5, max: 600, step: 5 },
  tempo: { min: 1, max: 8, step: 0.5 }
};

function gesEl(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) node[k] = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  children.flat().filter(c => c !== null && c !== undefined && c !== false).forEach(c => node.append(c));
  return node;
}

// 2.5 → «2,5» по-русски и по-украински
function gesNum(n) {
  const lang = store.getState().lang || 'ru';
  return lang === 'en' ? String(n) : String(n).replace('.', ',');
}

const GFExerciseSettings = {
  _ui: null,
  _modal: null,

  start({ ui }) {
    this._ui = ui;
    const workoutBtn = document.getElementById('btnExSettings');
    if (workoutBtn) workoutBtn.addEventListener('click', () => this._openForWorkout());
    const previewBtn = document.getElementById('btnPreviewSettings');
    if (previewBtn) previewBtn.addEventListener('click', () => this._openForPreview());
    this.refresh();
  },

  // Упражнение на экране подхода — и его подходы с учётом разминки
  _openForWorkout() {
    const engine = this._ui && this._ui.engine;
    const ex = engine && engine.exercises && engine.getCurrentExercise();
    if (!ex) return;
    this.open(ex, engine.setsForIndex(engine.currentExIndex));
  },

  _openForPreview() {
    const ui = this._ui;
    const prog = ui && ui.programs[store.getState().currentProgram];
    const ex = prog && EXERCISE_DB[prog.exercises[ui.previewIndex]];
    if (ex) this.open(ex, setsFor(ex, prog));
  },

  _isHold(ex) { return ex.breath === 'static'; },

  /**
   * Открыть окно для упражнения.
   * @param {object} ex упражнение из EXERCISE_DB
   * @param {number} sets сколько подходов действует сейчас (у разминки — свои правила)
   */
  open(ex, sets) {
    const t = gesText();
    const loc = ex[store.getState().lang || 'ru'] || ex.ru;
    const own = (store.getState().exerciseSettings || {})[ex.id] || null;
    const hold = this._isHold(ex);
    const values = { sets, reps: repsFor(ex), tempo: tempoFor(ex) };

    const row = (key, label, limits, unit) => {
      const input = gesEl('input', {
        class: 'ges-input', type: 'number', inputmode: 'decimal',
        min: String(limits.min), max: String(limits.max), step: String(limits.step), 'aria-label': label
      });
      input.value = String(values[key]);
      const clamp = v => {
        const n = Math.round((Number(String(v).replace(',', '.')) || limits.min) / limits.step) * limits.step;
        return Math.min(limits.max, Math.max(limits.min, n));
      };
      const shift = d => { values[key] = clamp(Number(input.value) + d * limits.step); input.value = String(values[key]); };
      input.addEventListener('change', () => { values[key] = clamp(input.value); input.value = String(values[key]); });
      return gesEl('div', { class: 'ges-row' },
        gesEl('div', { class: 'ges-label' }, label, unit ? gesEl('span', { class: 'ges-unit', text: `, ${unit}` }) : null),
        gesEl('div', { class: 'ges-stepper' },
          gesEl('button', { class: 'ges-step', type: 'button', 'aria-label': '−', text: '−', onclick: () => shift(-1) }),
          input,
          gesEl('button', { class: 'ges-step', type: 'button', 'aria-label': '+', text: '+', onclick: () => shift(1) })));
    };

    const sheet = gesEl('div', { class: 'ges-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': t.title },
      gesEl('button', { class: 'modal-close', type: 'button', 'aria-label': t.close, text: '✕', onclick: () => this.close() }),
      gesEl('div', { class: 'ges-title', text: t.title }),
      gesEl('div', { class: 'ges-name', text: loc.name }),
      gesEl('div', { class: 'ges-state', text: own ? t.own : t.general }),
      row('sets', t.sets, GES_LIMITS.sets),
      row('reps', hold ? t.hold : t.reps, hold ? GES_LIMITS.hold : GES_LIMITS.reps),
      hold ? null : row('tempo', t.tempo, GES_LIMITS.tempo, t.sec),
      hold ? null : gesEl('div', { class: 'ges-hint', text: t.tempoHint }),
      gesEl('button', { class: 'btn-gold', type: 'button', text: t.save, onclick: () => this._save(ex, values) }),
      own ? gesEl('button', { class: 'btn-gold btn-secondary', type: 'button', text: t.reset, onclick: () => this._save(ex, null) }) : null);

    this.close();
    this._modal = gesEl('div', { class: 'ges-overlay', onclick: e => { if (e.target === this._modal) this.close(); } }, sheet);
    document.body.appendChild(this._modal);
  },

  isOpen() { return !!this._modal; },

  close() {
    if (!this._modal) return false;
    this._modal.remove();
    this._modal = null;
    return true;
  },

  // values === null — вернуть общие числа: своё убирается совсем
  _save(ex, values) {
    const all = { ...(store.getState().exerciseSettings || {}) };
    if (values) {
      const own = { sets: values.sets, reps: values.reps };
      if (!this._isHold(ex)) own.tempo = values.tempo;
      all[ex.id] = own;
    } else {
      delete all[ex.id];
    }
    store.setState({ exerciseSettings: all });
    if (this._ui) {
      this._ui._persistSettings({ exerciseSettings: all });
      this._ui._exerciseSettingsChanged();
    }
    this.close();
  },

  /* Подписи кнопок: на экране подхода — действующие числа «3 × 20 · 2,5 с» (нажатие — поменять), в карточке —
     словами. Зовёт ui при каждом новом упражнении и после сохранения. */
  refresh() {
    const t = gesText();
    const preview = document.getElementById('btnPreviewSettings');
    if (preview) {
      preview.querySelector('.ges-link-text').textContent = t.previewOpen;
      preview.setAttribute('aria-label', t.open);
    }
    const btn = document.getElementById('btnExSettings');
    const engine = this._ui && this._ui.engine;
    const ex = engine && engine.exercises && engine.getCurrentExercise();
    if (!btn || !ex) return;
    const sets = engine.setsForIndex(engine.currentExIndex);
    const tempo = this._isHold(ex) ? '' : ` · ${gesNum(tempoFor(ex))} ${t.sec}`;
    btn.querySelector('.ges-badge-text').textContent = `${sets} × ${repsFor(ex)}${tempo}`;
    btn.classList.toggle('own', !!(store.getState().exerciseSettings || {})[ex.id]);
    btn.setAttribute('aria-label', t.open);
    btn.title = t.open;
  }
};
