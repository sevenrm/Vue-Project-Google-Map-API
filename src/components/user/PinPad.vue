<script lang="ts" setup>
import { ref } from 'vue'
import { onKeyStroke } from '@vueuse/core'

const props = defineProps({
  length: {
    type: Number,
    default: 4
  }
})

const emits = defineEmits(['confirm'])

const numberRows = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [0]]
const code = ref<string>('')

const addValue = (val: number) => {
  code.value += `${val}`
  if (code.value.length < props.length)
    return
  emits('confirm', code.value)
  setTimeout(() => code.value = '', 100)
}

onKeyStroke((e) => {
  if (/^\d+$/.test(e.key))
    addValue(Number(e.key))
}, { eventName: 'keydown' })

</script>
<template>
  <div class="w-[200px] flex flex-col gap-4">
    <div class="flex items-center justify-center gap-2">
      <div class="rounded-full border border-gray-300 h-4 w-4 transition-all" v-for="i in length" :key="i"
        :class="{ 'bg-gray-300': code!.length >= i }"></div>
    </div>
    <div class="flex flex-col gap-4">
      <div class="grid grid-cols-3 place-items-center justify-center gap-2" v-for="(row, idx) of numberRows" :key="idx">
        <div v-for="col of row" :key="col" :class="{ 'col-span-3': row.length === 1 }"
          class="rounded-full h-12 w-12 hover:bg-gray-300 transition-all cursor-pointer border-gray-300 border flex items-center justify-center"
          @click="addValue(col)">
          <span class="font-semibold">{{ col }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
