class SpeechController {
  constructor(lang = 'ru-RU') {
    this.lang = lang;
    this.synth = window.speechSynthesis || null;
    this.recognition = null;
    this.enabled = true;
    this.voiceCommandsEnabled = false;
    this.onCommand = null;
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

  initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return false;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.lang;
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const cmd = last[0].transcript.toLowerCase().trim();
      this.handleCommand(cmd);
    };
    this.recognition.onerror = (e) => { /* ignore noisy errors */ };
    return true;
  }

  startListening() {
    if (!this.recognition || !this.voiceCommandsEnabled) return;
    try { this.recognition.start(); } catch(e) {}
  }

  stopListening() {
    if (!this.recognition) return;
    try { this.recognition.stop(); } catch(e) {}
  }

  handleCommand(cmd) {
    if (!this.onCommand) return;
    if (/старт|start|поехали|go/.test(cmd)) this.onCommand('start');
    else if (/пауза|pause|стоп|stop/.test(cmd)) this.onCommand('pause');
    else if (/готово|done|закончить|finish|следующ|next/.test(cmd)) this.onCommand('complete');
    else if (/отдых|rest|перерыв/.test(cmd)) this.onCommand('rest');
  }
}
