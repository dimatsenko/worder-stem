<script setup>
import { computed } from 'vue';
const props = defineProps({ text: { type: String, required: true } });
// Приклад містить *виділені слова*. Vue екранує текст, тому HTML з каталогу не виконується.
const parts = computed(() => props.text.replaceAll('**', '*').split('*'));
</script>

<template>
  <div class="card-detail">
    <h3>Приклад</h3>
    <p class="study-example" lang="en">
      <template v-for="(part, i) in parts" :key="i">
        <mark v-if="i % 2">{{ part }}</mark>
        <template v-else>{{ part }}</template>
      </template>
    </p>
  </div>
</template>
