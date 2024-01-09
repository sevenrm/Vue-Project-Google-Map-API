<script lang="ts" setup>
import { PropType } from 'vue'
import { ColorPicker } from 'vue-color-kit'
import 'vue-color-kit/dist/vue-color-kit.css'

const emits = defineEmits(['update:modelValue'])
const props = defineProps({
  modelValue: {
    type: String,
    default: '#000000'
  },
  mode: {
    type: String as PropType<'rgba' | 'hsv' | 'hex'>,
    default: 'hex'
  }
})

const changeColor = (color: { rgba: any; hex: string; hsv: any }) => {
  emits('update:modelValue', color[props.mode])
}
</script>
<style>
.hu-color-picker {
  width: 220px !important;
}
</style>
<template>
  <Popper arrow click closeDelay="100">
    <button class="btn-action mt-1">
      <span class="mdi mdi-palette"></span>
      <span>{{ $tc('pickColor') }}</span>
      <span class="w-2 h-2 rounded-full" :style="{ 'background': modelValue }"></span>
    </button>
    <template #content>
      <div class="flex items-center justify-center"
        @click="$event.preventDefault(); $event.stopPropagation(); $event.stopImmediatePropagation()">
        <ColorPicker theme="light" :color="modelValue" :sucker-hide="true" @changeColor="changeColor" />
      </div>
    </template>
  </Popper>
</template>
