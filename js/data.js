const EXERCISE_DB = {
  pushups: {
    id: 'pushups', reps: 15, rest: 90,
    muscles: ['chest', 'triceps', 'core'], equipment: 'bodyweight', difficulty: 'beginner',
    frames: ["assets/exercises/pushups/0.jpg", "assets/exercises/pushups/1.jpg"],
    ru: { name: "Классические отжимания", desc: "Грудные мышцы, трицепс и кор.", instructions: "Ладони на ширине плеч. Тело — прямая линия. Опускайтесь, касаясь грудью пола. Локти идут назад под 45°." },
    en: { name: "Classic Push-ups", desc: "Chest, triceps & core.", instructions: "Hands shoulder-width. Body straight line. Lower chest to floor. Elbows 45°." },
    ua: { name: "Класичні віджимання", desc: "Грудні м'язи, трицепс.", instructions: "Долоні на ширині плечей. Тіло — пряма лінія. Опускайтесь грудьми до підлоги." }
  },
  pushups_wide: {
    id: 'pushups_wide', reps: 12, rest: 90,
    muscles: ['chest', 'shoulders'], equipment: 'bodyweight', difficulty: 'beginner',
    frames: ["assets/exercises/pushups_wide/0.jpg", "assets/exercises/pushups_wide/1.jpg"],
    ru: { name: "Отжимания (Широкий хват)", desc: "Акцент на внешнюю часть груди.", instructions: "Ладони шире плеч на 1.5 ладони. Локти в стороны." },
    en: { name: "Wide Push-ups", desc: "Outer pectoral focus.", instructions: "Hands wider than shoulders. Flare elbows out." },
    ua: { name: "Віджимання (Широкий хват)", desc: "Акцент на зовнішню частину грудей.", instructions: "Долоні ширше плечей. Лікті в боки." }
  },
  pushups_diamond: {
    id: 'pushups_diamond', reps: 10, rest: 90,
    muscles: ['triceps', 'chest'], equipment: 'bodyweight', difficulty: 'intermediate',
    frames: ["assets/exercises/pushups_diamond/0.jpg", "assets/exercises/pushups_diamond/1.jpg"],
    ru: { name: "Алмазные отжимания", desc: "Максимальная нагрузка на трицепс.", instructions: "Большие пальцы и указательные пальцы касаются, образуя ромб. Локти прижаты к телу." },
    en: { name: "Diamond Push-ups", desc: "Intense triceps focus.", instructions: "Form diamond with thumbs and index fingers. Keep elbows tight." },
    ua: { name: "Алмазні віджимання", desc: "Навантаження на трицепс.", instructions: "Великі та вказівні пальці торкаються. Лікті біля тіла." }
  },
  squats: {
    id: 'squats', reps: 20, rest: 90,
    muscles: ['quads', 'glutes'], equipment: 'bodyweight', difficulty: 'beginner',
    frames: ["assets/exercises/squats/0.jpg", "assets/exercises/squats/1.jpg"],
    ru: { name: "Классические приседания", desc: "Квадрицепсы и ягодицы.", instructions: "Ноги на ширине плеч. Спина прямая. Колени идут в стороны пальцев ног. Ягодицы ниже колен." },
    en: { name: "Bodyweight Squats", desc: "Quads and glutes.", instructions: "Feet shoulder-width. Back straight. Knees track over toes. Hips below knees." },
    ua: { name: "Класичні присідання", desc: "Квадрицепси та сідниці.", instructions: "Ноги на ширині плечей. Спина пряма. Коліна за пальцями ніг. Сідниці нижче колін." }
  },
  lunges: {
    id: 'lunges', reps: 16, rest: 90,
    muscles: ['quads', 'glutes', 'calves'], equipment: 'bodyweight', difficulty: 'beginner',
    frames: ["assets/exercises/lunges/0.jpg", "assets/exercises/lunges/1.jpg"],
    ru: { name: "Выпады вперед", desc: "Ноги и динамический баланс.", instructions: "Шаг вперед на длину стопы. Заднее колено почти касается пола. Торс вертикально." },
    en: { name: "Forward Lunges", desc: "Legs and stability.", instructions: "Step forward one foot length. Back knee nearly touches floor. Torso upright." },
    ua: { name: "Випади вперед", desc: "Ноги та баланс.", instructions: "Крок вперед на довжину стопи. Заднє коліно майже торкається підлоги." }
  },
  lunges_reverse: {
    id: 'lunges_reverse', reps: 16, rest: 90,
    muscles: ['glutes', 'quads'], equipment: 'bodyweight', difficulty: 'beginner',
    frames: ["assets/exercises/lunges_reverse/0.jpg", "assets/exercises/lunges_reverse/1.jpg"],
    ru: { name: "Обратные выпады", desc: "Безопасная нагрузка на ягодицы.", instructions: "Шаг назад. Вес на передней ноге. Ягодицы передней ноги работают активнее." },
    en: { name: "Reverse Lunges", desc: "Glute focused lunges.", instructions: "Step back. Weight on front foot. Front glute drives the movement." },
    ua: { name: "Зворотні випади", desc: "Робота на сідниці.", instructions: "Крок назад. Вага на передній нозі. Сідниця передньої ноги працює." }
  },
  glute_bridge: {
    id: 'glute_bridge', reps: 20, rest: 60,
    muscles: ['glutes', 'hamstrings'], equipment: 'bodyweight', difficulty: 'beginner',
    frames: ["assets/exercises/glute_bridge/0.jpg", "assets/exercises/glute_bridge/1.jpg"],
    ru: { name: "Ягодичный мостик", desc: "Изолированная прокачка ягодиц.", instructions: "Лопатки на полу. Поднимайте таз, сжимая ягодицы. В верхней точке пауза 1 сек." },
    en: { name: "Glute Bridge", desc: "Home glutes developer.", instructions: "Shoulders on floor. Drive hips up, squeezing glutes. Pause 1 sec at top." },
    ua: { name: "Сідничний місток", desc: "Ізольоване прокачування сідниць.", instructions: "Лопатки на підлозі. Піднімайте таз, стискаючи сідниці. Пауза 1 сек." }
  },
  romanian_dl: {
    id: 'romanian_dl', reps: 15, rest: 90,
    muscles: ['glutes', 'hamstrings', 'back'], equipment: 'dumbbell', difficulty: 'intermediate',
    frames: ["assets/exercises/romanian_dl/0.jpg", "assets/exercises/romanian_dl/1.jpg"],
    ru: { name: "Румынская тяга (гантели)", desc: "Мощный рост ягодиц и бицепса бедра.", instructions: "Спина нейтральная. Гантели близко к голеням. Таз отводится назад. Опускать до растяжения подколенных сухожилий." },
    en: { name: "Dumbbell RDL", desc: "Ultimate glute builder.", instructions: "Neutral spine. Dumbbells close to shins. Hinge at hips. Lower until hamstring stretch." },
    ua: { name: "Румунська тяга (гантелі)", desc: "Ріст сідничних м'язів.", instructions: "Спина нейтральна. Гантелі біля гомілок. Таз назад. Опускати до розтягнення." }
  },
  crunches: {
    id: 'crunches', reps: 20, rest: 60,
    muscles: ['abs'], equipment: 'bodyweight', difficulty: 'beginner',
    frames: ["assets/exercises/crunches/0.jpg", "assets/exercises/crunches/1.jpg"],
    ru: { name: "Скручивания на пресс", desc: "Проработка мышц живота.", instructions: "Руки за головой, не тяните шею. Лопатки отрываются от пола. Поясница прижата." },
    en: { name: "Ab Crunches", desc: "Core definition.", instructions: "Hands behind head, don't pull neck. Shoulders off floor. Lower back pressed." },
    ua: { name: "Скручування на прес", desc: "М'язи живота.", instructions: "Руки за головою, не тягніть шию. Лопатки відриваються. Поясниця притиснута." }
  },
  biceps_curl: {
    id: 'biceps_curl', reps: 15, rest: 60,
    muscles: ['biceps'], equipment: 'dumbbell', difficulty: 'beginner',
    frames: ["assets/exercises/biceps_curl/0.jpg", "assets/exercises/biceps_curl/1.jpg"],
    ru: { name: "Сгибания на бицепс", desc: "Проработка рук с гантелями.", instructions: "Локти не отрывать от тела. Предплечья двигаются строго вертикально. В верхней точке супинация (ладони вверх)." },
    en: { name: "Dumbbell Bicep Curl", desc: "Arm strength builder.", instructions: "Elbows fixed at sides. Forearms vertical. Supinate at top (palms up)." },
    ua: { name: "Згинання на біцепс", desc: "Прокачування рук.", instructions: "Лікті біля тіла. Передпліччя вертикально. Вгорі долоні вгору." }
  },
  shoulder_press: {
    id: 'shoulder_press', reps: 12, rest: 90,
    muscles: ['shoulders', 'triceps'], equipment: 'dumbbell', difficulty: 'intermediate',
    frames: ["assets/exercises/shoulder_press/0.jpg", "assets/exercises/shoulder_press/1.jpg"],
    ru: { name: "Жим гантелей стоя", desc: "Развитие плечевого пояса.", instructions: "Гантели у плеч. Ладони вперед. Жим строго вверх, не разводя локти в стороны." },
    en: { name: "Dumbbell Shoulder Press", desc: "Deltoid developer.", instructions: "Dumbbells at shoulders. Palms forward. Press straight up, don't flare elbows." },
    ua: { name: "Жим гантелей стоячи", desc: "Розвиток дельт.", instructions: "Гантелі біля плечей. Долоні вперед. Жим вгору, не розводячи лікті." }
  },
  plank: {
    id: 'plank', reps: 60, rest: 60,
    muscles: ['core', 'shoulders'], equipment: 'bodyweight', difficulty: 'beginner',
    frames: ["assets/exercises/plank/0.jpg", "assets/exercises/plank/1.jpg"],
    ru: { name: "Планка (сек)", desc: "Статический кор и стабилизаторы.", instructions: "Локти под плечами. Тело — прямая доска. Не провисать поясницей. Дышать." },
    en: { name: "Plank (sec)", desc: "Static core stability.", instructions: "Elbows under shoulders. Body straight plank. Don't sag lower back. Breathe." },
    ua: { name: "Планка (сек)", desc: "Статичний кор.", instructions: "Лікті під плечима. Тіло — пряма дошка. Не провисати поясницею. Дихайте." }
  },
  mountain_climbers: {
    id: 'mountain_climbers', reps: 30, rest: 60,
    muscles: ['core', 'shoulders', 'legs'], equipment: 'bodyweight', difficulty: 'intermediate',
    frames: ["assets/exercises/mountain_climbers/0.jpg", "assets/exercises/mountain_climbers/1.jpg"],
    ru: { name: "Скалолаз", desc: "Динамический пресс и выносливость.", instructions: "Планка. Колени поочередно к груди. Таз не поднимать. Ритмично." },
    en: { name: "Mountain Climbers", desc: "Dynamic core & stamina.", instructions: "Plank. Alternate knees to chest. Keep hips down. Rhythmic." },
    ua: { name: "Скелелаз", desc: "Динамічний прес.", instructions: "Планка. Коліна по черзі до грудей. Таз не піднімати. Ритмічно." }
  },
  calf_raises: {
    id: 'calf_raises', reps: 25, rest: 60,
    muscles: ['calves'], equipment: 'bodyweight', difficulty: 'beginner',
    frames: ["assets/exercises/calf_raises/0.jpg", "assets/exercises/calf_raises/1.jpg"],
    ru: { name: "Подъемы на носки", desc: "Икроножные мышцы.", instructions: "На полу или возвышении. Поднимайтесь на носки максимально высоко. Пауза вверху. Медленно вниз." },
    en: { name: "Standing Calf Raise", desc: "Calves developer.", instructions: "On floor or step. Rise onto balls of feet as high as possible. Pause at top. Slow down." },
    ua: { name: "Підйоми на носки", desc: "Литки.", instructions: "На підлозі чи підвищенні. Піднімайтесь на носки. Пауза вгорі. Повільно вниз." }
  },
  triceps_dips: {
    id: 'triceps_dips', reps: 12, rest: 90,
    muscles: ['triceps', 'chest'], equipment: 'bodyweight', difficulty: 'beginner',
    frames: ["assets/exercises/triceps_dips/0.jpg", "assets/exercises/triceps_dips/1.jpg"],
    ru: { name: "Обратные отжимания от скамьи", desc: "Мощная проработка трицепса.", instructions: "Спина близко к скамье. Локти назад, не в стороны. Опускайтесь до 90° в локтях." },
    en: { name: "Bench Dips", desc: "Triceps isolation.", instructions: "Back close to bench. Elbows back, not out. Lower to 90° elbow bend." },
    ua: { name: "Зворотні віджимання", desc: "Прокачування трицепса.", instructions: "Спина близько до лавки. Лікті назад. Опускайтесь до 90°." }
  },
  goltis_joint: {
    id: 'goltis_joint', reps: 15, rest: 30,
    muscles: ['joints', 'mobility'], equipment: 'bodyweight', difficulty: 'beginner',
    frames: ["assets/exercises/goltis_joint/0.jpg", "assets/exercises/goltis_joint/1.jpg"],
    ru: { name: "Суставная гимнастика (Голтис)", desc: "Импульсная микрокапилярная активация.", instructions: "Мягкие круговые движения в суставах без усилий. Дыхание спокойное. Не форсировать." },
    en: { name: "Goltis Joint Routine", desc: "Micro-capillary activation.", instructions: "Gentle circular joint movements without force. Breathe calmly. Don't push." },
    ua: { name: "Суглобова гімнастика (Голтис)", desc: "Імпульсна активація.", instructions: "М'які кругові рухи в суглобах. Дихання спокійне. Не форсувати." }
  },

  /* ===== СКЛАДНАЯ ДОСКА ДЛЯ ОТЖИМАНИЙ =====
     Ручки переставляются по цветным гнёздам, и от цвета зависит,
     какая мышца работает. Разметка с самой доски:
     синий — грудь, зелёный — трицепс, красный — плечи, жёлтый — спина.
     Ограничение по весу — около 100 кг. */

  board_blue: {
    id: 'board_blue', reps: 12, rest: 90,
    muscles: ['chest'], equipment: 'push-up board', difficulty: 'beginner',
    frames: [],
    board: { color: 'blue', slot: 'blue', grip: 'along' },
    ru: {
      name: "Доска · Синий (грудь)",
      desc: "Большая грудная мышца, средний и нижний пучок.",
      instructions: "СИНИЕ гнёзда — широкие, по краям доски. Ручки вставьте вдоль тела, вырезом к себе. Ладони под плечами или чуть шире. Тело прямое от пяток до макушки. Опускайтесь, пока грудь не окажется на уровне ручек — доска позволяет уйти ниже пола, в этом её смысл: грудная мышца растягивается сильнее, чем при обычных отжиманиях. Локти уходят назад под 45°, не в стороны. Вверх на выдохе, до конца, но локти не защёлкивайте."
    },
    en: {
      name: "Board · Blue (chest)",
      desc: "Pectoralis major, mid and lower fibres.",
      instructions: "BLUE slots — the wide ones at the edges. Handles along the body. Palms under or slightly wider than shoulders. Body straight. Lower until the chest is level with the handles — the board lets you go below floor level, which stretches the chest further than a normal push-up. Elbows back at 45°, not out. Push up on the exhale without locking the elbows."
    },
    ua: {
      name: "Дошка · Синій (груди)",
      desc: "Великий грудний м'яз, середній і нижній пучок.",
      instructions: "СИНІ гнізда — широкі, по краях дошки. Ручки вставте вздовж тіла. Долоні під плечима або трохи ширше. Тіло пряме. Опускайтесь, доки груди не будуть на рівні ручок — дошка дозволяє піти нижче підлоги, у цьому її сенс. Лікті назад під 45°, не в боки. Вгору на видиху."
    }
  },
  board_blue_wide: {
    id: 'board_blue_wide', reps: 10, rest: 90,
    muscles: ['chest'], equipment: 'push-up board', difficulty: 'intermediate',
    frames: [],
    board: { color: 'blue', slot: 'blueWide', grip: 'across' },
    ru: {
      name: "Доска · Синий широкий (внешняя грудь)",
      desc: "Внешний край грудных, зона подмышки.",
      instructions: "Те же СИНИЕ гнёзда, но ручки разверните поперёк, вырезом наружу. Руки шире плеч на полторы ладони. Амплитуда короче обычной — не гонитесь за глубиной, следите за натяжением по внешнему краю груди. Локти разводятся шире, но не до прямого угла с телом: плечо этого не любит. Вариант тяжелее базового, поэтому повторов меньше."
    },
    en: {
      name: "Board · Blue wide (outer chest)",
      desc: "Outer chest, the area near the armpit.",
      instructions: "Same BLUE slots, but turn the handles across, opening outwards. Hands wider than shoulders. Shorter range than the base version — chase the stretch along the outer chest, not the depth. Elbows open wider but never to a right angle with the body."
    },
    ua: {
      name: "Дошка · Синій широкий (зовнішні груди)",
      desc: "Зовнішній край грудних, зона пахви.",
      instructions: "Ті самі СИНІ гнізда, але ручки розверніть упоперек. Руки ширше плечей. Амплітуда коротша — стежте за натягом по зовнішньому краю грудей, а не за глибиною."
    }
  },
  board_green: {
    id: 'board_green', reps: 10, rest: 90,
    muscles: ['triceps'], equipment: 'push-up board', difficulty: 'intermediate',
    frames: [],
    board: { color: 'green', slot: 'green', grip: 'along' },
    ru: {
      name: "Доска · Зелёный (трицепс)",
      desc: "Трицепс — задняя поверхность руки, все три головки.",
      instructions: "ЗЕЛЁНЫЕ гнёзда — узкие, ближе к центру доски. Ручки вдоль тела, кисти почти под грудиной, между ладонями ладонь расстояния. Локти прижаты к рёбрам и скользят строго назад вдоль тела — это главное условие, иначе нагрузка уйдёт в грудь и плечи. Опускайтесь медленно, на три счёта, вверх быстрее. Плечи не поднимайте к ушам. Тяжело — делайте с колен, техника важнее числа."
    },
    en: {
      name: "Board · Green (triceps)",
      desc: "Triceps, all three heads.",
      instructions: "GREEN slots — narrow, closer to the centre. Handles along the body, hands almost under the sternum. Elbows pinned to the ribs, sliding straight back — this is the whole point, otherwise the load shifts to chest and shoulders. Lower slowly on a count of three, push up faster. Do it from the knees if needed."
    },
    ua: {
      name: "Дошка · Зелений (трицепс)",
      desc: "Трицепс — задня поверхня руки, усі три головки.",
      instructions: "ЗЕЛЕНІ гнізда — вузькі, ближче до центру. Ручки вздовж тіла, кисті майже під грудиною. Лікті притиснуті до ребер і ковзають назад — інакше навантаження піде в груди. Опускайтесь повільно, на три рахунки. Важко — робіть з колін."
    }
  },
  board_red: {
    id: 'board_red', reps: 10, rest: 90,
    muscles: ['shoulders'], equipment: 'push-up board', difficulty: 'intermediate',
    frames: [],
    board: { color: 'red', slot: 'red', grip: 'along' },
    ru: {
      name: "Доска · Красный (плечи)",
      desc: "Передняя и средняя дельта, верх груди.",
      instructions: "КРАСНЫЕ гнёзда — центральные, вдоль красной стрелки. Встаньте так, чтобы таз был выше плеч, тело углом — чем острее угол, тем больше работы уходит с груди на плечи. Опускайтесь макушкой к полу перед ручками, а не грудью вниз. Локти под 45°. Взгляд в пол между ладонями, шею не роняйте и не задирайте. Мало нагрузки — поставьте ноги на диван, станет заметно тяжелее."
    },
    en: {
      name: "Board · Red (shoulders)",
      desc: "Front and side delts, upper chest.",
      instructions: "RED slots — central, along the red arrow. Set up with hips above shoulders, body in a pike — the sharper the angle, the more the load moves from chest to shoulders. Lower the crown of your head towards the floor in front of the handles, not your chest down. Elbows at 45°. Put your feet on a sofa to make it harder."
    },
    ua: {
      name: "Дошка · Червоний (плечі)",
      desc: "Передня та середня дельта, верх грудей.",
      instructions: "ЧЕРВОНІ гнізда — центральні, вздовж червоної стрілки. Таз вище плечей, тіло кутом — що гостріший кут, то більше роботи йде на плечі. Опускайтесь маківкою до підлоги перед ручками. Лікті під 45°. Ноги на диван — стане важче."
    }
  },
  board_yellow: {
    id: 'board_yellow', reps: 12, rest: 90,
    muscles: ['back', 'lats'], equipment: 'push-up board', difficulty: 'intermediate',
    frames: [],
    board: { color: 'yellow', slot: 'yellow', grip: 'across' },
    ru: {
      name: "Доска · Жёлтый (спина и осанка)",
      desc: "Широчайшие, ромбовидные, трапеция — то, что держит осанку.",
      instructions: "ЖЁЛТЫЕ гнёзда — самые нижние и широкие. Ручки разверните поперёк. Работа идёт не руками, а лопатками: опускаясь, сводите лопатки вместе, будто зажимаете между ними карандаш; поднимаясь, разводите и толкайте пол от себя. Глубина здесь не главное — можно опускаться наполовину, лишь бы лопатки двигались. Именно этот хват разгибает сутулую спину, поэтому делайте его медленно и с паузой внизу."
    },
    en: {
      name: "Board · Yellow (back and posture)",
      desc: "Lats, rhomboids, traps — the muscles that hold your posture.",
      instructions: "YELLOW slots — the lowest and widest. Turn the handles across. The work is done by the shoulder blades, not the arms: squeeze them together as you lower, as if holding a pencil between them; spread them and push the floor away as you rise. Depth is secondary — half range is fine as long as the blades move."
    },
    ua: {
      name: "Дошка · Жовтий (спина та постава)",
      desc: "Найширші, ромбоподібні, трапеція — м'язи постави.",
      instructions: "ЖОВТІ гнізда — найнижчі та найширші. Ручки розверніть упоперек. Працюють не руки, а лопатки: опускаючись, зводьте їх разом; піднімаючись, розводьте. Глибина другорядна — головне рух лопаток. Саме цей хват розгинає сутулу спину."
    }
  }
};

