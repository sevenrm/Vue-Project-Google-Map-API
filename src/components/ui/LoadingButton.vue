<script lang="ts" setup>
import SimpleSpinner from './SimpleSpinner.vue'

defineProps({
  isLoading: Boolean,
  isDisabled: Boolean
})
</script>

<template>
  <button type="button" class="flex items-center justify-center" :disabled="isDisabled || isLoading">
    <slot v-if="!isLoading"></slot>
    <SimpleSpinner v-else></SimpleSpinner>
  </button>
</template>

<style lang="scss">
button:disabled,
button[disabled] {
  @apply bg-gray-50 border-gray-body text-gray-body pointer-events-none;
}
</style>
