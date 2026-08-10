/* ===== ГИМНАСТИКА ДЛЯ ГЛАЗ =====

   Комплекс собран из того, что дают три школы:

   • Уильям Бейтс (США, 1920-е) — пальминг, соляризация, отдых глаза
     через темноту и расслабление. Его главная мысль: глаз портится от
     постоянного напряжения на одной дистанции.
   • Владимир Жданов — русская школа, популяризатор Бейтса. Отсюда
     геометрия движений: вверх-вниз, диагонали, прямоугольник,
     циферблат, змейка. Каждое движение растягивает свою пару мышц.
   • Геннадий Шичко — метод дневника и настроя. Отсюда правило вести
     запись каждый день: сделал — отметил. Регулярность здесь работает
     сильнее, чем усердие.
   • Метка на стекле — из советской школы Э. С. Аветисова, единственное
     упражнение комплекса с доказанной пользой для аккомодации.

   Честно о результате: гимнастика снимает усталость от экрана и
   возвращает подвижность глазным мышцам. Что она возвращает остроту
   зрения при близорукости — не доказано, у метода Бейтса такой
   доказательной базы нет. Делать её стоит ради усталости, а не вместо
   очков и врача.

   Кому нельзя без разрешения врача: высокая близорукость, отслойка или
   разрывы сетчатки, недавняя операция на глазах, воспаление.

   Весь комплекс — около семи минут. Числа одни для всех языков. */

const EYE_SET_VERSION = 2;

/* Насколько долго держать каждое упражнение. Глаз — мышца, и ей, как
   любой другой, нужна посильная нагрузка: начинать стоит с мягкого
   режима, а усиленный имеет смысл, только когда лёгкий перестал
   утомлять. Множитель применяется ко всем шагам разом. */
const EYE_LEVELS = {
  soft: {
    id: 'soft', mul: 0.6,
    ru: { name: 'Мягко', hint: 'Короткие подходы. С этого стоит начинать.' },
    en: { name: 'Easy', hint: 'Short holds. Start here.' },
    ua: { name: "М'яко", hint: 'Короткі підходи. З цього варто починати.' }
  },
  normal: {
    id: 'normal', mul: 1,
    ru: { name: 'Норма', hint: 'Обычный режим, около семи минут.' },
    en: { name: 'Normal', hint: 'Standard, about seven minutes.' },
    ua: { name: 'Норма', hint: 'Звичайний режим, близько семи хвилин.' }
  },
  strong: {
    id: 'strong', mul: 1.6,
    ru: { name: 'Усиленно', hint: 'Длинные подходы. Только если лёгкий уже не утомляет.' },
    en: { name: 'Intense', hint: 'Long holds. Only when easy stops tiring you.' },
    ua: { name: 'Посилено', hint: 'Довгі підходи. Лише коли легкий вже не втомлює.' }
  }
};

/* ----- Слова-пароли -----
   Формулы намерения: просьба сложить обстоятельства, а не приказ телу.
   Отличаются от обычных настроев тем, что не описывают состояние, а
   обращаются к тому, что человек считает старшим себя, и заканчиваются
   благодарностью. По той же причине они звучат дважды подряд, через
   связку «повторяем ещё»: повтор здесь часть формы.

   Порядок в потоке задаёт buildAffirmationFlow: пароль звучит дважды,
   потом идут три обычных настроя — и снова пароль. */
