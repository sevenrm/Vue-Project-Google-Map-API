<template>
  <span>{{ $tc('timeAgo', { time: timeCounter }) }}</span>
</template>
<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  model: {
    type: Date,
    required: true
  }
})
const timeCounter = ref('')

let timeCounterInterval: number

const setTimeCounter = () => {
  const minutesDiff = Math.round((new Date().getTime() - props.model.getTime()) / 1000 / 60)
  timeCounter.value = minutesDiff > 60 ? `${Math.floor(minutesDiff / 60)}h ${minutesDiff % 60}min` : `${minutesDiff}min`
}

onMounted(() => {
  setTimeCounter()
  timeCounterInterval = setInterval(setTimeCounter, 1000) as unknown as number
})

onBeforeUnmount(() => clearInterval(timeCounterInterval))

</script>
