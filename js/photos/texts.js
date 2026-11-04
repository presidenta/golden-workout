/* Подписи модуля фотографий на трёх языках. Свой словарь, как у модуля аккаунта:
   модуль можно убрать, не трогая остальные тексты. */
const GP_TEXTS = {
  ru: {
    goalTitle: 'Мой эталон',
    goalIntro: 'Фото тела, к которому вы идёте. Смотрите на него перед подходом и на отдыхе — так легче представить себя таким.',
    goalAdd: 'Добавить фото',
    goalMore: 'Ещё фото',
    goalFull: n => `Эталонов уже ${n} — больше не поместится. Уберите одно, чтобы добавить новое.`,
    restCaption: 'Ваш эталон',
    open: 'Открыть фото',
    close: 'Закрыть',
    prev: 'Предыдущее',
    next: 'Следующее',
    remove: 'Убрать',
    removeGoal: 'Убрать это фото из эталонов?',
    removeAvatar: 'Убрать фото профиля?',
    change: 'Сменить',
    addAvatar: 'Добавить фото',
    changeAvatar: 'Открыть фото профиля',
    saving: 'Сохраняю фото…',
    notImage: 'Это не фотография — выберите снимок',
    failed: 'Не получилось сохранить фото. Попробуйте ещё раз'
  },
  ua: {
    goalTitle: 'Мій еталон',
    goalIntro: 'Фото тіла, до якого ви йдете. Дивіться на нього перед підходом і на відпочинку — так легше уявити себе таким.',
    goalAdd: 'Додати фото',
    goalMore: 'Ще фото',
    goalFull: n => `Еталонів уже ${n} — більше не вміститься. Приберіть одне, щоб додати нове.`,
    restCaption: 'Ваш еталон',
    open: 'Відкрити фото',
    close: 'Закрити',
    prev: 'Попереднє',
    next: 'Наступне',
    remove: 'Прибрати',
    removeGoal: 'Прибрати це фото з еталонів?',
    removeAvatar: 'Прибрати фото профілю?',
    change: 'Змінити',
    addAvatar: 'Додати фото',
    changeAvatar: 'Відкрити фото профілю',
    saving: 'Зберігаю фото…',
    notImage: 'Це не фотографія — виберіть знімок',
    failed: 'Не вдалося зберегти фото. Спробуйте ще раз'
  },
  en: {
    goalTitle: 'My goal body',
    goalIntro: 'A photo of the body you are working towards. Look at it before a set and while resting — it helps you picture yourself there.',
    goalAdd: 'Add photo',
    goalMore: 'More photos',
    goalFull: n => `You already have ${n} goal photos — no room for more. Remove one to add a new one.`,
    restCaption: 'Your goal',
    open: 'Open photo',
    close: 'Close',
    prev: 'Previous',
    next: 'Next',
    remove: 'Remove',
    removeGoal: 'Remove this goal photo?',
    removeAvatar: 'Remove the profile photo?',
    change: 'Change',
    addAvatar: 'Add photo',
    changeAvatar: 'Open profile photo',
    saving: 'Saving photo…',
    notImage: 'This is not a photo — pick a picture',
    failed: 'Could not save the photo. Please try again'
  }
};

function gpText() {
  const lang = (typeof store !== 'undefined' && store.getState().lang) || 'ru';
  return GP_TEXTS[lang] || GP_TEXTS.ru;
}
