import { isStudyMode } from './modes.js';

const KEY = 'worder.web.v1';
const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1'];

export function dayKey(now = Date.now()) {
  const date = new Date(now);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** Єдина початкова структура збереження; version і KEY сумісні з попередньою версією. */
export function freshState(now = Date.now()) {
  return {
    version: 1,
    selected: ['a1'],
    dailyGoal: 15,
    mode: 'both',
    progress: {},
    today: { date: dayKey(now), learned: 0, reviewed: 0 },
    session: null,
  };
}

export function refreshDay(state, now = Date.now()) {
  if (state.today.date !== dayKey(now))
    state.today = { date: dayKey(now), learned: 0, reviewed: 0 };
}

/** Перевіряє зовнішні дані до використання та відновлює відсутні старі налаштування. */
export function validateState(value, wordIDs) {
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.selected) ||
    !value.progress ||
    !value.today
  )
    throw new Error('Invalid saved data');
  if (!value.selected.every((level) => LEVELS.includes(level)))
    throw new Error('Invalid selection');
  // Older saves have no goal; repair this preference without discarding progress.
  if (!Number.isInteger(value.dailyGoal) || value.dailyGoal < 5 || value.dailyGoal > 30)
    value.dailyGoal = 15;
  value.mode ??= 'both';
  if (!isStudyMode(value.mode)) throw new Error('Invalid study mode');
  for (const [id, progress] of Object.entries(value.progress)) {
    if (
      !wordIDs.has(id) ||
      !['new', 'learning', 'learned', 'skipped'].includes(progress.status) ||
      !Number.isFinite(progress.easeFactor) ||
      progress.easeFactor < 1.3 ||
      !Number.isInteger(progress.intervalDays) ||
      progress.intervalDays < 0 ||
      progress.intervalDays > 365 ||
      !Number.isInteger(progress.lapses) ||
      progress.lapses < 0 ||
      (progress.nextReviewDate !== null && !Number.isFinite(progress.nextReviewDate)) ||
      (progress.status === 'learned' && progress.nextReviewDate === null)
    )
      throw new Error('Invalid progress');
  }
  for (const key of ['learned', 'reviewed']) {
    if (!Number.isInteger(value.today[key]) || value.today[key] < 0)
      throw new Error('Invalid daily count');
  }
  if (value.session) {
    const session = value.session;
    if (
      !Array.isArray(session.queue) ||
      !session.queue.every((id) => wordIDs.has(id)) ||
      !Number.isInteger(session.index) ||
      session.index < 0 ||
      session.index > session.queue.length ||
      !session.fails ||
      !Object.values(session.fails).every((n) => Number.isInteger(n) && n >= 0) ||
      !['learned', 'reviewed', 'skipped'].every(
        (key) => Number.isInteger(session[key]) && session[key] >= 0,
      )
    )
      throw new Error('Invalid session');
  }
  return value;
}

/** Пошкоджене збереження не перезаписується: навчання продовжується в пам’яті. */
export function createStorage(wordIDs, storage) {
  let warning = '';
  let canSave = true;
  let state = freshState();
  try {
    storage ??= window.localStorage;
    const saved = storage.getItem(KEY);
    if (saved) state = validateState(JSON.parse(saved), wordIDs);
    refreshDay(state);
  } catch {
    canSave = false;
    warning =
      'Не вдалося прочитати збереження. Можна вчитися, але прогрес цієї сесії залишиться лише до закриття вкладки. Попередні дані не змінюємо.';
  }
  return {
    state,
    get warning() {
      return warning;
    },
    save(value) {
      if (!canSave) return false;
      try {
        storage.setItem(KEY, JSON.stringify(value));
        return true;
      } catch {
        warning = 'Браузер не дозволяє зберегти прогрес. Він залишиться лише до закриття вкладки.';
        canSave = false;
        return false;
      }
    },
    isExternalChange(event) {
      return event.key === KEY;
    },
  };
}
