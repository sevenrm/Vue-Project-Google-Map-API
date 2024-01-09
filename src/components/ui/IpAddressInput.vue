<script lang="ts" setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  showPort: Boolean
})
const emits = defineEmits(['update:modelValue'])

watch(() => props.modelValue, () => modelValueLocal.value = [...props.modelValue.split(':')[0].split('.'), '', '', '', ''].slice(0, 4))

const modelValueLocal = ref([...props.modelValue.split(':')[0].split('.'), '', '', '', ''].slice(0, 4))
const ipSegmentRefs = ref<HTMLElement[]>([])
const portLocal = ref<number | null>(props.modelValue.includes(':') ? parseInt(props.modelValue.split(':')[1]) : null)
const portSegmentRef = ref<HTMLElement>()

const updateIpVal = (index: number) => {
  emitChange()
  if (modelValueLocal.value[index].toString().length === 3)
    if (index < 3)
      ipSegmentRefs.value[index + 1].focus()
    else
      portSegmentRef.value?.focus()
}

const emitChange = () => {
  const val = `${modelValueLocal.value.join('.')}${props.showPort ? `:${portLocal.value}` : ''}`
  emits('update:modelValue', val)
}

const ipKeyup = (event: any, index: number) => {
  const keyCode = event.keyCode || event.which
  if (keyCode === 8) {
    if (modelValueLocal.value[index].length > 0) return
    ipSegmentRefs.value[index - 1].focus()
  } else {
    if ([9, 46, 16].includes(keyCode)) return
    if (modelValueLocal.value[index].length === 3)
      if (index < 3)
        ipSegmentRefs.value[index + 1].focus()
      else
        portSegmentRef.value?.focus()
  }
}

</script>
<template>
  <div class="flex mt-1 p-1 items-center justify-center bg-white border-gray-300 border custom rounded">
    <template v-for="(segment, idx) in modelValueLocal" :key="idx">
      <span v-if="idx > 0">.</span>
      <input class="w-10 outline-none text-center m-0 p-0.5 border-none shadow-none bg-white" maxlength="3"
        type="number" min="0" max="255" v-model="modelValueLocal[idx]" @input="updateIpVal(idx)"
        @keyup="ipKeyup($event, idx)" ref="ipSegmentRefs" />
    </template>
    <template v-if="showPort">
      <span>:</span>
      <input class="w-12 text-center outline-none p-0.5 border-none shadow-none m-0" type="number" v-model="portLocal"
        @input="emitChange" ref="portSegmentRef" />
    </template>
  </div>
</template>
<style scoped lang="scss">
/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  -moz-appearance: textfield;
}
</style>
