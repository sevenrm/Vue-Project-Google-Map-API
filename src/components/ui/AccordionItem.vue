<template>
  <li class="accordion__item">
    <div class="accordion__trigger" :class="{ 'accordion__trigger_active': isVisible }" @click="open">

      <!-- This slot will handle the title/header of the accordion and is the part you click on -->
      <slot name="accordion-trigger"></slot>
    </div>

    <Transition name="accordion" @enter="start" @after-enter="end" @before-leave="start" @after-leave="end">
      <div class="accordion__content" v-show="isVisible">
        <ul>
          <!-- This slot will handle all the content that is passed to the accordion -->
          <slot name="accordion-content"></slot>
        </ul>
      </div>
    </Transition>
  </li>
</template>

<script lang="ts" setup>
import { computed } from '@vue/reactivity'
import { watch, inject, Ref, ref } from 'vue'

const props = defineProps({
  startOpen: {
    type: Boolean,
    default: false
  }
})

const accordion = inject('Accordion') as { count: number, active: number | null }
const index: Ref<null | number> = ref(null)
const isVisible = computed(() => index.value === accordion.active)
const emits = defineEmits(['active-item'])

watch(props, val => {
  if (val.startOpen)
    accordion.active = index.value
})

const open = () => {
  if (isVisible.value)
    accordion.active = null
  else
    accordion.active = index.value

  emits('active-item', accordion.active !== null)
}

const start = (el: HTMLElement) => {
  el.style.height = el.scrollHeight + 'px'
}

const end = (el: HTMLElement) => {
  el.style.height = ''
}

index.value = accordion.count++

</script>

<style lang="scss" scoped>
.accordion__item {
  cursor: pointer;
  position: relative;
}

.accordion__trigger {
  display: flex;
  justify-content: space-between;
}

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
