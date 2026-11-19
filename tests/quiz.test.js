import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createQuiz, chooseQuizOption } from '../src/scripts/app/quiz.js';

const random = () => 0.5;
const target = { id: 'cat', word: 'cat', translation: 'кіт', level: 'a1', type: 'noun' };
const candidate = (id, extra = {}) => ({
  id,
  word: id,
  translation: `переклад ${id}`,
  level: 'a1',
  type: 'noun',
  ...extra,
});
const distractors = (quiz) => quiz.options.filter((option) => option !== target.word);

test('quiz uses the same level and part of speech before broader candidates', () => {
  const words = [
    target,
    candidate('dog'),
    candidate('bird'),
    candidate('fish'),
    candidate('run', { type: 'verb' }),
    candidate('ocean', { level: 'b2' }),
  ];
  const before = structuredClone(words);
  const quiz = createQuiz(target, words, random);
  assert.equal(quiz.options.length, 4);
  assert.deepEqual(distractors(quiz).sort(), ['bird', 'dog', 'fish']);
  assert.deepEqual(words, before);
  assert.deepEqual(createQuiz(target, words, random), quiz);
});

test('quiz backfills from its level before other levels', () => {
  const quiz = createQuiz(
    target,
    [
      target,
      candidate('dog'),
      candidate('run', { type: 'verb' }),
      candidate('ocean', { level: 'b2' }),
      candidate('mountain', { level: 'c1' }),
    ],
    random,
  );
  assert.ok(quiz.options.includes('dog'));
  assert.ok(quiz.options.includes('run'));
  assert.equal(quiz.options.filter((option) => ['ocean', 'mountain'].includes(option)).length, 1);
});

test('quiz excludes the target, duplicate spellings, empty words and equivalent translations', () => {
  const quiz = createQuiz(
    target,
    [
      target,
      candidate('same-spelling', { word: ' CAT ', translation: 'інший переклад' }),
      candidate('synonym', { word: 'kitty', translation: ' КІТ ' }),
      candidate('empty', { word: '   ' }),
      candidate('dog'),
      candidate('dog-duplicate', { word: ' DOG ' }),
      candidate('bird'),
      candidate('fish'),
    ],
    random,
  );
  assert.equal(new Set(quiz.options.map((option) => option.trim().toLowerCase())).size, 4);
  assert.deepEqual(quiz.options.map((option) => option.toLowerCase()).sort(), [
    'bird',
    'cat',
    'dog',
    'fish',
  ]);
});

test('quiz accepts the correct answer once and rejects invalid or stale choices', () => {
  const quiz = createQuiz(
    target,
    [target, candidate('dog'), candidate('bird'), candidate('fish')],
    random,
  );
  const before = structuredClone(quiz);
  for (const index of [-1, 4, 0.5, NaN, '0'])
    assert.equal(chooseQuizOption(quiz, target, index), false);
  assert.equal(chooseQuizOption(quiz, { ...target, id: 'other' }, 0), false);
  assert.deepEqual(quiz, before);
  const index = quiz.options.indexOf('cat');
  assert.equal(chooseQuizOption(quiz, target, index), true);
  assert.equal(quiz.result, true);
  assert.equal(quiz.selected, index);
  assert.equal(chooseQuizOption(quiz, target, (index + 1) % 4), false);
  assert.equal(quiz.result, true);
});

test('an incorrect choice remains incorrect after another tap', () => {
  const quiz = createQuiz(
    target,
    [target, candidate('dog'), candidate('bird'), candidate('fish')],
    random,
  );
  const wrong = quiz.options.findIndex((option) => option !== target.word);
  assert.equal(chooseQuizOption(quiz, target, wrong), true);
  assert.equal(quiz.result, false);
  assert.equal(chooseQuizOption(quiz, target, quiz.options.indexOf(target.word)), false);
  assert.equal(quiz.selected, wrong);
  assert.equal(quiz.result, false);
});

test('insufficient data fails explicitly instead of introducing keyboard entry or invented answers', () => {
  assert.throws(
    () => createQuiz(target, [target, candidate('dog')], random),
    /three distinct distractors/,
  );
});

test('bundled levels and rare parts of speech all produce four valid choices', () => {
  const catalog = JSON.parse(
    readFileSync(new URL('../assets/data/english.json', import.meta.url), 'utf8'),
  );
  // Cover each level/type pair, including articles, numbers and phrasal entries.
  const representatives = new Map();
  for (const word of catalog.words) representatives.set(`${word.level}:${word.type}`, word);
  for (const word of representatives.values()) {
    const quiz = createQuiz(word, catalog.words, random);
    const normalized = quiz.options.map((option) => option.trim().toLowerCase());
    assert.equal(quiz.options.length, 4, word.id);
    assert.equal(new Set(normalized).size, 4, word.id);
    assert.equal(
      normalized.filter((option) => option === word.word.trim().toLowerCase()).length,
      1,
      word.id,
    );
    assert.ok(
      quiz.options.every((option) =>
        catalog.words.some((candidate) => candidate.word.trim() === option),
      ),
      word.id,
    );
  }
});
