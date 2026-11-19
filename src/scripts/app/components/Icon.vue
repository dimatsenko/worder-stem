<script setup>
import { computed } from 'vue';
const props = defineProps({ name: { type: String, required: true } });
const paths = {
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  sound: 'm11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  flip: 'M4 10a8 8 0 0 1 14-5l2 3m0-6v6h-6M20 14a8 8 0 0 1-14 5l-2-3m0 6v-6h6',
  undo: 'M9 4 4 9l5 5M4 9h9a7 7 0 0 1 0 14',
  chevron: 'm6 9 6 6 6-6',
};

const path = computed(() => paths[props.name]);
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="path" />
  </svg>
</template>
