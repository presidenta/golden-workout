/* ===== МЕТОДИКИ И АВТОМАТИЧЕСКИЙ ПОДБОР НЕДЕЛИ =====

   Здесь живёт то, что раньше приходилось держать в голове: сколько раз в
   неделю трогать каждую группу мышц, чем занять выходной и сколько подходов
   давать новичку, чтобы он не бросил через неделю.

   Правила, на которых всё построено — не выдуманные, это то, в чём сходятся
   и старая школа бодибилдинга, и современные разборы:

   1. Группа мышц любит нагрузку ДВА раза в неделю. Раз в неделю — мало
      (эффект успевает угаснуть), каждый день — некогда восстанавливаться.
   2. Мышца растёт не на тренировке, а после неё. Поэтому подряд два тяжёлых
      дня на одно и то же не ставим — между ними либо другая половина тела,
      либо лёгкий день.
   3. Выходной — не диван. Суставная гимнастика, кардио и глаза: кровь гоняем,
      мышцы не грузим. Так тело восстанавливается быстрее, чем в покое, и —
      главное — не теряется привычка заниматься каждый день.
   4. Новичок начинает с двух подходов, а не с четырёх. «100%» в настройках —
      это ориентир взрослого плана, и подходить к нему надо за 6–8 недель.

   Числа одни для всех языков, переводятся только подписи. */


/* ----- Уровень подготовки -----
   Определяет и объём (сколько подходов), и то, какие упражнения вообще
   попадут в план: сложные новичку не предлагаются. */
const LEVELS = {
  beginner: {
    id: 'beginner',
    sets: 2,               // подходов в рабочем упражнении
    exercisesPerDay: 4,    // упражнений за тренировку
    restMul: 1.25,         // отдых длиннее: дыхание ещё не поставлено
    allow: ['beginner'],
    /* Спина нужна и новичку — осанка садится раньше всего остального.
       В нашей базе её мягко грузит только жёлтый хват доски: работа
       идёт лопатками, глубина не нужна. Поэтому он проходит к новичку
       в обход отбора по сложности. */
    always: ['board_yellow'],
    ru: { name: 'Новичок', hint: 'Первые недели. Техника важнее числа повторов.' },
    en: { name: 'Beginner', hint: 'First weeks. Form matters more than numbers.' },
    ua: { name: 'Початківець', hint: 'Перші тижні. Техніка важливіша за кількість.' }
  },
  intermediate: {
    id: 'intermediate',
    sets: 3,
    exercisesPerDay: 5,
    restMul: 1,
    allow: ['beginner', 'intermediate'],
    ru: { name: 'Продолжающий', hint: '2–6 месяцев за плечами, техника уверенная.' },
    en: { name: 'Intermediate', hint: '2–6 months in, form is solid.' },
    ua: { name: 'Продовжуючий', hint: '2–6 місяців позаду, техніка впевнена.' }
  },
  advanced: {
    id: 'advanced',
    sets: 4,
    exercisesPerDay: 6,
    restMul: 0.85,
    allow: ['beginner', 'intermediate'],
    ru: { name: 'Опытный', hint: 'Больше года. Нужен объём и плотность.' },
    en: { name: 'Advanced', hint: 'A year plus. Needs volume and density.' },
    ua: { name: 'Досвідчений', hint: 'Понад рік. Потрібен обсяг і щільність.' }
  }
};


/* ----- Блоки тренировочного дня -----
   pick — упражнения по приоритету: генератор берёт сверху столько, сколько
   разрешает уровень, и пропускает то, что новичку рано. Первым в списке
   всегда идёт самое тяжёлое: на свежие силы — главное движение. */
