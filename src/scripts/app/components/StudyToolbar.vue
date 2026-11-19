<script setup>
import { computed } from 'vue';
import Icon from './Icon.vue';
import { STUDY_MODES } from '../modes.js';
import { useStudyActions } from '../composables/study-context.js';
const props = defineProps({ state: { type: Object, required: true }, canUndo: Boolean });
const mode = computed(
  () => STUDY_MODES.find((mode) => mode.id === props.state.mode) ?? STUDY_MODES[0],
);
const actions = useStudyActions();
</script>

<template>
  <div class="study-toolbar">
    <button
      type="button"
      data-action="settings"
      @click="actions.act('settings')"
      class="app-button study-control"
      aria-haspopup="dialog"
      aria-label="Налаштування"
      title="Налаштування"
    >
      <span class="control-label">
        Налаштування
        <Icon name="chevron" />
      </span>
    </button>
    <button
      type="button"
      data-action="mode"
      @click="actions.act('mode')"
      class="app-button study-control"
      aria-haspopup="dialog"
      :aria-label="'Режим: ' + mode.title"
      :title="'Режим: ' + mode.title"
    >
      <span class="control-label">
        Режим
        <Icon name="chevron" />
      </span>
    </button>
    <div class="study-stats" aria-label="Статистика за сьогодні">
      <span
        :aria-label="'Вивчено ' + state.today.learned + ' слів із денної цілі ' + state.dailyGoal"
      >
        <span>Вивчено</span>
        <strong>{{ state.today.learned }}/{{ state.dailyGoal }}</strong>
      </span>
      <span>
        <span>Повторено</span>
        <strong>{{ state.today.reviewed }}</strong>
      </span>
    </div>
    <button
      type="button"
      data-action="undo"
      @click="actions.act('undo')"
      class="app-button study-control undo-button"
      aria-label="Скасувати"
      title="Скасувати останню дію"
      :disabled="!canUndo"
    >
      <Icon name="undo" />
    </button>
  </div>
</template>
