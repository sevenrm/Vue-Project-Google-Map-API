<script setup lang="ts">
import SimpleSpinner from './SimpleSpinner.vue'

defineProps({
  text: {
    type: String,
    default: 'Ok'
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  mdIcon: {
    type: String,
    default: 'check'
  }
})
</script>

<template>
  <button
    :disabled="isLoading"
    :class="[isLoading ? 'cursor-not-allowed' : 'active:bg-red-pnp hover:bg-red-400 focus:outline-none focus:shadow-outline-red']"
    class="mb-1 flex items-center justify-between px-2 py-1 text-xs font-medium leading-5 text-white transition-colors duration-150 bg-red-pnp border border-transparent rounded-lg"
  >
    <span v-if="!isLoading" :class="`mdi mdi-${mdIcon} mr-2`"></span>
    <SimpleSpinner v-else />
    <span>{{ text }}</span>
  </button>
</template>