const FOCUS = {
  full: {
    id: 'full',
    pick: ['board_blue', 'squats', 'board_yellow', 'plank', 'shoulder_press', 'lunges'],
    fallback: ['pushups', 'squats', 'triceps_dips', 'glute_bridge', 'crunches', 'plank'],
    ru: { name: 'Всё тело', note: 'Одна тренировка — всё тело разом. Для трёх дней в неделю это лучший вариант: каждая мышца получает работу трижды.' },
    en: { name: 'Full body', note: 'Everything in one session. Best choice for three days a week: every muscle gets worked three times.' },
    ua: { name: 'Все тіло', note: 'Одне тренування — усе тіло. Для трьох днів на тиждень найкращий варіант.' }
  },
  upper: {
    id: 'upper',
    pick: ['board_blue', 'board_yellow', 'shoulder_press', 'triceps_dips', 'biceps_curl', 'crunches'],
    fallback: ['pushups', 'pushups_wide', 'triceps_dips', 'biceps_curl', 'crunches'],
    ru: { name: 'Верх тела', note: 'Грудь, спина, плечи, руки. Ноги отдыхают и восстанавливаются к завтрашнему дню.' },
    en: { name: 'Upper body', note: 'Chest, back, shoulders, arms. Legs rest and recover for tomorrow.' },
    ua: { name: 'Верх тіла', note: 'Груди, спина, плечі, руки. Ноги відпочивають.' }
  },
  lower: {
    id: 'lower',
    pick: ['squats', 'romanian_dl', 'lunges', 'glute_bridge', 'calf_raises', 'plank'],
    fallback: ['squats', 'lunges_reverse', 'glute_bridge', 'calf_raises', 'plank'],
    ru: { name: 'Низ тела', note: 'Ноги и ягодицы — самые крупные мышцы в теле. Их день всегда самый тяжёлый по дыханию.' },
    en: { name: 'Lower body', note: 'Legs and glutes — the biggest muscles you own. This day is always the hardest on breathing.' },
    ua: { name: 'Низ тіла', note: 'Ноги та сідниці — найбільші м\'язи тіла. Найважчий день за диханням.' }
  },
  push: {
    id: 'push',
    pick: ['board_blue', 'board_red', 'board_green', 'pushups_wide', 'triceps_dips', 'plank'],
    fallback: ['pushups', 'pushups_wide', 'shoulder_press', 'triceps_dips', 'pushups_diamond'],
    ru: { name: 'Жим', note: 'Всё, что толкает от себя: грудь, плечи, трицепс. Работают вместе — значит и тренировать их логично вместе.' },
    en: { name: 'Push', note: 'Everything that pushes away: chest, shoulders, triceps. They work together, so they train together.' },
    ua: { name: 'Жим', note: 'Усе, що штовхає від себе: груди, плечі, трицепс.' }
  },
  pull: {
    id: 'pull',
    pick: ['board_yellow', 'romanian_dl', 'biceps_curl', 'glute_bridge', 'crunches'],
    fallback: ['board_yellow', 'biceps_curl', 'glute_bridge', 'crunches', 'plank'],
    ru: { name: 'Тяга', note: 'Всё, что тянет к себе: спина, бицепс, задняя поверхность бедра. Этот день выпрямляет осанку.' },
    en: { name: 'Pull', note: 'Everything that pulls towards you: back, biceps, hamstrings. This is the day that fixes your posture.' },
    ua: { name: 'Тяга', note: 'Усе, що тягне до себе: спина, біцепс, задня поверхня стегна.' }
  },
  legs: {
    id: 'legs',
    pick: ['squats', 'lunges', 'romanian_dl', 'glute_bridge', 'calf_raises', 'lunges_reverse'],
    fallback: ['squats', 'lunges', 'glute_bridge', 'calf_raises'],
    ru: { name: 'Ноги', note: 'Отдельный день ног. Приседания идут первыми, пока есть силы — на уставших ногах техника ломается.' },
    en: { name: 'Legs', note: 'Legs get their own day. Squats go first while you are fresh — tired legs lose form.' },
    ua: { name: 'Ноги', note: 'Окремий день ніг. Присідання першими, доки є сили.' }
  },
  circuit: {
    id: 'circuit',
    pick: ['pushups', 'squats', 'mountain_climbers', 'lunges', 'crunches', 'plank'],
    fallback: ['pushups', 'squats', 'mountain_climbers', 'crunches', 'plank'],
    ru: { name: 'Круг', note: 'Упражнения идут подряд с коротким отдыхом — тело работает как единое целое, а не по частям. Пульс держится высоким всю тренировку.' },
    en: { name: 'Circuit', note: 'Exercises run back to back with short rests — the body works as one piece. Heart rate stays high throughout.' },
    ua: { name: 'Коло', note: 'Вправи йдуть підряд з коротким відпочинком — тіло працює як єдине ціле.' }
  },
  core: {
    id: 'core',
    pick: ['mountain_climbers', 'crunches', 'plank', 'glute_bridge'],
    fallback: ['crunches', 'plank', 'glute_bridge'],
    ru: { name: 'Кор и кардио', note: 'Пресс и поясница восстанавливаются быстро — их можно грузить хоть каждый день. Плюс полчаса дорожки.' },
    en: { name: 'Core & cardio', note: 'Abs and lower back recover fast — they can be worked almost daily. Plus half an hour on the treadmill.' },
    ua: { name: 'Кор і кардіо', note: 'Прес і поперек відновлюються швидко. Плюс півгодини доріжки.' }
  },
  goltis: {
    id: 'goltis',
    pick: ['goltis_joint', 'pushups', 'squats', 'glute_bridge', 'plank'],
    fallback: ['goltis_joint', 'pushups', 'squats', 'plank'],
    ru: { name: 'Импульс', note: 'Подход выполняется до состояния «мог бы ещё один, но не делаю». Отказа нет — есть импульс, после которого тело просит движения, а не покоя.' },
    en: { name: 'Impulse', note: 'Each set stops at "I could do one more, but I won\'t". No failure — just the impulse that leaves the body asking for movement.' },
    ua: { name: 'Імпульс', note: 'Підхід до стану «міг би ще один, але не роблю». Без відмови — лише імпульс.' }
  },
  light: {
    id: 'light',
    pick: ['goltis_joint', 'glute_bridge', 'plank'],
    fallback: ['goltis_joint', 'glute_bridge'],
    ru: { name: 'Лёгкий день', note: 'Суставная гимнастика, 20–30 минут ходьбы или лёгкого бега и упражнения для глаз. Мышцы не грузим — гоним кровь.' },
    en: { name: 'Easy day', note: 'Joint routine, 20–30 minutes of walking or easy running, and the eye set. No loading — just circulation.' },
    ua: { name: 'Легкий день', note: 'Суглобова гімнастика, 20–30 хвилин ходьби та вправи для очей.' }
  },
  recovery: {
    id: 'recovery',
    pick: ['goltis_joint'],
    fallback: ['goltis_joint'],
    ru: { name: 'Восстановление', note: 'Единственный по-настоящему свободный день. Суставная гимнастика, прогулка и глаза — этого достаточно, чтобы не терять привычку.' },
    en: { name: 'Recovery', note: 'The one genuinely free day. Joint routine, a walk and the eye set — enough to keep the habit alive.' },
    ua: { name: 'Відновлення', note: 'Єдиний по-справжньому вільний день. Суглобова гімнастика, прогулянка та очі.' }
  }
};


