/* Подписи окна «Настройка упражнения» на трёх языках. Свой словарь, как у модулей аккаунта и фото:
   модуль можно убрать, не трогая остальные тексты. */
const GES_TEXTS = {
  ru: {
    title: 'Настройка упражнения',
    open: 'Настроить упражнение: подходы, повторы, темп',
    previewOpen: 'Настроить: подходы, повторы, темп',
    sets: 'Подходы',
    reps: 'Повторы',
    hold: 'Секунды удержания',
    tempo: 'Темп',
    tempoHint: 'секунд на одно повторение — с этим шагом идут счёт и «вдох»',
    sec: 'с',
    save: 'Сохранить',
    reset: 'Как в общих настройках',
    close: 'Закрыть',
    own: 'Свои числа у этого упражнения',
    general: 'Сейчас — общие числа'
  },
  ua: {
    title: 'Налаштування вправи',
    open: 'Налаштувати вправу: підходи, повтори, темп',
    previewOpen: 'Налаштувати: підходи, повтори, темп',
    sets: 'Підходи',
    reps: 'Повтори',
    hold: 'Секунди утримання',
    tempo: 'Темп',
    tempoHint: 'секунд на одне повторення — з цим кроком іде рахунок і «вдих»',
    sec: 'с',
    save: 'Зберегти',
    reset: 'Як у загальних налаштуваннях',
    close: 'Закрити',
    own: 'Свої числа в цієї вправи',
    general: 'Зараз — загальні числа'
  },
  en: {
    title: 'Exercise settings',
    open: 'Set up the exercise: sets, reps, tempo',
    previewOpen: 'Set up: sets, reps, tempo',
    sets: 'Sets',
    reps: 'Reps',
    hold: 'Hold seconds',
    tempo: 'Tempo',
    tempoHint: 'seconds per rep — counting and “breathe in” follow this step',
    sec: 's',
    save: 'Save',
    reset: 'Use general settings',
    close: 'Close',
    own: 'This exercise has its own numbers',
    general: 'General numbers for now'
  }
};

function gesText() {
  const lang = (typeof store !== 'undefined' && store.getState().lang) || 'ru';
  return GES_TEXTS[lang] || GES_TEXTS.ru;
}