const EYE_PASSWORDS = {
  ru: [
    'Пусть сложится так, чтобы глаза мои видели лучше. Покажи, как свершилось. Благодарю.',
    'Не знаю как, не знаю кто, не ведаю когда — глаза мои стали видеть лучше. Покажи, как свершилось.',
    'Пусть сложится так, чтобы зрение моё восстановилось само, легко и естественно. Покажи, как свершилось. Благодарю.',
    'Не знаю как, не знаю кто, не ведаю когда — я вижу ясно и далеко, без напряжения. Покажи, как свершилось.'
  ],
  en: [
    'Let it come to pass that my eyes see better. Show me it is done. I give thanks.',
    'I know not how, I know not who, I know not when — my eyes have come to see better. Show me it is done.',
    'Let it come to pass that my sight restores itself, easily and naturally. Show me it is done. I give thanks.',
    'I know not how, I know not who, I know not when — I see clearly and far, without strain. Show me it is done.'
  ],
  ua: [
    'Нехай складеться так, щоб очі мої бачили краще. Покажи, як здійснилося. Дякую.',
    'Не знаю як, не знаю хто, не відаю коли — очі мої стали бачити краще. Покажи, як здійснилося.',
    'Нехай складеться так, щоб зір мій відновився сам, легко і природно. Покажи, як здійснилося. Дякую.',
    'Не знаю як, не знаю хто, не відаю коли — я бачу ясно і далеко, без напруження. Покажи, як здійснилося.'
  ]
};

// Связка между двумя произнесениями формулы
const EYE_AGAIN = {
  ru: 'Повторяем ещё.',
  en: 'Once again.',
  ua: 'Повторюємо ще.'
};

/* Настрои по Жданову и Шичко. Проговариваются вслух, пока человек
   делает упражнение: в этих школах слово — часть занятия, а не
   украшение. Работают они как самовнушение и настрой, а не как
   лечение — про доказательность честно сказано в шапке файла. */
const EYE_AFFIRMATIONS = {
  ru: [
    'Мои глаза отдыхают и наполняются силой.',
    'С каждым днём я вижу всё лучше и лучше.',
    'Мышцы глаз становятся сильными и послушными.',
    'Взгляд свободный, лёгкий, без напряжения.',
    'Глаза расслаблены, лоб разглажен, брови опущены.',
    'Кровь свободно приходит к глазам и питает их.',
    'Зрение становится чётким и ясным.',
    'Я смотрю на мир спокойно и легко.',
    'Каждое движение возвращает глазам подвижность.',
    'Мои глаза здоровые, зоркие, отдохнувшие.',
    'Напряжение уходит, приходит покой.',
    'Я вижу далеко и ясно, без усилия.',
    'Глаза двигаются свободно, в любую сторону.',
    'Свет приходит мягко, смотреть приятно.',
    'Я позволяю глазам отдыхать столько, сколько нужно.',
    'Тело само знает, как всё починить.'
  ],
  en: [
    'My eyes are resting and filling with strength.',
    'Every day I see better and better.',
    'The eye muscles grow strong and obedient.',
    'My gaze is free and light, without strain.',
    'Eyes relaxed, forehead smooth, brows soft.',
    'Blood flows freely to my eyes and feeds them.',
    'My sight becomes sharp and clear.',
    'I look at the world calmly and easily.',
    'Every movement returns mobility to my eyes.',
    'My eyes are healthy, sharp and rested.',
    'Tension leaves, calm arrives.',
    'I see far and clearly, without effort.',
    'My eyes move freely, in every direction.',
    'Light comes softly, looking is pleasant.',
    'I let my eyes rest as long as they need.',
    'The body knows how to mend itself.'
  ],
  ua: [
    'Мої очі відпочивають і наповнюються силою.',
    'З кожним днем я бачу все краще і краще.',
    "М'язи очей стають сильними та слухняними.",
    'Погляд вільний, легкий, без напруження.',
    'Очі розслаблені, чоло розгладжене, брови опущені.',
    'Кров вільно приходить до очей і живить їх.',
    'Зір стає чітким і ясним.',
    'Я дивлюся на світ спокійно і легко.',
    'Кожен рух повертає очам рухливість.',
    'Мої очі здорові, зіркі, відпочилі.',
    'Напруження йде, приходить спокій.',
    'Я бачу далеко і ясно, без зусиль.',
    'Очі рухаються вільно, у будь-який бік.',
    'Світло приходить м\'яко, дивитися приємно.',
    'Я дозволяю очам відпочивати стільки, скільки потрібно.',
    'Тіло само знає, як усе полагодити.'
  ]
};

