/** Browser adapter: pronunciation has no effect on learning progress. */
export function speakWord(word, onMessage) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    onMessage('Озвучення недоступне в цьому браузері.');
    return;
  }
  const speech = window.speechSynthesis;
  speech.cancel();
  const utterance = new SpeechSynthesisUtterance(word.word);
  utterance.lang = 'en-GB';
  utterance.rate = 0.85;
  const voices = speech.getVoices();
  const voice =
    voices.find((voice) => voice.lang === 'en-GB') ??
    voices.find((voice) => voice.lang.startsWith('en'));
  if (voice) utterance.voice = voice;
  utterance.onerror = () =>
    onMessage('Не вдалося озвучити слово. Спробуй ще раз або продовжуй без звуку.');
  speech.speak(utterance);
}