// name — на трёх языках, чтобы переключатель менял и названия программ
const DEFAULT_PROGRAMS = {
  fullbody: {
    name: { ru: 'Full-Body База', en: 'Full-Body Base', ua: 'Full-Body База' },
    exercises: ['pushups', 'squats', 'lunges', 'crunches']
  },
  glutes: {
    name: { ru: 'Ягодицы & Ноги', en: 'Glutes & Legs', ua: 'Сідниці & Ноги' },
    exercises: ['glute_bridge', 'romanian_dl', 'lunges_reverse', 'calf_raises']
  },
  arms_chest: {
    name: { ru: 'Грудь & Руки', en: 'Chest & Arms', ua: 'Груди & Руки' },
    exercises: ['pushups_wide', 'biceps_curl', 'triceps_dips', 'pushups_diamond']
  },
  cardio_core: {
    name: { ru: 'Кардио & Кор', en: 'Cardio & Core', ua: 'Кардіо & Кор' },
    exercises: ['mountain_climbers', 'squats', 'plank', 'crunches']
  },
  goltis: {
    name: { ru: 'Голтис Импульс', en: 'Goltis Impulse', ua: 'Голтіс Імпульс' },
    exercises: ['goltis_joint', 'squats', 'glute_bridge', 'plank']
  },
  // Все четыре цвета доски за одну тренировку
  push_board: {
    name: { ru: 'Доска (все цвета)', en: 'Board (all colours)', ua: 'Дошка (всі кольори)' },
    exercises: ['board_blue', 'board_green', 'board_red', 'board_yellow']
  },
  push_board_chest: {
    name: { ru: 'Доска · Грудь и трицепс', en: 'Board · Chest & triceps', ua: 'Дошка · Груди і трицепс' },
    exercises: ['board_blue', 'board_blue_wide', 'board_green', 'board_yellow']
  }
};


