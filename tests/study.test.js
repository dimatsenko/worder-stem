import test from 'node:test';
import assert from 'node:assert/strict';
import {
  freshProgress,
  scheduleLearned,
  scheduleRemembered,
  scheduleForgot,
  checkAnswer,
} from '../src/scripts/app/scheduler.js';
import {
  createSession,
  answer,
  generateBatch,
  reinsertionIndex,
  SESSION_NEW_WORDS,
} from '../src/scripts/app/session.js';
import {
  freshState,
  createStorage,
  refreshDay,
  validateState,
} from '../src/scripts/app/storage.js';
import { createHistory } from '../src/scripts/app/history.js';

const now = new Date(2026, 10, 12, 12).getTime();
const words = Array.from({ length: 60 }, (_, i) => ({
  id: `word-${i}`,
  level: i < 30 ? 'a1' : 'b1',
  word: `word${i}`,
}));
const random = () => 0.5;

test('SM-2 first learning matches Swift reference cases', () => {
  for (const [fails, ease] of [
    [0, 2.6],
    [1, 2.5],
    [2, 2.36],
    [5, 2.18],
  ]) {
    const p = scheduleLearned(freshProgress(), fails, now);
    assert.equal(p.status, 'learned');
    assert.equal(p.intervalDays, 1);
    assert.ok(Math.abs(p.easeFactor - ease) < 0.000001);
    assert.equal(new Date(p.nextReviewDate).getDate(), 13);
  }
});
test('SM-2 review growth, floor and yearly cap match iOS', () => {
  const p = { ...freshProgress(), status: 'learned', intervalDays: 10 };
  assert.equal(scheduleRemembered(p, 0, now).intervalDays, 26);
  assert.equal(
    scheduleRemembered({ ...p, intervalDays: 1, easeFactor: 1.3 }, 9, now).intervalDays,
    2,
  );
  assert.equal(scheduleRemembered({ ...p, intervalDays: 300 }, 0, now).intervalDays, 365);
});
test('forgotten reviews are due now and count only one lapse per session', () => {
  let p = { ...freshProgress(), status: 'learned', intervalDays: 40 };
  p = scheduleForgot(p, 1, now);
  assert.equal(p.nextReviewDate, now);
  assert.equal(p.intervalDays, 1);
  assert.equal(p.lapses, 1);
  p = scheduleForgot(p, 2, now);
  assert.equal(p.lapses, 1);
  p = scheduleForgot({ ...p, lapses: 7 }, 1, now);
  assert.equal(p.status, 'learning');
  assert.equal(p.easeFactor, 2.5);
  assert.equal(p.lapses, 0);
});
test('batch mixes 10 due reviews from any level with 5 selected new words', () => {
  const state = freshState(now);
  for (const word of words.slice(30, 45))
    state.progress[word.id] = { ...freshProgress(), status: 'learned', nextReviewDate: now - 1 };
  const batch = generateBatch(words, state, 15, new Set(), now, random);
  assert.equal(batch.length, 15);
  assert.equal(batch.filter((id) => state.progress[id]?.status === 'learned').length, 10);
  assert.equal(batch.filter((id) => !state.progress[id]).length, 5);
  assert.ok(
    batch
      .filter((id) => !state.progress[id])
      .every((id) => words.find((w) => w.id === id).level === 'a1'),
  );
});
test('native learning and review modes filter the queue without losing progress', () => {
  const state = freshState(now);
  state.progress['word-0'] = { ...freshProgress(), status: 'learning' };
  for (const word of words.slice(30, 45))
    state.progress[word.id] = { ...freshProgress(), status: 'learned', nextReviewDate: now - 1 };
  state.progress['word-45'] = {
    ...freshProgress(),
    status: 'learned',
    nextReviewDate: now + 10000,
  };
  const originalProgress = structuredClone(state.progress);
  state.mode = 'learn';
  const learning = createSession(words, state, now, random);
  assert.ok(learning.queue.includes('word-0'));
  assert.ok(
    learning.queue.every((id) => !state.progress[id] || state.progress[id].status === 'learning'),
  );
  state.mode = 'review';
  const reviewing = createSession(words, state, now, random);
  assert.equal(reviewing.queue.length, 10);
  assert.ok(
    reviewing.queue.every(
      (id) => state.progress[id].status === 'learned' && state.progress[id].nextReviewDate <= now,
    ),
  );
  assert.deepEqual(state.progress, originalProgress);
});
test('undo restores every answer, queue, failure and counter without a step cap', () => {
  const state = freshState(now);
  state.session = createSession(words, state, now, random);
  const original = structuredClone(state);
  const history = createHistory();
  let steps = 0;
  while (state.session.index < state.session.queue.length && steps < 100) {
    history.record(state);
    answer(state.session, state, words, steps++ % 5 === 0 ? 'left' : 'right', now, random);
  }
  assert.ok(steps > 20);
  let undos = 0;
  while (history.canUndo) {
    assert.ok(history.undo(state));
    undos++;
  }
  assert.equal(undos, steps);
  assert.deepEqual(state, original);
  assert.equal(history.undo(state), false);
});
test('undo after midnight preserves the new day statistics', () => {
  const state = freshState(now);
  state.session = createSession(words, state, now, random);
  const history = createHistory();
  history.record(state);
  answer(state.session, state, words, 'right', now, random);
  const tomorrow = now + 86400000;
  refreshDay(state, tomorrow);
  const today = structuredClone(state.today);
  history.undo(state);
  assert.deepEqual(state.today, today);
  assert.equal(state.session.index, 0);
});
test('reinsertion protects the next three cards and stays in the 2–6 gap', () => {
  assert.equal(
    reinsertionIndex(1, 20, () => 0),
    6,
  );
  assert.equal(
    reinsertionIndex(1, 20, () => 0.999),
    10,
  );
  assert.equal(reinsertionIndex(1, 3, random), 3);
});
test('sessions complete after 15 new words and allow learning beyond 15 in one day', () => {
  const state = freshState(now);
  const session = createSession(words, state, now, random);
  let steps = 0;
  while (session.index < session.queue.length && steps++ < 100)
    answer(session, state, words, 'right', now, random);
  assert.equal(state.today.learned, SESSION_NEW_WORDS);
  assert.equal(session.learned, SESSION_NEW_WORDS);
  assert.equal(session.index, session.queue.length);
  assert.equal(
    Object.values(state.progress).filter((p) => p.status === 'learned').length,
    SESSION_NEW_WORDS,
  );
  const nextSession = createSession(words, state, now, random);
  assert.equal(nextSession.queue.length, SESSION_NEW_WORDS);
  steps = 0;
  while (nextSession.index < nextSession.queue.length && steps++ < 100)
    answer(nextSession, state, words, 'right', now, random);
  assert.equal(state.today.learned, 30);
  assert.equal(nextSession.learned, SESSION_NEW_WORDS);
});
test('incorrect learning answers reappear and lower the eventual ease', () => {
  const one = words.slice(0, 1);
  const state = freshState(now);
  const session = createSession(one, state, now, random);
  answer(session, state, one, 'right', now, random);
  answer(session, state, one, 'left', now, random);
  answer(session, state, one, 'left', now, random);
  answer(session, state, one, 'right', now, random);
  assert.equal(state.today.learned, 1);
  assert.ok(Math.abs(state.progress['word-0'].easeFactor - 2.36) < 0.000001);
});
test('skipping does not count as learned and next local day resets statistics', () => {
  const state = freshState(now);
  const session = createSession(words, state, now, random);
  const id = session.queue[0];
  answer(session, state, words, 'left', now, random);
  assert.equal(state.progress[id].status, 'skipped');
  assert.equal(state.today.learned, 0);
  state.today.learned = 15;
  refreshDay(state, new Date(2026, 10, 13, 0, 1).getTime());
  assert.equal(state.today.learned, 0);
});
test('answer checker preserves native case/edge whitespace semantics', () => {
  assert.ok(checkAnswer(' Hello ', 'hello'));
  assert.ok(!checkAnswer('ice  cream', 'ice cream'));
});
test('progress and queue survive storage roundtrip', () => {
  const values = new Map();
  const memory = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const ids = new Set(words.map((w) => w.id));
  const first = createStorage(ids, memory);
  first.state.mode = 'learn';
  first.state.session = createSession(words, first.state, now, random);
  answer(first.state.session, first.state, words, 'right', now, random);
  first.save(first.state);
  const second = createStorage(ids, memory);
  assert.deepEqual(second.state.progress, first.state.progress);
  assert.deepEqual(second.state.session, first.state.session);
  assert.equal(second.state.mode, 'learn');
  const legacy = freshState(now);
  delete legacy.mode;
  assert.equal(validateState(legacy, ids).mode, 'both');
});
test('broken storage never overwrites previous data and quota failure is visible', () => {
  let writes = 0;
  const broken = createStorage(new Set(), {
    getItem: () => '{broken',
    setItem: () => {
      writes++;
    },
  });
  assert.ok(broken.warning);
  assert.equal(broken.save(broken.state), false);
  assert.equal(writes, 0);
  const full = createStorage(new Set(), {
    getItem: () => null,
    setItem: () => {
      throw new Error('quota');
    },
  });
  assert.equal(full.save(full.state), false);
  assert.ok(full.warning);
  assert.throws(() => validateState({ version: 99 }, new Set()));
});