/* ----- Методики -----
   pattern идёт с ПОНЕДЕЛЬНИКА: [пн, вт, ср, чт, пт, сб, вс].
   Порядок дней не случайный — тяжёлое ставится туда, где перед ним был
   отдых, а два дня подряд на одну группу не встречаются нигде. */
const METHODS = {

  fullbody3: {
    id: 'fullbody3',
    days: 3,
    levels: ['beginner', 'intermediate'],
    pattern: ['full', 'light', 'full', 'light', 'full', 'light', 'recovery'],
    ru: {
      name: 'Full-Body · 3 дня',
      author: 'Классика силовой базы — Марк Риппето, Starting Strength',
      short: 'Понедельник, среда, пятница. Всё тело целиком.',
      desc: 'То, с чего начинают все и к чему многие возвращаются. Каждая мышца работает три раза в неделю — это втрое чаще, чем в модных сплитах, и именно поэтому новичок на такой схеме растёт быстрее всего. Между тренировками всегда сутки отдыха, в них — лёгкий день с ходьбой и суставной гимнастикой.',
      forWhom: 'Новичку и всем, кто возвращается после перерыва.'
    },
    en: {
      name: 'Full-Body · 3 days',
      author: 'The strength classic — Mark Rippetoe, Starting Strength',
      short: 'Monday, Wednesday, Friday. Whole body each time.',
      desc: 'Where everyone starts and where many come back to. Every muscle works three times a week — three times more often than in fashionable splits, which is exactly why beginners grow fastest here. A full day of rest between sessions, filled with walking and joint work.',
      forWhom: 'Beginners and anyone returning after a break.'
    },
    ua: {
      name: 'Full-Body · 3 дні',
      author: 'Класика силової бази — Марк Ріппето, Starting Strength',
      short: 'Понеділок, середа, п\'ятниця. Усе тіло разом.',
      desc: 'З цього починають усі. Кожен м\'яз працює тричі на тиждень — саме тому початківець тут росте найшвидше. Між тренуваннями завжди доба відпочинку.',
      forWhom: 'Початківцям і всім, хто повертається після перерви.'
    }
  },

  upperlower4: {
    id: 'upperlower4',
    days: 4,
    levels: ['intermediate', 'advanced'],
    pattern: ['upper', 'lower', 'light', 'upper', 'lower', 'light', 'recovery'],
    ru: {
      name: 'Верх / Низ · 4 дня',
      author: 'Золотая эра бодибилдинга — принципы Джо Уайдера, школа Арнольда',
      short: 'Две тренировки верха и две низа, через день.',
      desc: 'Тело делится пополам: пока верх работает, низ восстанавливается, и наоборот. Каждая группа мышц получает нагрузку дважды в неделю — тот самый режим, который считается золотой серединой между результатом и восстановлением. Объём на одну мышцу больше, чем в full-body, поэтому и растёт заметнее.',
      forWhom: 'Когда первые месяцы позади и хочется прибавить объём.'
    },
    en: {
      name: 'Upper / Lower · 4 days',
      author: 'Golden era bodybuilding — Joe Weider principles, Arnold\'s school',
      short: 'Two upper sessions and two lower, every other day.',
      desc: 'The body splits in half: while the upper works, the lower recovers, and the other way round. Each muscle group gets loaded twice a week — the sweet spot between results and recovery. More volume per muscle than full-body, so growth is more visible.',
      forWhom: 'Once the first months are behind you and you want more volume.'
    },
    ua: {
      name: 'Верх / Низ · 4 дні',
      author: 'Золота ера бодібілдингу — принципи Джо Вейдера, школа Арнольда',
      short: 'Два тренування верху і два низу, через день.',
      desc: 'Тіло ділиться навпіл: поки верх працює, низ відновлюється. Кожна група м\'язів отримує навантаження двічі на тиждень — золота середина.',
      forWhom: 'Коли перші місяці позаду й хочеться додати обсяг.'
    }
  },

  ppl5: {
    id: 'ppl5',
    days: 5,
    levels: ['intermediate', 'advanced'],
    pattern: ['push', 'pull', 'legs', 'upper', 'lower', 'light', 'recovery'],
    ru: {
      name: 'Жим / Тяга / Ноги · 5 дней',
      author: 'Современный бодибилдинг-сплит, развитие системы Уайдера',
      short: 'Толкающие, тянущие, ноги — и второй круг покороче.',
      desc: 'Мышцы делятся не по названиям, а по работе: одни толкают, другие тянут. Из-за этого на тренировке никогда не спорят между собой уставший трицепс и свежая грудь — всё, что нужно движению, устаёт вместе. Пять дней подряд возможны именно потому, что каждая группа успевает отдохнуть, пока работает соседняя.',
      forWhom: 'Тем, кто занимается уверенно и готов приходить пять раз в неделю.'
    },
    en: {
      name: 'Push / Pull / Legs · 5 days',
      author: 'Modern bodybuilding split, an evolution of the Weider system',
      short: 'Pushing, pulling, legs — then a shorter second round.',
      desc: 'Muscles are grouped by the job they do, not by their names: some push, some pull. So a tired triceps never limits a fresh chest — everything a movement needs gets tired together. Five days in a row work precisely because each group rests while its neighbour works.',
      forWhom: 'For confident trainees ready to show up five times a week.'
    },
    ua: {
      name: 'Жим / Тяга / Ноги · 5 днів',
      author: 'Сучасний бодібілдинг-спліт, розвиток системи Вейдера',
      short: 'Штовхальні, тягнучі, ноги — і коротше друге коло.',
      desc: 'М\'язи діляться за роботою: одні штовхають, інші тягнуть. Усе, що потрібне руху, втомлюється разом. П\'ять днів поспіль можливі саме тому, що кожна група відпочиває, поки працює сусідня.',
      forWhom: 'Тим, хто займається впевнено і готовий приходити п\'ять разів на тиждень.'
    }
  },

  circuit_lee: {
    id: 'circuit_lee',
    days: 6,
    levels: ['intermediate', 'advanced'],
    pattern: ['circuit', 'core', 'circuit', 'core', 'circuit', 'core', 'recovery'],
    ru: {
      name: 'Круговая по Брюсу Ли · 6 дней',
      author: 'Функциональная школа Брюса Ли — «The Art of Expressing the Human Body»',
      short: 'Короткие круги через день, пресс — почти ежедневно.',
      desc: 'Брюс Ли считал бессмысленным качать мышцу, которая красиво выглядит, но не умеет работать. Отсюда круги: упражнения идут подряд, отдых короткий, пульс не опускается. Пресс и поясница у него работали почти каждый день — эти мышцы восстанавливаются за считанные часы. Тренировка короче обычной, но тяжелее по дыханию.',
      forWhom: 'Когда нужна выносливость, сухость и мало времени.'
    },
    en: {
      name: 'Bruce Lee Circuit · 6 days',
      author: 'Bruce Lee\'s functional school — "The Art of Expressing the Human Body"',
      short: 'Short circuits every other day, core almost daily.',
      desc: 'Bruce Lee saw no point in a muscle that looks good but cannot work. Hence circuits: exercises run back to back, rest is short, the pulse never drops. He trained abs and lower back almost daily — those recover within hours. Shorter than a normal session, but far harder on the breathing.',
      forWhom: 'When you want stamina and leanness, and have little time.'
    },
    ua: {
      name: 'Кругове за Брюсом Лі · 6 днів',
      author: 'Функціональна школа Брюса Лі — «The Art of Expressing the Human Body»',
      short: 'Короткі кола через день, прес — майже щодня.',
      desc: 'Брюс Лі вважав безглуздим качати м\'яз, який гарно виглядає, але не вміє працювати. Звідси кола: вправи підряд, відпочинок короткий, пульс не падає.',
      forWhom: 'Коли потрібна витривалість і мало часу.'
    }
  },

  goltis_way: {
    id: 'goltis_way',
    days: 3,
    levels: ['beginner', 'intermediate', 'advanced'],
    pattern: ['goltis', 'light', 'goltis', 'light', 'goltis', 'light', 'recovery'],
    ru: {
      name: 'Голтис · Исцеляющий импульс',
      author: 'Голтис (Владимир Осипов), система «Исцеляющий импульс»',
      short: 'Суставная каждый день, импульсные подходы через день.',
      desc: 'Система строится на одном правиле: подход заканчивается не в отказе, а на один повтор раньше — в точке импульса. После отказа тело просит покоя, после импульса — движения. Никакого железа: только свой вес, дыхание и суставная гимнастика, с которой начинается каждый день. Нагрузка растёт не весом, а числом повторов и качеством движения.',
      forWhom: 'Тем, кому важнее здоровье суставов и позвоночника, чем объём мышц.'
    },
    en: {
      name: 'Goltis · Healing Impulse',
      author: 'Goltis (Vladimir Osipov), the Healing Impulse system',
      short: 'Joint routine daily, impulse sets every other day.',
      desc: 'Built on one rule: a set ends not at failure but one rep earlier — at the point of impulse. After failure the body asks for rest; after impulse it asks for movement. No iron at all: bodyweight, breathing and the joint routine that opens every day. Load grows through reps and quality, not weight.',
      forWhom: 'For those who value joints and spine over muscle size.'
    },
    ua: {
      name: 'Голтіс · Зцілюючий імпульс',
      author: 'Голтіс (Володимир Осипов), система «Зцілюючий імпульс»',
      short: 'Суглобова щодня, імпульсні підходи через день.',
      desc: 'Система будується на одному правилі: підхід закінчується не у відмові, а на один повтор раніше — у точці імпульсу. Після відмови тіло просить спокою, після імпульсу — руху. Жодного заліза: лише своя вага, дихання і суглобова гімнастика.',
      forWhom: 'Тим, кому важливіше здоров\'я суглобів і хребта, ніж обсяг м\'язів.'
    }
  }
};


