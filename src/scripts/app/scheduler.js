/** Port of Worder/Services/SpacedRepetitionScheduler.swift. Dates use local calendar days. */
export const INITIAL_EASE = 2.5;
export const MAX_INTERVAL = 365;
export const LEECH_THRESHOLD = 8;

export function freshProgress() {
  return {
    status: 'new',
    intervalDays: 0,
    easeFactor: INITIAL_EASE,
    nextReviewDate: null,
    lapses: 0,
  };
}

export function nextDate(now, days) {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

/** SM-2: кількість помилок визначає оцінку якості та наступний коефіцієнт легкості. */
export function updatedEase(ease, fails) {
  const quality = fails === 0 ? 5 : fails === 1 ? 4 : fails === 2 ? 3 : 2;
  return Math.max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
}

export function scheduleLearned(progress, fails, now) {
  return {
    ...progress,
    status: 'learned',
    intervalDays: 1,
    nextReviewDate: nextDate(now, 1),
    easeFactor: updatedEase(progress.easeFactor, fails),
  };
}

export function scheduleRemembered(progress, fails, now) {
  const easeFactor = updatedEase(progress.easeFactor, fails);
  const intervalDays = Math.min(
    MAX_INTERVAL,
    Math.max(2, Math.round(progress.intervalDays * easeFactor)),
  );
  return { ...progress, easeFactor, intervalDays, nextReviewDate: nextDate(now, intervalDays) };
}

export function scheduleForgot(progress, fails, now) {
  const lapses = progress.lapses + (fails <= 1 ? 1 : 0);
  if (fails <= 1 && lapses >= LEECH_THRESHOLD) return { ...freshProgress(), status: 'learning' };
  return {
    ...progress,
    easeFactor: updatedEase(progress.easeFactor, fails),
    intervalDays: 1,
    nextReviewDate: now,
    lapses,
  };
}

export function checkAnswer(input, expected) {
  return input.trim().toLowerCase() === expected.trim().toLowerCase();
}
