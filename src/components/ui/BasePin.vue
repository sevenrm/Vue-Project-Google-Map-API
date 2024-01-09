<template>
  <div class="cursor-pointer text-xl bg-white shadow-default h-8 w-8 flex items-center justify-center rounded-full">
    <span class="mdi" :class="[isPinned ? 'mdi-pin text-red-pnp' : 'mdi-pin-outline text-gray-400']"></span>
  </div>
</template>

<script setup lang="ts">

defineProps({
  isPinned: {
    required: true,
    type: Boolean
  }
})
</script>
