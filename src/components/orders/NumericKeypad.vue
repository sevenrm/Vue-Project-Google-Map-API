<script lang="ts" setup>
import { computed, onMounted, PropType, ref, watch } from 'vue'
import SimpleSpinner from '../ui/SimpleSpinner.vue'
import { onKeyStroke } from '@vueuse/core'

const props = defineProps({
  modelValue: Number,
  isLoading: Boolean,
  label: String,
  confirmDisabled: Boolean,
  activeUnit: String,
  unitSelector: Array as PropType<string[]>,
  maxValue: Number,
  allowZero: Boolean,
  disableKeyboard: Boolean
})
const localValue = ref(props.modelValue ?? 0)
const emits = defineEmits(['update:modelValue', 'confirm', 'clear', 'update:activeUnit'])

const hasChanged = ref(false)

const addValue = (val: number | string) => {
  if (!hasChanged.value) {
    emitUpdated(`${val}`)
    return
  }
  if (props.isLoading) return
  const updatedVal = `${localValue.value.toFixed(2)}${val}`.replace('.', '')
  emitUpdated(updatedVal)
}
const removeVal = () => {
  const updatedVal = localValue.value.toFixed(2).replace('.', '')
  emitUpdated(updatedVal.slice(0, updatedVal.length - 1))
}

const emitUpdated = (updatedVal: string) => {
  hasChanged.value = true
  updatedVal = updatedVal.padStart(2, '0')
  updatedVal = `${updatedVal.substring(0, updatedVal.length - 2)}.${updatedVal.substring(updatedVal.length - 2)}`
  localValue.value = parseFloat(updatedVal)
  emits('update:modelValue', parseFloat(localValue.value.toFixed(2)))
}

watch(() => props.modelValue, () => localValue.value = props.modelValue ?? 0)

const numberRows = [[7, 8, 9], [4, 5, 6], [1, 2, 3]]

const formattedValue = computed(() => (Math.round(localValue.value * 100) / 100).toFixed(2))

onKeyStroke((e) => {
  if (props.disableKeyboard) return
  if (/^\d+$/.test(e.key))
    addValue(e.key)
  else if (e.key === 'Backspace')
    removeVal()
  else if (e.key === 'Delete')
    emitUpdated('0')
  else if (e.key === 'Enter') {
    confirmButton.value?.focus()
    emits('confirm', localValue.value)
  }
}, { eventName: 'keydown' })

const hasConfirmDisabled = computed(() => !!(props.confirmDisabled || props.isLoading || (!props.allowZero && localValue.value === 0) || (props.maxValue && parseFloat(localValue.value.toFixed(2)) > parseFloat(props.maxValue.toFixed(2)))))
const confirmButton = ref<HTMLElement>()

</script>
<template>
  <div class="flex flex-col gap-1">
    <div
      class="w-full text-center flex justify-between items-center rounded gap-2 relative text-3xl bg-indigo-100 text-indigo-600 py-2 px-3 font-semibold">
      <div v-if="unitSelector?.length">
        <span class="text-base rounded p-2 px-3 font-bold cursor-pointer"
          :class="{ 'bg-indigo-700 text-white': unit === activeUnit, 'text-indigo-700': unit !== activeUnit }" :key="unit"
          v-for="unit of (unitSelector ?? [])" @click="$emit('update:activeUnit')">{{
            unit
          }}</span>
      </div>
      <div v-else-if="maxValue">
        <span class="p-1 px-2 font-bold bg-yellow-400 text-white text-base rounded">{{ $tc('max') }}:&nbsp;{{
          maxValue.toFixed(2)
        }}</span>
      </div>
      <div class="flex flex-1 justify-end">
        <span>{{ formattedValue }}</span>
      </div>
    </div>
    <div class="flex">
      <table class="border-separate flex-1 -m-0.5 mr-0">
        <tr v-for="(row, rowIdx) of numberRows" :key="rowIdx">
          <td v-for="(col, colIdx) of row" :key="col" :class="{ 'rounded-tl': rowIdx === 0 && colIdx === 0 }" class="cell"
            @click="addValue(col)">{{ col }}</td>
        </tr>
        <tr>

          <td class="cell custom rounded-bl bg-red-600 text-white" @click="emitUpdated('0')">
            C
          </td>
          <td class="cell" @click="addValue(0)">
            0</td>
          <td class="cell" @click="addValue('00')">
            <span>00</span>
          </td>
        </tr>
      </table>
      <div class="flex flex-col w-[80px] gap-0.5">
        <button @click="removeVal" class="text-gray-body rounded-tr bg-white h-1/2 shadow-default">
          <span class="mdi mdi-backspace cursor-pointer text-xl"></span>
        </button>
        <button ref="confirmButton" @click="$emit('confirm', localValue)"
          :class="{ 'bg-green-500': !hasConfirmDisabled, 'bg-gray-500': hasConfirmDisabled }"
          class="rounded-br h-1/2 shadow-default text-white" :disabled="hasConfirmDisabled">
          <span class="mdi mdi-check text-2xl" v-if="!isLoading"></span>
          <SimpleSpinner v-else></SimpleSpinner>
        </button>
      </div>
    </div>

  </div>
</template>
<style lang="scss" scoped>
.cell {
  @apply w-1/3 text-center h-16 shadow-default transition-all duration-150 cursor-pointer py-4 font-bold #{"hover:bg-gray-100"};

  &:not(.custom) {
    @apply bg-white;
  }
}
</style>
