<script setup>
import Icon from './Icon.vue';
import { formatWordCount } from '../formatters.js';
import { useStudyActions } from '../composables/study-context.js';
defineProps({
  catalog: { type: Object, required: true },
  selected: { type: Array, required: true },
});
const actions = useStudyActions();
</script>

<template>
  <div class="mode-options" role="group" aria-label="Колоди за рівнями англійської">
    <button
      v-for="deck in catalog.decks"
      :key="deck.id"
      type="button"
      class="mode-option"
      data-action="toggle-level"
      @click="actions.act('toggle-level', deck.id)"
      :data-level="deck.id"
      :aria-pressed="selected.includes(deck.id)"
    >
      <span>
        <strong>{{ deck.title }} · {{ deck.description }}</strong>
        <span>{{ formatWordCount(deck.count) }}</span>
      </span>
      <span class="mode-check" aria-hidden="true"><Icon name="check" /></span>
    </button>
  </div>
</template>
