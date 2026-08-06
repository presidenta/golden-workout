async function bootstrap() {
  try {
    await db.init();

    // Load persisted settings
    const saved = await db.get('settings', 'app');
    if (saved && saved.value) {
      store.setState(saved.value);
    }

    // Load persisted schedule
    const sched = await db.get('settings', 'schedule');
    if (sched && sched.value) {
      store.setState({ schedule: sched.value });
    }

    const state = store.getState();
    const lang = state.lang || 'ru';
    const speech = new SpeechController(lang === 'ru' ? 'ru-RU' : lang === 'ua' ? 'uk-UA' : 'en-US');
    speech.enabled = state.voiceEnabled !== false;
    speech.voiceCommandsEnabled = !!state.voiceControlEnabled;

    const engine = new WorkoutEngine();
    const ui = new UI(I18N);
    await ui.init({ speech, engine });

    // Restore volume UI
    document.querySelectorAll('.vol-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.vol === state.volumeLevel);
    });

    // Restore settings form values
    document.getElementById('inputGlobalSets').value = state.globalSets;
    document.getElementById('inputGlobalTempo').value = state.globalTempo;
    document.getElementById('inputRestSeconds').value = state.restSeconds;
    document.getElementById('setVoice').checked = state.voiceEnabled !== false;
    document.getElementById('setVoiceControl').checked = !!state.voiceControlEnabled;
    document.getElementById('inputReminderTime').value = state.reminderTime || '09:00';
    document.getElementById('selectLang').value = lang;

    console.log('[Golden Workout] Initialized v4.0');
  } catch (err) {
    console.error('[Golden Workout] Bootstrap failed:', err);
    alert('Ошибка инициализации: ' + err.message);
  }
}

// Register Service Worker (with fallback for file://)
try {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err));
  }
} catch (err) {
  console.warn('[SW] Service Worker not available (file://?):', err);
}

// Prevent zoom on double-tap for PWA feel
document.addEventListener('dblclick', (e) => {
  if (e.target.closest('.btn-gold, .icon-btn, .exercise-item')) {
    e.preventDefault();
  }
}, { passive: false });

bootstrap();
