<script setup>
import Icon from './Icon.vue';
import { useStudyActions } from '../composables/study-context.js';
defineProps({ action: String, icon: String, disabled: Boolean });
const actions = useStudyActions();
</script>

<template>
  <button
    type="button"
    :data-action="action"
    @click="actions.act(action)"
    class="app-button"
    :disabled="disabled"
  >
    <Icon v-if="icon" :name="icon" />
    <slot />
  </button>
</template>