/* ----- Генератор -----
   Из методики и уровня собирает конкретную неделю: какие упражнения,
   в какой день, сколько подходов. */

// Упражнения, которые человеку по силам прямо сейчас.
function _allowedFor(level) {
  const lvl = LEVELS[level] || LEVELS.beginner;
  return (id) => {
    const ex = EXERCISE_DB[id];
    if (!ex) return false;
    if ((lvl.always || []).includes(id)) return true;
    return lvl.allow.includes(ex.difficulty);
  };
}

// Набор упражнений для одного дня. Сначала берём основной список,
// если после отсева осталось мало — добираем из запасного.
function buildDayExercises(focusKey, level) {
  const focus = FOCUS[focusKey];
  if (!focus) return [];
  const lvl = LEVELS[level] || LEVELS.beginner;
  const fits = _allowedFor(level);
  const want = focusKey === 'light' || focusKey === 'recovery'
    ? focus.pick.length
    : lvl.exercisesPerDay;

  const out = [];
  focus.pick.filter(fits).forEach(id => { if (out.length < want) out.push(id); });
  if (out.length < Math.min(3, want)) {
    focus.fallback.filter(fits).forEach(id => {
      if (out.length < want && !out.includes(id)) out.push(id);
    });
  }
  return out;
}

// Сколько подходов в этот день. Лёгкие дни всегда в один подход:
// их задача — разогнать кровь, а не нагрузить.
function setsForFocus(focusKey, level) {
  const lvl = LEVELS[level] || LEVELS.beginner;
  if (focusKey === 'light' || focusKey === 'recovery') return 1;
  if (focusKey === 'circuit') return Math.max(2, lvl.sets);
  return lvl.sets;
}

