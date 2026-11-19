import { inject } from 'vue';

// Один набір команд для всіх вкладених компонентів навчання.
export const STUDY_ACTIONS = Symbol('study-actions');

export function useStudyActions() {
  const actions = inject(STUDY_ACTIONS);
  if (!actions) throw new Error('Study components must be inside App.vue');
  return actions;
}
