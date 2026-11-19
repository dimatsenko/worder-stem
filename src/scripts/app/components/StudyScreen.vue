<script setup>
import { computed } from 'vue';
import Icon from './Icon.vue';
import AppButton from './AppButton.vue';
import LearningSettings from './LearningSettings.vue';
import StudyToolbar from './StudyToolbar.vue';
import StudyCard from './StudyCard.vue';
import CompleteScreen from './CompleteScreen.vue';
import { STUDY_MODES } from '../modes.js';
import { progressFor } from '../session.js';
import { useStudyActions } from '../composables/study-context.js';
const props = defineProps({
  catalog: Object,
  state: Object,
  ui: Object,
  word: Object,
  studying: Boolean,
  warning: String,
  message: String,
  canUndo: Boolean,
  error: Boolean,
  settingsDraft: Object,
});
const actions = useStudyActions();
const modes = STUDY_MODES;
const progress = computed(() => props.word && progressFor(props.state, props.word.id));
const resume = computed(
  () => props.state?.session && props.state.session.index < props.state.session.queue.length,
);
</script>

<template>
  <section v-if="error" class="app-empty">
    <h1>Не вдалося завантажити колоди</h1>
    <p>Перевір з’єднання й спробуй ще раз. Збережений прогрес залишився в браузері.</p>
    <AppButton action="retry" class="primary">Спробувати ще раз</AppButton>
  </section>
  <template v-else>
    <p v-if="warning" class="app-notice" role="status">{{ warning }}</p>
    <section v-if="!studying" class="level-screen" aria-labelledby="level-selection-title">
      <div class="level-panel">
        <LearningSettings
          :catalog="catalog"
          :selected="state.selected"
          :daily-goal="state.dailyGoal"
          heading-tag="h1"
          heading-id="level-selection-title"
        >
          <AppButton
            :action="resume ? 'resume' : 'start'"
            class="primary"
            :disabled="!state.selected.length"
          >
            {{ resume ? 'Продовжити навчання' : 'Почати навчання' }}
          </AppButton>
        </LearningSettings>
      </div>
      <p class="storage-note">
        Прогрес зберігається в цьому браузері. Без реєстрації та синхронізації з iPhone.
      </p>
    </section>
    <section v-else class="study-screen" :class="{ 'study-finished': !word }" aria-label="Навчання">
      <StudyToolbar :state="state" :can-undo="canUndo" />
      <StudyCard v-if="word" :key="word.id" :word="word" :progress="progress" :ui="ui" />
      <CompleteScreen v-else :state="state" :catalog="catalog" />
    </section>
    <p id="app-message" class="app-message" role="status">{{ message }}</p>
    <template v-if="studying">
      <dialog class="mode-dialog" id="study-mode-dialog" aria-labelledby="mode-title">
        <div class="mode-dialog-heading">
          <h2 id="mode-title">Режим навчання</h2>
          <AppButton action="close-mode" icon="close" class="dialog-close" aria-label="Закрити" />
        </div>
        <div class="mode-options">
          <button
            v-for="mode in modes"
            :key="mode.id"
            type="button"
            class="mode-option"
            data-action="set-mode"
            @click="actions.act('set-mode', mode.id)"
            :data-mode="mode.id"
            :aria-pressed="mode.id === state.mode"
          >
            <span>
              <strong>{{ mode.title }}</strong>
              <span>{{ mode.description }}</span>
            </span>
            <span class="mode-check" aria-hidden="true"><Icon name="check" /></span>
          </button>
        </div>
      </dialog>
      <dialog
        class="mode-dialog settings-dialog"
        id="study-settings-dialog"
        @cancel.prevent="actions.closeSettings()"
        aria-labelledby="settings-title"
      >
        <div class="mode-dialog-heading">
          <h2 id="settings-title">Налаштування</h2>
          <AppButton
            action="close-settings"
            icon="close"
            class="dialog-close"
            aria-label="Закрити"
          />
        </div>
        <LearningSettings
          :catalog="catalog"
          :selected="settingsDraft?.selected ?? state.selected"
          :daily-goal="settingsDraft?.dailyGoal ?? state.dailyGoal"
          heading-tag="h3"
          heading-id="settings-level-title"
        >
          <AppButton
            action="apply-settings"
            class="primary"
            :disabled="!(settingsDraft?.selected ?? state.selected).length"
          >
            Застосувати
          </AppButton>
        </LearningSettings>
      </dialog>
    </template>
  </template>
</template>
