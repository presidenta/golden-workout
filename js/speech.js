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
  }

  // interrupt=false — фраза встаёт в очередь и не обрывает предыдущую.
  // Иначе команда «вдох» перебивала счёт, и цифры было не слышно.
  speak(text, interrupt = false) {
    if (!this.enabled || !this.synth) return;
    try {
      if (interrupt) this.synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = this.lang;
      u.rate = 1.15;   // чуть быстрее: короткие слова должны успевать за темпом
      u.pitch = 1.0;
      this.synth.speak(u);
    } catch (e) { console.warn('TTS error', e); }
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
      for (let i = 0; i < res.length; i++) {
        const said = res[i].transcript.toLowerCase().trim();
        if (this.handleCommand(said)) break;
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

    const rules = [
      ['start',    /\b(старт|стард|сталь|старт[аеы]|начали|начинай|поехали|погнали|start|go)\b/],
      ['pause',    /\b(пауза|паузу|стоп|стой|подожди|хватит|pause|stop|wait)\b/],
      ['complete', /\b(готово|готов|всё|все|закончил|закончить|дальше|следующ\w*|done|finish|next)\b/],
      ['rest',     /\b(отдых|отдыхать|перерыв|rest|break)\b/]
    ];

    for (const [name, re] of rules) {
      if (re.test(cmd)) {
        this.onCommand(name);
        return true;
      }
    }
    return false;
  }
}
