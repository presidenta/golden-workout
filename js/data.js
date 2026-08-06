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
  }
};

const DEFAULT_PROGRAMS = {
  fullbody: { name: 'Full-Body База', exercises: ['pushups', 'squats', 'lunges', 'crunches'] },
  glutes: { name: 'Ягодицы & Ноги', exercises: ['glute_bridge', 'romanian_dl', 'lunges_reverse', 'calf_raises'] },
  arms_chest: { name: 'Грудь & Руки', exercises: ['pushups_wide', 'biceps_curl', 'triceps_dips', 'pushups_diamond'] },
  cardio_core: { name: 'Кардио & Кор', exercises: ['mountain_climbers', 'squats', 'plank', 'crunches'] },
  goltis: { name: 'Голтис Импульс', exercises: ['goltis_joint', 'squats', 'glute_bridge', 'plank'] }
};

const WARMUP_EXERCISES = ['goltis_joint', 'squats'];
const COOLDOWN_EXERCISES = ['plank', 'goltis_joint'];
