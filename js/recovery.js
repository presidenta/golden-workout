/* ===== КОГДА ПОВТОРЯТЬ =====

   Мышца растёт не на тренировке, а после неё, и у каждой группы свой
   срок. Мелкие и выносливые — пресс, икры, суставная гимнастика —
   восстанавливаются за сутки, их можно грузить хоть через день.
   Крупные — ноги, спина, грудь — просят двое суток, а после тяжёлого
   дня и все трое.

   Отсюда правило приложения: после приседаний напоминание приходит
   на третий день, а если день пропущен — повторяется на четвёртый.
   Считаем не по названию упражнения, а по группам мышц, которые оно
   задействует: приседания можно повторить и выпадами, для квадрицепса
   это та же работа.

   Числа — часы отдыха до следующей нагрузки. */
const MUSCLE_RECOVERY = {
  // Сутки: мелкие и выносливые, работают чуть ли не каждый день
  abs: 24, core: 24, calves: 24, joints: 24, mobility: 24,

  // Двое суток: всё остальное, включая ноги и спину.
  // Трое суток нужны после тяжёлой работы с весом; на своём весе
  // и при умеренном объёме сорока восьми часов достаточно — иначе
  // напоминание приходило бы только на четвёртый день, а мышца к
  // этому времени уже начинает терять набранное.
  chest: 48, shoulders: 48, biceps: 48, triceps: 48, lats: 48, back: 48,
  quads: 48, hamstrings: 48, glutes: 48, legs: 48
};

// Если группа новая и в таблице её нет — берём средний срок
const DEFAULT_RECOVERY = 48;

function muscleRecoveryHours(muscle) {
  return MUSCLE_RECOVERY[muscle] || DEFAULT_RECOVERY;
}

/* Разбирает историю тренировок и говорит про каждую группу мышц:
   когда её последний раз грузили, отдохнула ли она и что можно
   повторить.

   Возвращает массив, отсортированный так, что первыми идут группы,
   которые дольше всех ждут работы. */
function analyzeRecovery(workouts, now = Date.now()) {
  const last = {};   // группа → время последней нагрузки

  (workouts || []).forEach(w => {
    // Время тренировки: startTime точнее, но у старых записей его нет
    const at = w.startTime || w.endTime || (w.date ? new Date(w.date + 'T12:00:00').getTime() : 0);
    if (!at) return;

    (w.exercises || []).forEach(log => {
      const ex = EXERCISE_DB[log.exerciseId];
      if (!ex) return;
      (ex.muscles || []).forEach(m => {
        if (!last[m] || at > last[m]) last[m] = at;
      });
    });
  });

  return Object.keys(MUSCLE_RECOVERY).map(muscle => {
    const at = last[muscle] || null;
    const hours = muscleRecoveryHours(muscle);
    const passed = at ? (now - at) / 3600000 : null;
    const ready = at === null || passed >= hours;
    return {
      muscle,
      lastAt: at,
      hoursPassed: passed === null ? null : Math.floor(passed),
      daysPassed: passed === null ? null : Math.floor(passed / 24),
      needHours: hours,
      ready,
      // Сколько ещё отдыхать, в часах
      restLeft: ready ? 0 : Math.ceil(hours - passed),
      // Никогда не тренировали — это не «пора повторить», а «ещё не начинали»
      never: at === null
    };
  }).sort((a, b) => {
    if (a.never !== b.never) return a.never ? 1 : -1;
    if (a.ready !== b.ready) return a.ready ? -1 : 1;
    return (b.hoursPassed || 0) - (a.hoursPassed || 0);
  });
}

/* Что именно предложить повторить. Берём упражнения, которые грузят
   эту группу, и ставим первым то, которое человек уже делал: знакомое
   движение начать проще, чем новое. */
function exercisesForMuscle(muscle, doneIds = []) {
  const all = Object.keys(EXERCISE_DB).filter(id => {
    const ex = EXERCISE_DB[id];
    return ex && (ex.muscles || []).includes(muscle);
  });
  return all.sort((a, b) => {
    const da = doneIds.includes(a) ? 0 : 1;
    const db2 = doneIds.includes(b) ? 0 : 1;
    return da - db2;
  });
}

/* Главная подсказка дня: группа, которая дольше всех готова к работе,
   и упражнения к ней. Пресс и суставная сюда не попадают — они и так
   идут каждый день и напоминания не требуют. */
function recoveryHint(workouts, now = Date.now()) {
  const daily = ['abs', 'core', 'joints', 'mobility', 'calves'];
  const rows = analyzeRecovery(workouts, now)
    .filter(r => !daily.includes(r.muscle) && r.ready && !r.never);

  if (!rows.length) return null;

  const top = rows[0];
  const doneIds = [];
  (workouts || []).forEach(w => (w.exercises || []).forEach(l => {
    if (!doneIds.includes(l.exerciseId)) doneIds.push(l.exerciseId);
  }));

  return {
    muscle: top.muscle,
    daysPassed: top.daysPassed,
    exercises: exercisesForMuscle(top.muscle, doneIds).slice(0, 3)
  };
}
