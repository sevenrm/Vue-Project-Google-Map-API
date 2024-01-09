<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  icon: String,
  isOpen: Boolean,
  isFirst: Boolean,
  unwrap: Boolean,
  isLast: Boolean,
  hideBorder: Boolean,
  skipTranslation: Boolean
})

defineEmits(['update:isOpen'])

watch(() => props.isOpen, () => isOpenLocal.value = props.isOpen)

const start = (el: HTMLElement) => {
  el.style.height = el.scrollHeight + 'px'
}

const end = (el: HTMLElement) => {
  el.style.height = ''
}

const isOpenLocal = ref(false)

onMounted(() => isOpenLocal.value = props.isOpen)
</script>
<template>
  <div class="" v-if="!unwrap">
    <div class="flex border-gray-200 justify-between p-2 px-3 text-gray-body bg-white cursor-pointer font-medium"
      :class="{ 'border-b': isOpenLocal && !hideBorder && !isLast, 'rounded-b': isLast && !isOpenLocal, 'border-t': !hideBorder && !isFirst, 'rounded-t': isFirst }"
      @click="isOpenLocal = !isOpenLocal; $emit('update:isOpen', isOpenLocal)">
      <div class="flex items-center gap-2">
        <span v-if="icon" class="mdi" :class="`mdi-${icon}`"></span>
        <span class="text-sm font-medium text-gray-heading">
          <template v-if="skipTranslation">{{ title }}</template>
          <template v-else>{{ $tc(title) }}</template>
        </span>
      </div>
      <span :class="{ 'mdi-chevron-down': !isOpenLocal, 'mdi-chevron-up': isOpenLocal }" class="mdi"></span>
    </div>
    <Transition name="accordion" @enter="start" @after-enter="end" @before-leave="start" @after-leave="end">
      <div class="collapse-body" v-if="isOpenLocal">
        <slot></slot>
      </div>
    </Transition>
  </div>
  <slot v-else></slot>
</template>

<style lang="scss" scoped>
.accordion-enter-active,
.accordion-leave-active {
  will-change: height, opacity;
  transition: height 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
  height: 0 !important;
  opacity: 0;
}
</style>
