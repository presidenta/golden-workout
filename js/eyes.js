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

const EYE_SET_VERSION = 1;

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

// Сколько минут занимает весь комплекс — считаем честно, по шагам.
function eyeSetMinutes() {
  const sec = EYE_EXERCISES.reduce((sum, ex) => {
    return sum + (ex.type === 'time' ? ex.value : ex.value * (ex.pace || 5));
  }, 0);
  return Math.max(1, Math.round(sec / 60));
}

// Длительность одного шага в секундах — для таймера.
function eyeStepSeconds(ex) {
  return ex.type === 'time' ? ex.value : ex.value * (ex.pace || 5);
}
