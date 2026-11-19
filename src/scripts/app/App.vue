<script setup>
import { provide } from 'vue';
import StudyScreen from './components/StudyScreen.vue';
import { useStudyApp } from './composables/useStudyApp.js';
import { STUDY_ACTIONS } from './composables/study-context.js';

const props = defineProps({ root: { type: Object, required: true } });
const { view, actions } = useStudyApp(props.root);
provide(STUDY_ACTIONS, actions);
</script>

<template>
  <StudyScreen v-if="view" v-bind="view" />
  <div v-else class="app-empty" role="status">
    <h1>Готуємо твої колоди…</h1>
    <p>Завантажуємо англійські слова.</p>
  </div>
</template>
