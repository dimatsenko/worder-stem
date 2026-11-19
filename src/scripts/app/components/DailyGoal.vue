<script setup>
import { computed } from 'vue';
import { dailyWordLabel } from '../formatters.js';
import { useStudyActions } from '../composables/study-context.js';
const props = defineProps({ value: { type: Number, required: true } });
const wordLabel = computed(() => dailyWordLabel(props.value));
const actions = useStudyActions();
</script>

<template>
  <div class="daily-goal">
    <label class="daily-goal-heading">
      <span>Нових слів на день</span>
      <strong>{{ value }}</strong>
      <input
        class="daily-goal-slider"
        data-daily-goal
        @input="actions.setDailyGoal(Number($event.target.value))"
        type="range"
        min="5"
        max="30"
        step="1"
        :value="value"
        :style="{ '--goal-fill': ((value - 5) / 25) * 100 + '%' }"
        aria-label="Нових слів на день"
        :aria-valuetext="value + ' ' + wordLabel + ' на день'"
      />
    </label>
  </div>
</template>
