/** Matches Models/StudyMode.swift in Worder. */
export const STUDY_MODES = [
  { id: 'both', title: 'Разом', description: 'Нові слова й повторення в одній сесії.' },
  { id: 'learn', title: 'Нові слова', description: 'Нові слова та ті, які ще вивчаєш.' },
  { id: 'review', title: 'Повторення', description: 'Слова з усіх рівнів, які вже час повторити.' },
];
export const isStudyMode = (value) => STUDY_MODES.some((mode) => mode.id === value);
export const includesLearning = (state) => state.mode !== 'review';
export const includesReview = (state) => state.mode !== 'learn';
