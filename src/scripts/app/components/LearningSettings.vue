<script setup>
import DailyGoal from './DailyGoal.vue';
import LevelOptions from './LevelOptions.vue';
defineProps({
  catalog: Object,
  selected: Array,
  dailyGoal: Number,
  headingTag: String,
  headingId: String,
});
</script>

<template>
  <div class="learning-settings">
    <DailyGoal :value="dailyGoal" />
    <component :is="headingTag" :id="headingId" class="settings-section-title">
      Рівень англійської
    </component>
    <p class="dialog-description">Обери одну або кілька колод.</p>
    <LevelOptions :catalog="catalog" :selected="selected" />
    <div class="dialog-actions"><slot /></div>
  </div>
</template>