/* Собирает неделю целиком.

   Возвращает:
     programs — готовые программы, их надо положить в store, чтобы движок
                мог их запустить, как обычные;
     schedule — что в какой день, в формате store.schedule (0 = воскресенье);
     days     — то же самое, но с описаниями, для показа на экране. */
function buildWeekPlan(methodId, level) {
  const method = METHODS[methodId];
  if (!method) return null;
  const lvl = LEVELS[level] ? level : 'beginner';

  const programs = {};
  const schedule = {};
  const days = [];

  // pattern идёт с понедельника, а в JS воскресенье — нулевой день недели
  const DOW_FROM_PATTERN = [1, 2, 3, 4, 5, 6, 0];

  method.pattern.forEach((focusKey, i) => {
    const dow = DOW_FROM_PATTERN[i];
    const focus = FOCUS[focusKey];
    const exercises = buildDayExercises(focusKey, lvl);
    const progKey = `auto_${methodId}_${focusKey}`;

    // Один и тот же фокус в неделе встречается не раз — программу
    // достаточно собрать однажды.
    if (!programs[progKey]) {
      programs[progKey] = {
        id: progKey,
        auto: true,
        method: methodId,
        focus: focusKey,
        sets: setsForFocus(focusKey, lvl),
        name: {
          ru: `${method.ru.name.split('·')[0].trim()} · ${focus.ru.name}`,
          en: `${method.en.name.split('·')[0].trim()} · ${focus.en.name}`,
          ua: `${method.ua.name.split('·')[0].trim()} · ${focus.ua.name}`
        },
        exercises
      };
    }

    schedule[dow] = progKey;
    days.push({
      dow,
      order: i,
      focus: focusKey,
      programKey: progKey,
      exercises,
      sets: setsForFocus(focusKey, lvl),
      isRest: focusKey === 'light' || focusKey === 'recovery'
    });
  });

  return { methodId, level: lvl, method, programs, schedule, days };
}

/* Сколько раз за неделю достанется каждой группе мышц.
   Показывается под планом — чтобы было видно, что ничего не забыто
   и ничего не перегружено. */
function weekMuscleLoad(plan) {
  const counter = {};
  if (!plan) return counter;
  plan.days.forEach(day => {
    if (day.isRest) return;
    const seen = new Set();
    day.exercises.forEach(id => {
      const ex = EXERCISE_DB[id];
      if (!ex) return;
      (ex.muscles || []).forEach(m => seen.add(m));
    });
    seen.forEach(m => { counter[m] = (counter[m] || 0) + 1; });
  });
  return counter;
}

// Сколько минут займёт день: подход плюс отдых, плюс разминка с заминкой.
function estimateDayMinutes(day) {
  if (!day || !day.exercises.length) return 0;
  let sec = 0;
  day.exercises.forEach(id => {
    const ex = EXERCISE_DB[id];
    if (!ex) return;
    const work = ex.breath === 'static' ? ex.reps : ex.reps * 4;
    sec += day.sets * (work + ex.rest);
  });
  return Math.max(5, Math.round((sec + 300) / 60));
}