/* Поток фраз на всё занятие. Идёт непрерывно, независимо от того,
   какое сейчас упражнение: пауза между фразами — две секунды.
   Формула-пароль звучит дважды подряд, между формулами — три
   обычных настроя, чтобы речь не превращалась в заклинание. */
function buildAffirmationFlow(lang) {
  const aff = EYE_AFFIRMATIONS[lang] || EYE_AFFIRMATIONS.ru;
  const pass = EYE_PASSWORDS[lang] || EYE_PASSWORDS.ru;
  const again = EYE_AGAIN[lang] || EYE_AGAIN.ru;

  const flow = [];
  let a = 0;
  pass.forEach(formula => {
    flow.push(formula, again, formula);
    for (let i = 0; i < 3; i++) {
      flow.push(aff[a % aff.length]);
      a++;
    }
  });
  return flow;
}

/* type: 'time' — держим секунды, 'reps' — считаем повторы
   value: секунды или число повторов
   pace:  секунд на один повтор, чтобы вести счёт голосом */
const EYE_EXERCISES = [
  {
    id: 'palming_start', type: 'time', value: 60, source: 'Бейтс',
    ru: {
      name: 'Пальминг',
      desc: 'Тёмный отдых — с него начинается и им заканчивается весь комплекс.',
      how: 'Разотрите ладони до тепла. Сложите их чашечками и накройте закрытые глаза так, чтобы свет не пробивался, а на сами глаза ничего не давило. Пальцы скрестите на лбу, локти поставьте на стол. Смотрите в темноту и ждите, пока цветные пятна не сменятся ровным чёрным. Плечи опустите, челюсть отпустите.'
    },
    en: {
      name: 'Palming',
      desc: 'Rest in darkness — the set opens and closes with it.',
      how: 'Rub your palms warm. Cup them over closed eyes so no light gets through and nothing presses on the eyeballs. Cross fingers on the forehead, elbows on the table. Look into the darkness until coloured patches give way to even black. Drop your shoulders, unclench your jaw.'
    },
    ua: {
      name: 'Пальмінг',
      desc: 'Темний відпочинок — ним комплекс починається і закінчується.',
      how: 'Розітріть долоні до тепла. Складіть їх чашечками і накрийте заплющені очі так, щоб світло не пробивалося, а на очі нічого не тиснуло. Дивіться в темряву, доки кольорові плями не зміняться рівним чорним.'
    }
  },
  {
    id: 'blink', type: 'time', value: 20, source: 'Бейтс',
    ru: {
      name: 'Моргание',
      desc: 'Возвращает слёзную плёнку, которую съедает экран.',
      how: 'Моргайте часто и легко, как крылья бабочки, — не зажмуриваясь. За экраном человек моргает втрое реже обычного, отсюда и сухость, и резь к вечеру.'
    },
    en: {
      name: 'Blinking',
      desc: 'Restores the tear film that screens destroy.',
      how: 'Blink often and lightly, like butterfly wings — no squeezing. At a screen people blink three times less than normal; that is where the dryness comes from.'
    },
    ua: {
      name: 'Кліпання',
      desc: 'Повертає слізну плівку, яку з\'їдає екран.',
      how: 'Кліпайте часто й легко, як крила метелика, — не заплющуючись сильно.'
    }
  },
  {
    id: 'up_down', type: 'reps', value: 8, pace: 4, source: 'Жданов',
    ru: {
      name: 'Вверх — вниз',
      desc: 'Верхняя и нижняя прямые мышцы глаза.',
      how: 'Голова неподвижна, работают только глаза. Медленно переведите взгляд вверх до предела — задержитесь на секунду. Так же вниз. Двигайтесь плавно, без рывков; предел — это где начинает тянуть, а не где больно.'
    },
    en: {
      name: 'Up — down',
      desc: 'Superior and inferior rectus muscles.',
      how: 'Head still, only the eyes move. Slowly look up to the limit, hold a second. Then down the same way. Smooth, no jerks — the limit is where it pulls, not where it hurts.'
    },
    ua: {
      name: 'Вгору — вниз',
      desc: 'Верхній і нижній прямі м\'язи ока.',
      how: 'Голова нерухома, працюють лише очі. Повільно переведіть погляд вгору до межі, затримайтесь на секунду. Так само вниз.'
    }
  },
  {
    id: 'left_right', type: 'reps', value: 8, pace: 4, source: 'Жданов',
    ru: {
      name: 'Влево — вправо',
      desc: 'Боковые мышцы — те, что затекают сильнее всего за монитором.',
      how: 'Голова неподвижна. Взгляд до упора влево, пауза — до упора вправо, пауза. Старайтесь довести до края поля зрения, но без напряжения в висках.'
    },
    en: {
      name: 'Left — right',
      desc: 'Lateral muscles — the ones that stiffen most at a monitor.',
      how: 'Head still. Look as far left as you can, pause — then as far right, pause. Reach the edge of your field of view without straining the temples.'
    },
    ua: {
      name: 'Ліворуч — праворуч',
      desc: 'Бічні м\'язи — ті, що затікають найбільше за монітором.',
      how: 'Голова нерухома. Погляд до упору ліворуч, пауза — до упору праворуч, пауза.'
    }
  },
  {
    id: 'diagonals', type: 'reps', value: 6, pace: 5, source: 'Жданов',
    ru: {
      name: 'Диагонали',
      desc: 'Косые мышцы, обе диагонали по очереди.',
      how: 'Взгляд в левый нижний угол — затем в правый верхний. Повторите, потом смените диагональ: правый нижний — левый верхний. Между сменами моргните пару раз.'
    },
    en: {
      name: 'Diagonals',
      desc: 'Oblique muscles, both diagonals in turn.',
      how: 'Look to the bottom-left corner, then top-right. Repeat, then switch: bottom-right to top-left. Blink twice between switches.'
    },
    ua: {
      name: 'Діагоналі',
      desc: 'Косі м\'язи, обидві діагоналі по черзі.',
      how: 'Погляд у лівий нижній кут — потім у правий верхній. Повторіть, потім змініть діагональ.'
    }
  },
  {
    id: 'rectangle', type: 'reps', value: 5, pace: 6, source: 'Жданов',
    both: true,
    dirs: {
      ru: ['по часовой стрелке', 'против часовой стрелки'],
      en: ['clockwise', 'counter-clockwise'],
      ua: ['за годинниковою стрілкою', 'проти годинникової стрілки']
    },
    ru: {
      name: 'Прямоугольник',
      desc: 'Учит глаз двигаться по прямой, а не рывками.',
      how: 'Нарисуйте взглядом прямоугольник: по верхней стороне слева направо, вниз по правой, справа налево по нижней, вверх по левой. Три раза в одну сторону, потом в обратную. Линии ведите ровно, углы не срезайте.'
    },
    en: {
      name: 'Rectangle',
      desc: 'Teaches the eye to travel in straight lines instead of jumps.',
      how: 'Draw a rectangle with your gaze: along the top left to right, down the right side, back along the bottom, up the left. Three times one way, then reverse. Keep lines straight, do not cut corners.'
    },
    ua: {
      name: 'Прямокутник',
      desc: 'Вчить око рухатися по прямій, а не ривками.',
      how: 'Намалюйте поглядом прямокутник: верхньою стороною ліворуч-праворуч, вниз правою, назад нижньою, вгору лівою.'
    }
  },
  {
    id: 'clock', type: 'reps', value: 5, pace: 7, source: 'Жданов',
    both: true,
    dirs: {
      ru: ['по часовой стрелке', 'против часовой стрелки'],
      en: ['clockwise', 'counter-clockwise'],
      ua: ['за годинниковою стрілкою', 'проти годинникової стрілки']
    },
    ru: {
      name: 'Циферблат',
      desc: 'Круговое движение — работают все мышцы разом.',
      how: 'Представьте перед собой большие часы. Ведите взгляд по кругу через все цифры: 12 — 3 — 6 — 9 и обратно к 12. Круг должен быть круглым, а не овальным: обычно вверх и вниз глаз идёт хуже, чем в стороны, — именно это и выравнивается. Половину повторов по часовой, половину против.'
    },
    en: {
      name: 'Clock face',
      desc: 'Circular movement — every muscle works at once.',
      how: 'Picture a large clock in front of you. Trace the circle through every hour: 12 — 3 — 6 — 9 and back. Keep the circle round, not oval: the eye usually travels worse up and down than sideways, and this is what evens it out. Half the reps clockwise, half counter.'
    },
    ua: {
      name: 'Циферблат',
      desc: 'Круговий рух — працюють усі м\'язи разом.',
      how: 'Уявіть перед собою великий годинник. Ведіть погляд по колу через усі цифри: 12 — 3 — 6 — 9 і назад. Половину повторів за годинниковою, половину проти.'
    }
  },
  {
    id: 'snake', type: 'reps', value: 4, pace: 8, source: 'Жданов',
    both: true,
    dirs: {
      ru: ['слева направо', 'справа налево'],
      en: ['left to right', 'right to left'],
      ua: ['зліва направо', 'справа наліво']
    },
    ru: {
      name: 'Змейка',
      desc: 'Самое сложное движение комплекса — и самое полезное.',
      how: 'Ведите взгляд волной слева направо: вверх-вниз, вверх-вниз, как будто рисуете змейку. Дойдя до края, вернитесь той же волной обратно. В конце обязательно поморгайте — глаза устают именно на этом упражнении.'
    },
    en: {
      name: 'Snake',
      desc: 'The hardest movement in the set — and the most useful.',
      how: 'Trace a wave from left to right: up-down, up-down, drawing a snake. At the edge, come back along the same wave. Blink afterwards — this is the one that tires the eyes.'
    },
    ua: {
      name: 'Змійка',
      desc: 'Найскладніший рух комплексу — і найкорисніший.',
      how: 'Ведіть погляд хвилею зліва направо: вгору-вниз, вгору-вниз. Дійшовши до краю, поверніться тією ж хвилею назад.'
    }
  },
  {
    id: 'near_far', type: 'reps', value: 10, pace: 6, source: 'Аветисов',
    ru: {
      name: 'Близко — далеко',
      desc: 'Метка на стекле. Единственное упражнение с доказанной пользой.',
      how: 'Встаньте у окна на расстоянии вытянутой руки. Поставьте палец (или наклейте метку на стекло) на уровне глаз. Смотрите на палец 4 секунды — затем переведите взгляд вдаль, на самый дальний предмет за окном, и держите 4 секунды. Возвращайтесь. Именно эта смена дистанции тренирует мышцу, которая настраивает хрусталик, — ту самую, что каменеет от постоянного экрана.'
    },
    en: {
      name: 'Near — far',
      desc: 'Mark on the glass. The one exercise with proven benefit.',
      how: 'Stand at a window, an arm\'s length away. Hold a finger (or stick a mark on the glass) at eye level. Look at it for 4 seconds — then switch to the furthest object outside and hold 4 seconds. Return. This distance switching trains the muscle that focuses the lens — the one a screen turns to stone.'
    },
    ua: {
      name: 'Близько — далеко',
      desc: 'Мітка на склі. Єдина вправа з доведеною користю.',
      how: 'Станьте біля вікна на відстані витягнутої руки. Дивіться на палець 4 секунди — потім удалину, на найдальший предмет, 4 секунди.'
    }
  },
  {
    id: 'massage', type: 'time', value: 30, source: 'Бейтс',
    ru: {
      name: 'Массаж точек',
      desc: 'Снимает спазм вокруг глазницы.',
      how: 'Подушечками средних пальцев мягко нажмите на точки у внутренних углов глаз, у бровей и под нижним веком по краю кости. На каждую — три лёгких нажатия. На само глазное яблоко не давите никогда.'
    },
    en: {
      name: 'Pressure points',
      desc: 'Releases the spasm around the eye socket.',
      how: 'With the pads of your middle fingers press gently at the inner corners of the eyes, under the brows and along the lower orbital bone. Three light presses each. Never press on the eyeball itself.'
    },
    ua: {
      name: 'Масаж точок',
      desc: 'Знімає спазм навколо очниці.',
      how: 'Подушечками середніх пальців м\'яко натисніть на точки біля внутрішніх кутів очей, під бровами і під нижньою повікою. На саме око не тисніть ніколи.'
    }
  },
  {
    id: 'palming_end', type: 'time', value: 60, source: 'Бейтс',
    ru: {
      name: 'Пальминг завершающий',
      desc: 'Закрепляет расслабление, с которого начали.',
      how: 'Снова ладони чашечками на закрытые глаза. Ничего не представляйте специально — просто смотрите в темноту. Открывая глаза, не спешите: сначала поморгайте сквозь ладони, потом уберите руки.'
    },
    en: {
      name: 'Closing palming',
      desc: 'Locks in the relaxation you started with.',
      how: 'Cup your palms over closed eyes again. Do not try to picture anything — just look into the dark. Opening up, take your time: blink through the palms first, then lift your hands.'
    },
    ua: {
      name: 'Завершальний пальмінг',
      desc: 'Закріплює розслаблення, з якого починали.',
      how: 'Знову долоні чашечками на заплющені очі. Просто дивіться в темряву. Розплющуючи очі, не поспішайте.'
    }
  }
];

