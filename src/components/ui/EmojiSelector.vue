<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { createPicker } from 'picmo'

const randomId = ref(Math.random().toString(36))
onMounted(() => {
  // The picker must have a root element to insert itself into
  const rootElement = document.querySelector(randomId.value)!

  // Create the picker
  const picker = createPicker({ rootElement })

  // The picker emits an event when an emoji is selected. Do with it as you will!
  picker.addEventListener('emoji:select', event => {
    console.log('Emoji selected:', event.emoji)
  })
})
</script>
<template>
  <div :id="randomId"></div>
</template>
