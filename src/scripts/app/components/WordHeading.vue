<script setup>
import { computed } from 'vue';
import { partOfSpeech } from '../formatters.js';
const props = defineProps({ word: { type: Object, required: true } });
const type = computed(() => partOfSpeech(props.word.type));
</script>

<template>
  <h2 class="study-word" lang="en">
    {{ word.word }}
    <span>{{ type }}</span>
  </h2>
  <p v-if="word.phon_br" class="study-phonetic">{{ word.phon_br }}</p>
</template>