// Длительность упражнения целиком, без учёта уровня.
function eyeStepSeconds(ex) {
  return ex.type === 'time' ? ex.value : ex.value * (ex.pace || 5);
}

/* Собирает комплекс в список шагов.

   Упражнения с направлением идут двумя проходами: сначала в одну
   сторону, потом в другую. Иначе одна пара мышц работает, а
   противоположная только растягивается — и косоглазие в мелком виде
   мы бы этим и тренировали. Время такого упражнения делится пополам,
   чтобы комплекс не стал вдвое длиннее. */
function buildEyeSession(levelId) {
  const level = EYE_LEVELS[levelId] || EYE_LEVELS.normal;
  const steps = [];

  EYE_EXERCISES.forEach(ex => {
    const passes = ex.both ? 2 : 1;
    const base = eyeStepSeconds(ex) / passes;
    for (let pass = 0; pass < passes; pass++) {
      steps.push({
        ex,
        pass,
        reverse: pass === 1,
        seconds: Math.max(6, Math.round(base * level.mul))
      });
    }
  });

  return steps;
}

// Сколько минут займёт комплекс на выбранном уровне.
function eyeSetMinutes(levelId) {
  const sec = buildEyeSession(levelId).reduce((sum, s) => sum + s.seconds, 0);
  return Math.max(1, Math.round(sec / 60));
}

// Сколько всего шагов получится — с учётом проходов в обе стороны.
function eyeStepCount(levelId) {
  return buildEyeSession(levelId).length;
}

// Подпись направления для второго прохода, если оно есть.
function eyeDirLabel(step, lang) {
  if (!step.ex.both || !step.ex.dirs) return '';
  const list = step.ex.dirs[lang] || step.ex.dirs.ru;
  return list[step.pass] || '';
}
