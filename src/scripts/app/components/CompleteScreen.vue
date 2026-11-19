<script setup>
import { computed } from 'vue';
import Icon from './Icon.vue';
import AppButton from './AppButton.vue';
import { includesLearning } from '../modes.js';
import { progressFor } from '../session.js';
const props = defineProps({ state: Object, catalog: Object });
const learned = computed(() => props.state.session?.learned ?? 0);
const reviewed = computed(() => props.state.session?.reviewed ?? 0);
const hasNew = computed(() =>
  props.catalog.words.some(
    (word) =>
      props.state.selected.includes(word.level) &&
      progressFor(props.state, word.id).status === 'new',
  ),
);
const remaining = computed(() => includesLearning(props.state) && hasNew.value);
const reviewOnly = computed(() => props.state.mode === 'review');
const title = computed(() =>
  learned.value || reviewed.value
    ? 'Сесію завершено!'
    : reviewOnly.value
      ? 'Поки немає слів до повторення'
      : 'Усе повторено',
);
const message = computed(() => {
  const scheduled = Object.values(props.state.progress)
    .filter((progress) => progress.status === 'learned' && progress.nextReviewDate > Date.now())
    .map((progress) => progress.nextReviewDate);
  const next = scheduled.length
    ? new Date(Math.min(...scheduled)).toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'long',
      })
    : null;
  if (next) return `Наступне повторення: ${next}.`;
  if (reviewOnly.value)
    return 'Вивчи нові слова — вони з’являться тут, коли настане час повторити.';
  return remaining.value
    ? 'Продовжуй у своєму темпі — можна вчити далі.'
    : 'У вибраних колодах немає нових слів. Спробуй інший рівень.';
});
</script>

<template>
  <div class="app-empty">
    <div class="complete-icon"><Icon name="check" /></div>
    <h1>{{ title }}</h1>
    <p v-if="learned || reviewed">{{ learned }} нових слів вивчено · {{ reviewed }} повторено.</p>
    <p>{{ message }}</p>
    <div class="complete-actions">
      <AppButton v-if="remaining" action="start" class="primary">Вчити далі</AppButton>
      <AppButton v-if="reviewOnly && hasNew" action="learn" class="primary">
        Вчити нові слова
      </AppButton>
      <AppButton
        action="decks"
        :class="remaining || (reviewOnly && hasNew) ? 'secondary' : 'primary'"
      >
        До колод
      </AppButton>
    </div>
  </div>
</template>
