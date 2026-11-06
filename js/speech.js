class SpeechController {
  constructor(lang = 'ru-RU') {
    this.lang = lang;
    this.synth = window.speechSynthesis || null;
    this.recognition = null;
    this.enabled = true;
    this.voiceCommandsEnabled = false;
    this.onCommand = null;
    this.onStatus = null;      // сообщает интерфейсу: слушаю / молчу / запрещено
    this.listening = false;    // распознавание сейчас запущено
    this.wantListening = false; // мы хотим слушать (после паузы поднимаем заново)
    this.onProblem = null;     // телефон отказался говорить: (код) — интерфейс показывает причину
    this.lastProblem = '';
  }

  /* ГОЛОС ВЫБИРАЕМ ЯВНО (сборка 35). Владелец 06.11.2026: телефон перестал говорить при полной громкости,
     а страница голос просила (проверено). Одного u.lang Chrome на Android бывает мало: язык не находит
     голоса — и тишина без единой ошибки на экране. Берём из установленных на телефоне голос этого языка;
     нет такого — говорим голосом по умолчанию, это лучше молчания. */
  _voice() {
    if (!this.synth || !this.synth.getVoices) return null;
    const want = this.lang.toLowerCase().split('-')[0];
    const voices = this.synth.getVoices() || [];
    const same = voices.filter(v => String(v.lang).toLowerCase().replace('_', '-').split('-')[0] === want);
    return same.find(v => v.localService) || same[0] || null;
  }

  // Отказ телефона, а не наша остановка (cancel даёт interrupted/canceled — это не беда)
  _problem(code) {
    if (!code || code === 'interrupted' || code === 'canceled') return;
    this.lastProblem = code;
    console.warn('[Голос] телефон не произнёс:', code);
    if (this.onProblem) this.onProblem(code);
  }

  /* interrupt=false — фраза встаёт в очередь и не обрывает предыдущую.
     Иначе команда «вдох» перебивала счёт, и цифры было не слышно.

     opts.onEnd вызывается, когда фраза договорена (или оборвана, или
     не была произнесена вовсе) — на этом строится непрерывный поток
     настроев в гимнастике для глаз. Он обязан позваться в любом
     случае, иначе цепочка молча остановится.
     opts.rate — своя скорость: длинные формулы читаются спокойнее. */
  speak(text, interrupt = false, opts = {}) {
    const done = typeof opts.onEnd === 'function' ? opts.onEnd : null;
    if (!this.enabled || !this.synth) {
      if (done) setTimeout(done, 0);
      return;
    }
    try {
      if (interrupt) this.synth.cancel();
      // Chrome на Android оставляет синтез на «паузе» после фона — тогда молчит всё, что встаёт в очередь
      if (this.synth.paused) this.synth.resume();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = this.lang;
      const voice = this._voice();
      if (voice) u.voice = voice;
      u.rate = opts.rate || 1.15;   // чуть быстрее: короткие слова должны успевать за темпом
      u.pitch = opts.pitch || 1.0;
      let called = false;
      const once = () => { if (!called) { called = true; if (done) done(); } };
      u.onend = once;
      u.onerror = e => { this._problem(e && e.error); once(); };
      this.synth.speak(u);
    } catch (e) {
      console.warn('TTS error', e);
      if (done) setTimeout(done, 0);
    }
  }

  /* ПРОВЕРКА ГОЛОСА — кнопка в настройках (сборка 35). Говорит фразу независимо от настроек и отвечает, что
     было на самом деле: есть ли синтез, сколько голосов и какой выбран, начал ли телефон говорить и чем отказал.
     result: ok | no-synth | no-start (принял и молчит) | ended-silent | error:<код Chrome> */
  check(phrase) {
    return new Promise(resolve => {
      const итог = { synth: !!this.synth, lang: this.lang, voices: 0, voice: '', result: '' };
      if (!this.synth) { итог.result = 'no-synth'; resolve(итог); return; }
      const run = () => {
        итог.voices = (this.synth.getVoices() || []).length;
        const v = this._voice();
        итог.voice = v ? `${v.name} (${v.lang})` : '';
        try { this.synth.cancel(); if (this.synth.paused) this.synth.resume(); } catch (e) {}
        const u = new SpeechSynthesisUtterance(phrase);
        u.lang = this.lang;
        if (v) u.voice = v;
        let started = false, done = false;
        const finish = r => { if (done) return; done = true; итог.result = r; resolve(итог); };
        u.onstart = () => { started = true; };
        u.onend = () => finish(started ? 'ok' : 'ended-silent');
        u.onerror = e => finish('error:' + ((e && e.error) || 'unknown'));
        setTimeout(() => finish(started ? 'ok' : 'no-start'), 8000);
        this.synth.speak(u);
      };
      // Голоса Chrome отдаёт не сразу: ждём их появления, но не дольше полутора секунд
      if ((this.synth.getVoices() || []).length) { run(); return; }
      let ran = false;
      const go = () => { if (!ran) { ran = true; run(); } };
      if (this.synth.addEventListener) this.synth.addEventListener('voiceschanged', go, { once: true });
      setTimeout(go, 1500);
    });
  }

  // Оборвать всё сказанное — при паузе и выходе из подхода
  stopSpeaking() {
    if (!this.synth) return;
    try { this.synth.cancel(); } catch (e) {}
  }

  // Микрофон браузер даёт только на защищённом соединении.
  // Исключение — открытая на самом компьютере страница (localhost).
  static micAvailable() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return 'unsupported';
    const host = location.hostname;
    const secure = window.isSecureContext ||
                   host === 'localhost' || host === '127.0.0.1' || location.protocol === 'file:';
    if (!secure) return 'insecure';
    return 'ok';
  }

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.lang;
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 3;

    this.recognition.onresult = (e) => {
      // Смотрим все варианты распознавания: короткие слова вроде «старт»
      // браузер часто ставит не на первое место.
      const res = e.results[e.results.length - 1];
      let matched = false;
      for (let i = 0; i < res.length && !matched; i++) {
        const said = res[i].transcript.toLowerCase().trim();
        matched = this.handleCommand(said);
      }
      // Даже если команду не узнали, показываем расслышанное —
      // так видно, что микрофон работает, и понятно, что сказать иначе
      if (!matched && res[0] && this.onHeard) {
        this.onHeard(res[0].transcript.toLowerCase().trim(), false);
      }
    };

    this.recognition.onstart = () => {
      this.listening = true;
      if (this.onStatus) this.onStatus('listening');
    };

    // Распознавание само замолкает после паузы в речи — поднимаем заново,
    // иначе команда работает только первые несколько секунд.
    this.recognition.onend = () => {
      this.listening = false;
      if (this.wantListening && this.voiceCommandsEnabled) {
        setTimeout(() => this.startListening(), 300);
      } else if (this.onStatus) {
        this.onStatus('idle');
      }
    };

    this.recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        // Микрофон запрещён — переспрашивать бесполезно
        this.wantListening = false;
        if (this.onStatus) this.onStatus('denied');
      } else if (e.error === 'no-speech' || e.error === 'aborted') {
        // Обычное дело: тишина. onend поднимет заново.
      } else if (this.onStatus) {
        this.onStatus('error');
      }
    };

    return true;
  }

  startListening() {
    if (!this.recognition || !this.voiceCommandsEnabled) return;
    this.wantListening = true;
    if (this.listening) return;
    try {
      this.recognition.start();
    } catch (e) {
      // start() на уже запущенном бросает исключение — это не ошибка
    }
  }

  stopListening() {
    this.wantListening = false;
    if (!this.recognition) return;
    try { this.recognition.stop(); } catch (e) {}
    if (this.onStatus) this.onStatus('idle');
  }

  // Распознаватель часто слышит слово неточно, поэтому ловим и близкие
  // варианты: «старт» может прийти как «сталь», «март», «start».
  // Возвращает true, если команда узнана — тогда остальные варианты
  // того же результата уже не проверяем.
  handleCommand(cmd) {
    if (!this.onCommand || !cmd) return false;

    if (this.onHeard) this.onHeard(cmd);

    // Фразу режем на слова и сверяем каждое.
    // Раньше здесь стояли регулярные выражения с границей слова \b,
    // но в JavaScript она считается только по латинским буквам —
    // с кириллицей такое условие не выполняется никогда, поэтому
    // «старт» не срабатывал вообще.
    const words = cmd.split(/[^0-9a-zа-яёіїєґ]+/i).filter(Boolean);

    const dict = {
      start:    ['старт','стард','сталь','страт','старта','старты','стар','начали','начало','начинай','поехали','погнали','пошли','start','go'],
      pause:    ['пауза','паузу','пауз','стоп','стой','подожди','хватит','замри','pause','stop','wait'],
      complete: ['готово','готов','всё','все','закончил','закончили','закончить','дальше','следующее','следующий','done','finish','next'],
      rest:     ['отдых','отдыхать','отдохнуть','перерыв','rest','break']
    };

    for (const w of words) {
      for (const name of Object.keys(dict)) {
        if (dict[name].includes(w)) {
          this.onCommand(name);
          return true;
        }
      }
    }
    return false;
  }
}
