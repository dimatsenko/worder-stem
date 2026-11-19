import { freshProgress, scheduleLearned, scheduleRemembered, scheduleForgot } from './scheduler.js';
import { includesLearning, includesReview } from './modes.js';

// Ліміт однієї сесії. Денна ціль у налаштуваннях не обмежує навчання.
export const SESSION_NEW_WORDS = 15;
const BATCH_SIZE = 15;
const REVIEW_RATIO = 0.7;
const SAFE_ZONE = 3;
const REINSERT_MIN = 2;
const REINSERT_MAX = 6;

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Помилкове слово повертається після захищеної зони, а не наступною карткою. */
export function reinsertionIndex(index, count, random = Math.random) {
  const safe = index + SAFE_ZONE;
  if (safe >= count) return count;
  const lower = Math.min(safe + REINSERT_MIN, count);
  const upper = Math.min(safe + REINSERT_MAX, count);
  return lower >= upper ? upper : lower + Math.floor(random() * (upper - lower + 1));
}

export function progressFor(state, id) {
  return state.progress[id] ?? freshProgress();
}

/** Повторення беруться з усіх рівнів; нові слова — лише з вибраних колод. */
export function generateBatch(
  words,
  state,
  remainingNewWords,
  excluded,
  now,
  random = Math.random,
) {
  const available = words.filter((word) => !excluded.has(word.id));
  const due = available
    .filter((word) => {
      const wordProgress = progressFor(state, word.id);
      return wordProgress.status === 'learned' && wordProgress.nextReviewDate <= now;
    })
    .sort(
      (a, b) => progressFor(state, a.id).nextReviewDate - progressFor(state, b.id).nextReviewDate,
    );
  const maxReviews = includesReview(state) ? Math.floor(BATCH_SIZE * REVIEW_RATIO) : 0;
  const reviews = due.slice(0, maxReviews);
  const allowedNew = includesLearning(state)
    ? Math.min(Math.max(0, remainingNewWords), BATCH_SIZE - reviews.length)
    : 0;
  const candidates = available
    .filter(
      (word) => state.selected.includes(word.level) && progressFor(state, word.id).status === 'new',
    )
    .slice(0, 100);
  const newWords = shuffle(candidates, random).slice(0, allowedNew);
  const backfill =
    includesReview(state) && newWords.length < allowedNew && reviews.length === maxReviews
      ? due.slice(maxReviews, maxReviews + allowedNew - newWords.length)
      : [];
  return shuffle(
    [...reviews, ...newWords, ...backfill].map((word) => word.id),
    random,
  );
}

export function fillSession(session, words, state, now, random = Math.random) {
  const remaining = Math.max(0, SESSION_NEW_WORDS - session.learned);
  const pending = session.queue.slice(session.index);
  // Keep each session manageable without imposing a daily limit.
  const active = new Set(
    pending.filter((id) => ['new', 'learning'].includes(progressFor(state, id).status)),
  );
  const batch = generateBatch(
    words,
    state,
    Math.max(0, remaining - active.size),
    new Set(session.queue),
    now,
    random,
  );
  session.queue.push(...batch);
}

/** Відновлює слова у навчанні та додає першу порцію нових слів і повторень. */
export function createSession(words, state, now, random = Math.random) {
  const learning = includesLearning(state)
    ? shuffle(
        words
          .filter(
            (word) =>
              state.selected.includes(word.level) &&
              progressFor(state, word.id).status === 'learning',
          )
          .map((word) => word.id),
        random,
      )
    : [];
  const session = {
    queue: [...learning],
    index: 0,
    fails: {},
    learned: 0,
    reviewed: 0,
    skipped: 0,
  };
  fillSession(session, words, state, now, random);
  const others = session.queue.filter((id) => !learning.includes(id));
  learning.forEach((id, i) => others.splice(Math.min(others.length, SAFE_ZONE + i * 2), 0, id));
  session.queue = others;
  return session;
}

/**
 * Застосовує одну відповідь до поточної картки та пересуває чергу.
 * right: нове → у навчанні; правильна відповідь → заплановане повторення.
 * left: нове → пропущене; помилка → повернення картки в чергу.
 * Змінює session і state; час та random передаються для відтворюваних тестів.
 */
export function answer(session, state, words, direction, now, random = Math.random) {
  const id = session.queue[session.index];
  if (!id) return;
  let wordProgress = progressFor(state, id);
  let fails = session.fails[id] ?? 0;
  session.index++;
  let reinsert = false;
  if (wordProgress.status === 'new') {
    wordProgress = { ...wordProgress, status: direction === 'right' ? 'learning' : 'skipped' };
    reinsert = direction === 'right';
    if (!reinsert) session.skipped++;
  } else if (direction === 'left') {
    fails++;
    session.fails[id] = fails;
    if (wordProgress.status === 'learned') {
      wordProgress = scheduleForgot(wordProgress, fails, now);
      if (wordProgress.status === 'learning') delete session.fails[id];
    }
    reinsert = true;
  } else {
    if (wordProgress.status === 'learning') {
      wordProgress = scheduleLearned(wordProgress, fails, now);
      state.today.learned++;
      session.learned++;
    } else {
      wordProgress = scheduleRemembered(wordProgress, fails, now);
      state.today.reviewed++;
      session.reviewed++;
    }
    delete session.fails[id];
  }
  state.progress[id] = wordProgress;
  if (reinsert)
    session.queue.splice(reinsertionIndex(session.index, session.queue.length, random), 0, id);
  if (!reinsert || session.queue.length - session.index <= 5)
    fillSession(session, words, state, now, random);
  if (session.index % 4 === 0) {
    const protectedEnd = session.index + SAFE_ZONE + REINSERT_MAX;
    session.queue = [
      ...session.queue.slice(0, protectedEnd),
      ...shuffle(session.queue.slice(protectedEnd), random),
    ];
  }
}
