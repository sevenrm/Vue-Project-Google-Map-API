<template>
  <ScrollableDiv :style="{ 'z-index': zIndex, }" :height="windowHeight"
    class="fixed inset-0 overflow-y-auto flex items-center justify-center" role="dialog" aria-modal="true">
    <div class="fixed inset-0 bg-gray-700 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
    <div v-if="isLoading" :class="[backgroundClass]" class="rounded h-32 w-32 flex items-center justify-center bg-white">
      <SimpleSpinner></SimpleSpinner>
    </div>
    <div v-else @click.stop :class="{
      'lg:w-1/3': size === ModalSize.Small,
      'lg:w-2/5': size === ModalSize.Medium,
      'lg:w-2/3': size === ModalSize.Large,
      'lg:w-auto lg:min-w-[60%]': size === ModalSize.Adapt,
      'lg:w-full': size === ModalSize.Full
    }" class="rounded text-left shadow-xl transform transition-all mt-4 w-full"
      :style="{ 'max-height': windowHeight + 'px' }">

      <div style="z-index:70;"
        class="absolute flex items-center justify-center cursor-pointer -right-2 -top-2 bg-white w-8 h-8 shadow-lg text-gray-700 rounded-full"
        @click.stop="$emit('close')" v-if="showClose && (showCloseOnly || !!actionButtons?.length)">
        <span class="mdi mdi-close"></span>
      </div>
      <div class="rounded-t"
        :class="[backgroundClass + (showFooter && ((actionButtons?.length ?? 0) > 0 || !showCloseOnly) ? '' : ' rounded-b')]">
        <div class="sm:flex sm:items-start">
          <div class="w-full text-center sm:text-left">
            <div v-if="title" class="bg-gray-100 rounded-t flex items-center p-3">
              <h3 class="text-lg font-medium text-gray-heading dark:text-white" id="modal-title">{{ $tc(title) }}</h3>
            </div>
            <div :style="{ 'max-height': `${windowHeight - (!!title ? 100 : 50)}px)` }">
              <div :class="{ 'px-4 pb-4': !contentPaddingDisabled, 'pt-4': !title }">
                <p class="text-sm text-gray-700 dark:text-gray-500 mt-2" v-if="!hasSlot('content')">{{ content }}</p>
                <slot name="content"></slot>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="border-gray-200 bg-white dark:bg-gray-800 p-2 flex flex-row-reverse rounded-b gap-2"
        v-if="showFooter && ((actionButtons?.length ?? 0) > 0 || !showCloseOnly)">

        <template v-if="!showCloseOnly && !hideDefaultCtas && !actionButtons?.length">
          <button type="button" class="btn-action success-fill" @click.stop="$emit('confirm')">
            {{ $tc('confirm') }}
          </button>
          <button @click.stop="$emit('close')" type="button" class="btn-action danger">
            <span>{{ $tc('cancel') }}</span>
          </button>
        </template>
        <button v-for="btn of actionButtons" :key="btn.text" type="button" :class="[btn.colorClass]" class="btn-action"
          @click="btn.action" :disabled="!!btn.disabled ? btn.disabled() : false">
          <span class="mdi" :class="`mdi-${btn.iconName}`"></span>
          <span>{{ $tc(btn.text) }}</span>
        </button>
      </div>
    </div>
  </ScrollableDiv>
</template>

<script lang="ts" setup>
import { ModalSize } from './types'
import { PropType, useSlots } from 'vue'
import SimpleSpinner from './SimpleSpinner.vue'
import { windowHeight } from '../../services/utils'
import { onKeyStroke } from '@vueuse/core'
import ScrollableDiv from './ScrollableDiv.vue'

interface ActionButton {
  text: string,
  colorClass: string,
  iconName: string,
  action: () => void,
  disabled?: () => boolean
}

const emits = defineEmits(['close', 'confirm'])

defineProps({
  zIndex: {
    type: Number,
    default: 60
  },
  isLoading: Boolean,
  showCloseOnly: {
    type: Boolean,
    default: true
  },
  showFooter: {
    type: Boolean,
    default: true
  },
  actionButtons: {
    type: Array as PropType<ActionButton[]>,
    required: false
  },
  size: {
    type: Number,
    required: false,
    default: ModalSize.Adapt
  },
  showContainer: {
    type: Boolean,
    required: false
  },
  title: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    required: false
  },
  backgroundClass: {
    type: String,
    default: 'bg-white dark:bg-gray-900'
  },
  hideDefaultCtas: {
    type: Boolean,
    default: false
  },
  showClose: {
    type: Boolean,
    default: true
  },
  contentPaddingDisabled: Boolean
})

const slots = useSlots()
const hasSlot = (name: string) => {
  return !!slots[name]
}

onKeyStroke('Escape', () => emits('close'))

</script>
