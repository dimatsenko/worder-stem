import { shuffle } from './session.js';
import { checkAnswer } from './scheduler.js';

const normalize = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

/** Native distractor priorities, with four choices every time instead of keyboard entry. */
export function createQuiz(word, words, random = Math.random) {
  const answer = word.word.trim();
  if (!answer) throw new RangeError('A quiz requires a nonempty answer');

  const translation = normalize(word.translation);
  const candidates = words.filter(
    (candidate) =>
      candidate.id !== word.id &&
      normalize(candidate.word) &&
      (!translation || normalize(candidate.translation) !== translation),
  );
  const seen = new Set([normalize(answer)]);
  const distractors = [];
  const tiers = [
    (candidate) =>
      candidate.level === word.level && normalize(candidate.type) === normalize(word.type),
    (candidate) => candidate.level === word.level,
    () => true,
  ];

  for (const matches of tiers) {
    for (const candidate of shuffle(candidates.filter(matches), random)) {
      const spelling = candidate.word.trim();
      const key = normalize(spelling);
      if (seen.has(key)) continue;
      seen.add(key);
      distractors.push(spelling);
      if (distractors.length === 3) break;
    }
    if (distractors.length === 3) break;
  }

  // A malformed future catalog must not produce fake answers or a one-choice test.
  if (distractors.length !== 3) throw new RangeError('A quiz requires three distinct distractors');
  return {
    wordID: word.id,
    options: shuffle([...distractors, answer], random),
    selected: null,
    result: null,
  };
}

/** Accept one choice only, so repeated taps cannot overwrite a failed answer. */
export function chooseQuizOption(quiz, word, index) {
  if (
    !quiz ||
    quiz.wordID !== word.id ||
    quiz.result !== null ||
    quiz.selected !== null ||
    !Array.isArray(quiz.options) ||
    quiz.options.length !== 4 ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= quiz.options.length
  )
    return false;
  quiz.selected = index;
  quiz.result = checkAnswer(quiz.options[index], word.word);
  return true;
}
