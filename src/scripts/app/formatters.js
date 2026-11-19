const ukrainianPlural = new Intl.PluralRules('uk');

export function formatWordCount(count) {
  const noun = { one: 'слово', few: 'слова' }[ukrainianPlural.select(count)] ?? 'слів';
  return `${count.toLocaleString('uk-UA')} ${noun}`;
}

export function dailyWordLabel(count) {
  return { one: 'нове слово', few: 'нові слова' }[ukrainianPlural.select(count)] ?? 'нових слів';
}

export function partOfSpeech(type) {
  return (
    {
      noun: 'n.',
      verb: 'v.',
      adjective: 'adj.',
      adverb: 'adv.',
      preposition: 'prep.',
      pronoun: 'pron.',
      conjunction: 'conj.',
      determiner: 'det.',
    }[type] ?? type
  );
}
