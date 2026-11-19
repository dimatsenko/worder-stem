import { nextTick, onBeforeUnmount, onMounted, shallowRef } from 'vue';
import { createStorage, refreshDay } from '../storage.js';
import { createSession, answer, progressFor } from '../session.js';
import { createQuiz, chooseQuizOption } from '../quiz.js';
import { createHistory } from '../history.js';
import { isStudyMode } from '../modes.js';
import { initCardGestures, animateCardChange, animateCardFlip } from '../card-motion.js';
import { speakWord } from '../speech.js';

/**
 * Координує навчання: команда → алгоритм → збереження → знімок для Vue.
 * Алгоритми працюють зі звичайними об'єктами; компоненти отримують їхні копії.
 * shallowRef повідомляє Vue лише про готову зміну, а не про кожен крок алгоритму.
 */
export function useStudyApp(root) {
  const view = shallowRef(null);
  const history = createHistory();
  const lifetime = new AbortController();
  let catalog;
  let wordMap;
  let store;
  let state;
  let ui = { flipped: false, quiz: null };
  let message = '';
  let settingsDraft = null;
  let busy = false;
  let disposed = false;
  let cardGestures;

  const currentWord = () => wordMap?.get(state?.session?.queue[state.session.index]);
  const dialog = (name) => root.querySelector(`#study-${name}-dialog`);
  const save = () => store.save(state);

  function resetCard() {
    ui = { flipped: false, quiz: null };
    cardGestures?.reset();
    window.speechSynthesis?.cancel();
  }

  function updateView() {
    if (disposed) return;
    refreshDay(state);
    const studying = location.hash === '#study' && Boolean(state.session);
    const word = studying ? currentWord() : undefined;
    if (word && progressFor(state, word.id).status !== 'new' && ui.quiz?.wordID !== word.id) {
      ui.quiz = createQuiz(word, catalog.words);
    }
    view.value = {
      catalog,
      state: structuredClone(state),
      ui: structuredClone(ui),
      word,
      studying,
      warning: store.warning,
      message,
      canUndo: history.canUndo,
      settingsDraft: structuredClone(settingsDraft),
    };
    root.classList.toggle('is-studying', studying);
    // Анімації й діалоги мають працювати вже з оновленим DOM.
    return nextTick();
  }

  function navigate(destination) {
    const hash = destination === 'study' ? '#study' : '#decks';
    if (location.hash === hash) {
      updateView();
      window.scrollTo(0, 0);
    } else {
      location.hash = hash;
    }
  }

  function canGrade(direction) {
    if (busy || disposed || location.hash !== '#study' || !state?.session) return false;
    const word = currentWord();
    return (
      Boolean(word) &&
      (direction === 'left' ||
        progressFor(state, word.id).status === 'new' ||
        ui.quiz?.result != null)
    );
  }

  async function withAnimation(run) {
    if (busy || disposed) return;
    busy = true;
    root.setAttribute('aria-busy', 'true');
    try {
      await run();
    } finally {
      busy = false;
      root.removeAttribute('aria-busy');
    }
  }

  async function grade(direction) {
    if (!canGrade(direction)) return;
    const session = state.session;
    const effectiveDirection = ui.quiz?.result === false ? 'left' : direction;
    await withAnimation(() =>
      animateCardChange(root, effectiveDirection, async () => {
        // Back/Forward або інша вкладка могли замінити сесію під час анімації.
        if (disposed || state.session !== session || location.hash !== '#study') return;
        refreshDay(state);
        history.record(state);
        answer(session, state, catalog.words, effectiveDirection, Date.now());
        resetCard();
        save();
        await updateView();
        window.scrollTo(0, 0);
      }),
    );
  }

  async function flipCard() {
    const word = currentWord();
    if (!word || (progressFor(state, word.id).status !== 'new' && ui.quiz?.result == null)) return;
    const cardState = ui;
    await withAnimation(() =>
      animateCardFlip(root, () => {
        if (disposed || ui !== cardState) return;
        ui.flipped = !ui.flipped;
        return updateView();
      }),
    );
  }

  async function chooseOption(index) {
    const word = currentWord();
    if (!word || !chooseQuizOption(ui.quiz, word, index)) return;
    const cardState = ui;
    await withAnimation(() =>
      animateCardFlip(root, () => {
        if (disposed || ui !== cardState) return;
        ui.flipped = true;
        return updateView();
      }),
    );
  }

  async function setMode(mode) {
    if (!isStudyMode(mode)) return;
    dialog('mode')?.close();
    if (state.mode !== mode) {
      state.mode = mode;
      history.clear();
      state.session = createSession(catalog.words, state, Date.now());
      resetCard();
      save();
      await updateView();
    }
    root.querySelector('[data-action="mode"]')?.focus();
  }

  async function openSettings() {
    settingsDraft = { selected: [...state.selected], dailyGoal: state.dailyGoal };
    await updateView();
    dialog('settings')?.showModal();
  }

  async function closeSettings() {
    dialog('settings')?.close();
    settingsDraft = null;
    await updateView();
    root.querySelector('[data-action="settings"]')?.focus();
  }

  async function toggleLevel(level) {
    if (!catalog.decks.some((deck) => deck.id === level)) return;
    const selection = settingsDraft && dialog('settings')?.open ? settingsDraft : state;
    selection.selected = selection.selected.includes(level)
      ? selection.selected.filter((id) => id !== level)
      : [...selection.selected, level];
    if (selection === settingsDraft) {
      updateView();
      return;
    }
    state.session = null;
    history.clear();
    save();
    await updateView();
    root.querySelector(`[data-level="${level}"]`)?.focus();
  }

  function setDailyGoal(goal) {
    if (!state || !Number.isInteger(goal) || goal < 5 || goal > 30) return;
    if (settingsDraft && dialog('settings')?.open) {
      settingsDraft.dailyGoal = goal;
    } else {
      state.dailyGoal = goal;
      save();
    }
    updateView();
  }

  function applySettings() {
    if (!settingsDraft?.selected.length) return;
    const selected = catalog.decks
      .filter((deck) => settingsDraft.selected.includes(deck.id))
      .map((deck) => deck.id);
    state.dailyGoal = settingsDraft.dailyGoal;
    if (
      selected.length !== state.selected.length ||
      selected.some((level) => !state.selected.includes(level))
    ) {
      state.selected = selected;
      history.clear();
      state.session = createSession(catalog.words, state, Date.now());
      resetCard();
    }
    save();
    return closeSettings();
  }

  function startSession() {
    refreshDay(state);
    history.clear();
    state.session = createSession(catalog.words, state, Date.now());
    resetCard();
    save();
    navigate('study');
  }

  function undo() {
    refreshDay(state);
    if (!history.undo(state)) return;
    resetCard();
    save();
    updateView();
  }

  function speak() {
    const word = currentWord();
    if (!word) return;
    speakWord(word, (text) => {
      if (!disposed) {
        message = text;
        updateView();
      }
    });
  }

  // Явна таблиця команд: компонент передає дію та значення, а не DOM-елемент.
  const commands = {
    start: startSession,
    resume: () => {
      resetCard();
      navigate('study');
    },
    decks: () => {
      resetCard();
      navigate('decks');
    },
    settings: openSettings,
    'close-settings': closeSettings,
    'toggle-level': toggleLevel,
    'apply-settings': applySettings,
    mode: () => dialog('mode')?.showModal(),
    'close-mode': () => dialog('mode')?.close(),
    'set-mode': setMode,
    learn: () => setMode('learn'),
    flip: flipCard,
    'choose-option': chooseOption,
    left: () => grade('left'),
    right: () => grade('right'),
    undo,
    speak,
    retry: () => location.reload(),
  };

  function act(action, value) {
    if (busy || disposed || (!state && action !== 'retry')) return;
    message = '';
    return commands[action]?.(value);
  }

  function onKeydown(event) {
    if (
      location.hash !== '#study' ||
      !state?.session ||
      root.querySelector('dialog[open]') ||
      event.target.closest('input,textarea,button,a,[role="button"]')
    )
      return;
    const action = { ArrowLeft: 'left', ArrowRight: 'right', ' ': 'flip' }[event.key];
    if (action) {
      event.preventDefault();
      act(action);
    }
  }

  function onNavigation() {
    if (!state) return;
    dialog('settings')?.close();
    settingsDraft = null;
    resetCard();
    updateView();
    window.scrollTo(0, 0);
  }

  function onStorage(event) {
    if (!store?.isExternalChange(event)) return;
    store = createStorage(new Set(wordMap.keys()));
    state = store.state;
    dialog('settings')?.close();
    settingsDraft = null;
    history.clear();
    resetCard();
    message = 'Прогрес оновлено з іншої вкладки.';
    updateView();
  }

  async function boot() {
    try {
      const response = await fetch('assets/data/english.json', { signal: lifetime.signal });
      if (!response.ok) throw new Error('Could not load decks');
      catalog = await response.json();
      if (disposed) return;
      if (catalog.version !== 1 || !catalog.words?.length || !catalog.decks?.length) {
        throw new Error('Invalid catalog');
      }
      wordMap = new Map(catalog.words.map((word) => [word.id, word]));
      store = createStorage(new Set(wordMap.keys()));
      state = store.state;
      await updateView();
    } catch {
      if (!disposed) view.value = { error: true };
    }
  }

  onMounted(() => {
    const options = { signal: lifetime.signal };
    document.addEventListener('keydown', onKeydown, options);
    window.addEventListener('hashchange', onNavigation, options);
    window.addEventListener('storage', onStorage, options);
    cardGestures = initCardGestures(root, {
      onSwipe: grade,
      canSwipe: canGrade,
      isLocked: () => busy,
    });
    boot();
  });

  onBeforeUnmount(() => {
    disposed = true;
    lifetime.abort();
    cardGestures?.destroy();
    window.speechSynthesis?.cancel();
  });

  return { view, actions: { act, setDailyGoal, closeSettings } };
}
