import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, createStorage, refreshDay } from '../src/scripts/app/storage.js';
import { createSession, answer } from '../src/scripts/app/session.js';

const now = new Date(2026, 10, 17, 12).getTime();
const words = [{ id: 'example', level: 'a1', word: 'example' }];
const ids = new Set(words.map((word) => word.id));
const memory = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};

test('daily goal survives reload at both bounds and at an intermediate value', () => {
  for (const goal of [5, 21, 30]) {
    const storage = memory();
    const first = createStorage(ids, storage);
    first.state.dailyGoal = goal;
    first.state.session = createSession(words, first.state, now);
    answer(first.state.session, first.state, words, 'right', now);
    first.save(first.state);
    const restored = createStorage(ids, storage);
    assert.equal(restored.state.dailyGoal, goal);
    assert.deepEqual(restored.state.progress, first.state.progress);
    assert.deepEqual(restored.state.session, first.state.session);
    assert.equal(restored.warning, '');
  }
});

test('legacy and invalid goal preferences recover without losing saved learning', () => {
  for (const value of [undefined, null, 4, 31, 10.5, '20']) {
    const state = freshState(now);
    state.dailyGoal = value;
    state.session = createSession(words, state, now);
    answer(state.session, state, words, 'right', now);
    const storage = memory();
    storage.setItem('worder.web.v1', JSON.stringify(state));
    const restored = createStorage(ids, storage);
    assert.equal(restored.state.dailyGoal, 15);
    assert.deepEqual(restored.state.progress, state.progress);
    assert.deepEqual(restored.state.session, state.session);
    assert.equal(restored.warning, '');
    assert.equal(restored.save(restored.state), true);
  }
});

test('the next day resets learned counts and keeps the chosen daily goal', () => {
  const state = freshState(now);
  state.dailyGoal = 30;
  state.today.learned = 12;
  refreshDay(state, now + 86400000);
  assert.equal(state.today.learned, 0);
  assert.equal(state.dailyGoal, 30);
});
