<script setup lang="ts">
import { computed, nextTick, onMounted, onUpdated, PropType, ref } from 'vue'
import { store } from '../../services/store'

const container = ref<HTMLElement>()
const DEFAULT_PIXELS_SCROLL = 50
const props = defineProps({
  height: {
    type: Number,
    required: true
  },
  scrollClass: Object as PropType<Record<string, string>>,
  outerClass: String,
  class: String
})

const hasScrollbar = ref(false)
const showButtons = computed(() => {
  return hasScrollbar.value && store.device.value?.settings?.showScrollbarButtons
})

onUpdated(() => {
  setTimeout(() => {
    setScrollbar()
  }, 500)
})

const scroll = (val: number) => {
  if (!container.value) return
  const newVal = container.value!.scrollTop + DEFAULT_PIXELS_SCROLL * val
  container.value!.scrollTop = newVal > 0 ? newVal : 0
}

const setScrollbar = () => {
  hasScrollbar.value = !!container.value && container.value.scrollHeight > container.value.clientHeight
}

onMounted(() => {
  setScrollbar()
})

</script>
<template>
  <div class="relative" :class="props.outerClass">
    <div ref="container" :style="{ 'height': `${height}px` }" class="w-full h-full overflow-y-auto"
      :class="[scrollClass?.[hasScrollbar.toString()], showButtons ? 'py-4' : '', props.class]">
      <slot></slot>
    </div>
    <template v-if="showButtons">
      <div class="absolute mx-auto left-0 w-10 h-10 right-0 top-0 flex justify-center items-center">
        <button class="h-10 w-10 shadow-lg flex items-center justify-center rounded bg-gradient text-white"
          @click="scroll(-1)">
          <span class="mdi mdi-chevron-up"></span>
        </button>
      </div>
      <div class="absolute mx-auto left-0 w-10 h-10 right-0 bottom-0 flex justify-center items-center">
        <button class="h-10 w-10 shadow-xl flex items-center justify-center rounded bg-gradient text-white"
          @click="scroll(1)">
          <span class="mdi mdi-chevron-down"></span>
        </button>
      </div>
    </template>
  </div>
</template>