/* ===== БЕГОВАЯ ДОРОЖКА SPORTOP T5 WAVE DECK =====
   План перехода от часовой ходьбы к получасу непрерывного бега.
   Отправная точка: час ходьбы на 4–5 км/ч, при беге появляется одышка.
   Три занятия в неделю, между ними день отдыха или ходьбы.

   Числа (скорости, минуты, повторы) одни для всех языков — меняются
   только подписи и пояснения. */

const TREADMILL = {
  model: 'Sportop T5 Wave Deck',

  // w — номер недели, run/walk — минуты и скорость, sets — сколько раз
  // повторить связку, total — вся тренировка с разминкой, runTotal — чистый бег
  plan: [
    { w: 1,  run: 1,  runSpeed: '6.5–7.0', walk: 2, walkSpeed: '5.0', sets: 8, total: 34, runTotal: 8 },
    { w: 2,  run: 2,  runSpeed: '6.5–7.0', walk: 2, walkSpeed: '5.0', sets: 6, total: 34, runTotal: 12 },
    { w: 3,  run: 3,  runSpeed: '7.0',     walk: 2, walkSpeed: '5.0', sets: 5, total: 35, runTotal: 15 },
    { w: 4,  run: 5,  runSpeed: '7.0',     walk: 2, walkSpeed: '5.0', sets: 4, total: 38, runTotal: 20 },
    { w: 5,  run: 7,  runSpeed: '7.0–7.5', walk: 2, walkSpeed: '5.0', sets: 3, total: 37, runTotal: 21 },
    { w: 6,  run: 10, runSpeed: '7.0–7.5', walk: 3, walkSpeed: '5.0', sets: 2, total: 36, runTotal: 20 },
    { w: 7,  run: 12, runSpeed: '7.5',     walk: 3, walkSpeed: '5.0', sets: 2, total: 40, runTotal: 24 },
    { w: 8,  run: 20, runSpeed: '7.0–7.5', walk: 0, walkSpeed: '',    sets: 1, total: 30, runTotal: 20 },
    { w: 9,  run: 25, runSpeed: '7.5',     walk: 0, walkSpeed: '',    sets: 1, total: 35, runTotal: 25 },
    { w: 10, run: 30, runSpeed: '7.5–8.0', walk: 0, walkSpeed: '',    sets: 1, total: 40, runTotal: 30 }
  ],

  ru: {
    goal: 'От часа ходьбы — к 30 минутам бега',
    specs: [
      ['Скорость', 'до 18 км/ч'],
      ['Наклон', '15 уровней, кнопки 3 / 6 / 9 / 12 %'],
      ['Двигатель', '2–2.5 л.с.'],
      ['Полотно', 'Wave Deck — шестисекционная амортизация, бережёт колени'],
      ['Программы', '20 встроенных + 3 своих, пульсовые режимы']
    ],
    rule: 'Разговорный тест: во время бега вы должны выговаривать короткую фразу, не задыхаясь. Не получается — снижайте скорость на 0.5 км/ч. Одышка означает, что темп взят выше вашего сегодняшнего, а не что вы слабы.',
    titles: { weeks: 'План по неделям', walk: 'Дни без бега', tips: 'Правила' },
    ui: { week: 'Неделя', totalMin: 'всего', min: 'мин', runOf: 'бега', run: 'бег', walk: 'ходьба', nonstop: 'без остановок', times: 'раза' },
    notes: [
      'Бег короткий специально. Задача недели — приучить сердце к смене темпа, а не устать.',
      'Если после первой недели ноги тяжёлые — повторите первую неделю ещё раз. Спешить некуда.',
      'С этой недели бег суммарно обгоняет ходьбу по нагрузке. Следите за дыханием: вдох носом на два шага, выдох ртом на два.',
      'Первый серьёзный рубеж. Пять минут подряд — это уже бег, а не пробежки между ходьбой.',
      'Отдых сокращается. Если тяжело — оставьте скорость 7.0 и не поднимайте.',
      'Десять минут без остановки. Психологически это сложнее, чем физически.',
      'Предпоследний шаг к цели. Держите ровный темп, не разгоняйтесь в начале.',
      'Двадцать минут непрерывно. Скорость можно снизить — важна непрерывность, а не быстрота.',
      'Почти цель. Если дыхание сбивается — сбросьте до 6.5 и добегите.',
      'Цель достигнута: полчаса непрерывного бега. Дальше можно наращивать скорость, а не время.'
    ],
    walkDays: [
      { title: 'Ходьба в горку', body: 'Час на 4.5–5.0 км/ч с наклоном 3–6 %. Пульс поднимается как при беге, а ударной нагрузки на колени нет. Лучший вариант в дни между беговыми.' },
      { title: 'Длинная ровная', body: 'Час на 5.0–5.5 км/ч, наклон 0–2 %. То, что вы уже делаете. Хорошо восстанавливает после беговых дней.' },
      { title: 'Переменная ходьба', body: '10 подходов: 2 минуты на наклоне 8–10 % (скорость 4.0–4.5), затем 2 минуты на ровном. Готовит сердце к интервалам без бега.' }
    ],
    tips: [
      'Разминка и заминка обязательны: 5 минут спокойной ходьбы 4.0–4.5 км/ч до и после. Их время уже включено в общую длительность.',
      'Наклон 1–2 % при беге делает дорожку ближе к улице и снимает нагрузку с голени.',
      'При одышке снижайте скорость, но не переходите на шаг сразу — сначала попробуйте сбросить полкилометра в час.',
      'Три занятия в неделю, между ними минимум один день без бега. Мышцы растут в отдыхе, а не на дорожке.',
      'Боль в колене или голени — остановка и день отдыха. Терпеть нельзя.',
      'Если пропустили неделю — вернитесь на шаг назад и повторите предыдущую.'
    ]
  },

  ua: {
    goal: 'Від години ходьби — до 30 хвилин бігу',
    specs: [
      ['Швидкість', 'до 18 км/год'],
      ['Нахил', '15 рівнів, кнопки 3 / 6 / 9 / 12 %'],
      ['Двигун', '2–2.5 к.с.'],
      ['Полотно', 'Wave Deck — шестисекційна амортизація, береже коліна'],
      ['Програми', '20 вбудованих + 3 власні, пульсові режими']
    ],
    rule: 'Розмовний тест: під час бігу ви маєте вимовляти коротку фразу, не задихаючись. Не виходить — знижуйте швидкість на 0.5 км/год. Задишка означає, що темп узятий вищий за ваш сьогоднішній, а не що ви слабкі.',
    titles: { weeks: 'План по тижнях', walk: 'Дні без бігу', tips: 'Правила' },
    ui: { week: 'Тиждень', totalMin: 'усього', min: 'хв', runOf: 'бігу', run: 'біг', walk: 'ходьба', nonstop: 'без зупинок', times: 'рази' },
    notes: [
      'Біг короткий навмисно. Завдання тижня — привчити серце до зміни темпу, а не втомитися.',
      'Якщо після першого тижня ноги важкі — повторіть перший тиждень ще раз. Поспішати нікуди.',
      'Із цього тижня біг сумарно випереджає ходьбу за навантаженням. Стежте за диханням: вдих носом на два кроки, видих ротом на два.',
      'Перший серйозний рубіж. П\'ять хвилин поспіль — це вже біг, а не пробіжки між ходьбою.',
      'Відпочинок скорочується. Якщо важко — залиште швидкість 7.0 і не піднімайте.',
      'Десять хвилин без зупинки. Психологічно це складніше, ніж фізично.',
      'Передостанній крок до мети. Тримайте рівний темп, не розганяйтесь на початку.',
      'Двадцять хвилин безперервно. Швидкість можна знизити — важлива безперервність, а не швидкість.',
      'Майже мета. Якщо дихання збивається — скиньте до 6.5 і добіжіть.',
      'Мету досягнуто: півгодини безперервного бігу. Далі можна нарощувати швидкість, а не час.'
    ],
    walkDays: [
      { title: 'Ходьба вгору', body: 'Година на 4.5–5.0 км/год з нахилом 3–6 %. Пульс піднімається як під час бігу, а ударного навантаження на коліна немає. Найкращий варіант у дні між біговими.' },
      { title: 'Довга рівна', body: 'Година на 5.0–5.5 км/год, нахил 0–2 %. Те, що ви вже робите. Добре відновлює після бігових днів.' },
      { title: 'Змінна ходьба', body: '10 підходів: 2 хвилини на нахилі 8–10 % (швидкість 4.0–4.5), потім 2 хвилини на рівному. Готує серце до інтервалів без бігу.' }
    ],
    tips: [
      'Розминка і заминка обов\'язкові: 5 хвилин спокійної ходьби 4.0–4.5 км/год до і після. Їхній час уже враховано в загальній тривалості.',
      'Нахил 1–2 % під час бігу робить доріжку ближчою до вулиці та знімає навантаження з гомілки.',
      'При задишці знижуйте швидкість, але не переходьте на крок одразу — спершу спробуйте скинути пів кілометра на годину.',
      'Три заняття на тиждень, між ними щонайменше один день без бігу. М\'язи ростуть у відпочинку, а не на доріжці.',
      'Біль у коліні чи гомілці — зупинка і день відпочинку. Терпіти не можна.',
      'Якщо пропустили тиждень — поверніться на крок назад і повторіть попередній.'
    ]
  },

  en: {
    goal: 'From an hour of walking to 30 minutes of running',
    specs: [
      ['Speed', 'up to 18 km/h'],
      ['Incline', '15 levels, buttons 3 / 6 / 9 / 12 %'],
      ['Motor', '2–2.5 HP'],
      ['Deck', 'Wave Deck — six-section cushioning, easy on the knees'],
      ['Programs', '20 built-in + 3 custom, heart rate modes']
    ],
    rule: 'Talk test: while running you should be able to speak a short sentence without gasping. If you cannot, drop the speed by 0.5 km/h. Breathlessness means the pace is above your current level, not that you are weak.',
    titles: { weeks: 'Week by week', walk: 'Non-running days', tips: 'Rules' },
    ui: { week: 'Week', totalMin: 'total', min: 'min', runOf: 'running', run: 'run', walk: 'walk', nonstop: 'non-stop', times: 'times' },
    notes: [
      'The runs are short on purpose. This week teaches the heart to switch pace, not to exhaust you.',
      'If your legs feel heavy after week one, repeat week one. There is no rush.',
      'From this week running outweighs walking. Watch your breath: in through the nose for two steps, out through the mouth for two.',
      'First real milestone. Five minutes straight is running, not jogging between walks.',
      'Rest gets shorter. If it is hard, keep the speed at 7.0 and do not raise it.',
      'Ten minutes without stopping. Harder mentally than physically.',
      'One step short of the goal. Hold an even pace, do not start fast.',
      'Twenty minutes non-stop. Lower the speed if needed — continuity matters more than pace.',
      'Almost there. If breathing breaks down, drop to 6.5 and finish the run.',
      'Goal reached: half an hour of continuous running. From here grow the speed, not the time.'
    ],
    walkDays: [
      { title: 'Uphill walk', body: 'One hour at 4.5–5.0 km/h with 3–6 % incline. Heart rate rises as in running, with no impact on the knees. Best choice between running days.' },
      { title: 'Long flat walk', body: 'One hour at 5.0–5.5 km/h, incline 0–2 %. What you already do. Good recovery after running days.' },
      { title: 'Interval walk', body: '10 rounds: 2 minutes at 8–10 % incline (speed 4.0–4.5), then 2 minutes flat. Prepares the heart for intervals without running.' }
    ],
    tips: [
      'Warm-up and cool-down are mandatory: 5 minutes of easy walking at 4.0–4.5 km/h before and after. Their time is already in the totals.',
      'A 1–2 % incline while running makes the treadmill feel like outdoors and unloads the shins.',
      'When out of breath, lower the speed — but do not drop to a walk straight away, try half a km/h first.',
      'Three sessions a week with at least one non-running day between them. Muscles grow during rest, not on the treadmill.',
      'Knee or shin pain means stop and take a rest day. Do not push through it.',
      'If you skipped a week, go one step back and repeat the previous one.'
    ]
  }
};

const WARMUP_EXERCISES = ['goltis_joint', 'squats'];
const COOLDOWN_EXERCISES = ['plank', 'goltis_joint'];
