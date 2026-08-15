/* ===== ЗАНЯТИЕ НА БЕГОВОЙ ДОРОЖКЕ =====

   План по неделям лежит в data.js (TREADMILL.plan) — там сказано, что
   делать, но не сказано, когда переключать скорость. Здесь план
   разворачивается в последовательность интервалов, по которой можно
   идти с таймером, не считая минуты в уме и не подглядывая в таблицу.

   Раскладка одной тренировки:
     5 минут разминочной ходьбы
     sets × (бег run минут + ходьба walk минут)
     5 минут заминки

   Именно из этого складывается total в плане: например, третья неделя —
   5 + 5×(3+2) + 5 = 35 минут. Разминку и заминку не выбрасываем: они
   входят в общее время и нужны коленям. */

// Разминка и заминка одинаковы для всех недель
const TREADMILL_EDGES = { minutes: 5, speed: '4.0–4.5' };

function treadmillWeekPlan(weekNo) {
  return TREADMILL.plan.find(p => p.w === Number(weekNo)) || TREADMILL.plan[0];
}

/* Интервалы одного занятия.
   kind: warmup | run | walk | cooldown */
function buildTreadmillSession(weekNo) {
  const w = treadmillWeekPlan(weekNo);
  const steps = [];

  steps.push({ kind: 'warmup', minutes: TREADMILL_EDGES.minutes, speed: TREADMILL_EDGES.speed });

  for (let i = 0; i < w.sets; i++) {
    steps.push({ kind: 'run', minutes: w.run, speed: w.runSpeed, set: i + 1, of: w.sets });
    // На последних неделях ходьбы между забегами уже нет
    if (w.walk > 0) {
      steps.push({ kind: 'walk', minutes: w.walk, speed: w.walkSpeed, set: i + 1, of: w.sets });
    }
  }

  steps.push({ kind: 'cooldown', minutes: TREADMILL_EDGES.minutes, speed: TREADMILL_EDGES.speed });
  return steps;
}

/* Скорости в плане записаны так, как их читает человек: «7.0–7.5».
   Для расчёта километров берём середину вилки. */
function treadmillSpeedValue(speed) {
  const nums = String(speed || '').replace(',', '.').match(/\d+(?:\.\d+)?/g);
  if (!nums || !nums.length) return 0;
  return nums.map(Number).reduce((a, b) => a + b, 0) / nums.length;
}

// Сколько всего минут, сколько из них бега и сколько выйдет километров
function treadmillTotals(weekNo) {
  const steps = buildTreadmillSession(weekNo);
  const km = steps.reduce((sum, s) => sum + treadmillSpeedValue(s.speed) * s.minutes / 60, 0);
  const runKm = steps.filter(s => s.kind === 'run')
    .reduce((sum, s) => sum + treadmillSpeedValue(s.speed) * s.minutes / 60, 0);
  return {
    minutes: steps.reduce((sum, s) => sum + s.minutes, 0),
    runMinutes: steps.filter(s => s.kind === 'run').reduce((sum, s) => sum + s.minutes, 0),
    km: Math.round(km * 10) / 10,
    runKm: Math.round(runKm * 10) / 10,
    intervals: steps.length
  };
}

// Короткая строка про неделю: «5 × (3 бег / 2 шаг)» или «30 мин без остановок»
function treadmillWeekSummary(weekNo, lang) {
  const w = treadmillWeekPlan(weekNo);
  const ui = (TREADMILL[lang] || TREADMILL.ru).ui;
  if (!w.walk) return `${w.run} ${ui.min} ${ui.nonstop}`;
  return `${w.sets} × (${w.run} ${ui.run} / ${w.walk} ${ui.walk})`;
}

// Сколько недель в плане — для переключателя
function treadmillWeekCount() {
  return TREADMILL.plan.length;
}
