<script lang="ts" setup>
import { onMounted, PropType, ref } from 'vue'
import { DropdownItem } from './types'
import useDetectOutsideClick from '../../directives/useDetectOutsideClick'

defineEmits(['click'])
const props = defineProps({
  items: {
    type: Array as PropType<DropdownItem[]>,
    required: true
  },
  skipTranslation: Boolean,
  data: Object
})

const isVisible = ref(false)
const componentRef = ref()

useDetectOutsideClick(componentRef, () => {
  isVisible.value = false
})
</script>
<style>
.custom-dropdown {
  margin-left: -11px !important;
  margin-right: -8px !important;
}
</style>
<template>
  <Popper :show="isVisible" closeDelay="100" class="custom-dropdown">
    <div @click="isVisible = !isVisible" ref="componentRef">
      <slot :isOpen="isVisible"></slot>
    </div>
    <template #content>
      <div @click="isVisible = false"
        class="border-gray-200 z-10 min-w-[100px] -mt-2 text-base list-none rounded-default divide-y border divide-gray-100 shadow-default bg-white dark:bg-gray-800 dark:border-gray-800">
        <ul aria-labelledby="dropdownButton">
          <template v-for="(item, idx) of items">
            <li v-if="item.isVisible?.() ?? true" :key="item.text" :class="{ 'border-t': idx > 0 }"
              class="cursor-pointer text-base hover:text-red-pnp font-medium text-gray-500  border-gray-50 hover:bg-gray-100 transition-colors duration-150">
              <button class="p-3 flex justify-start items-center"
                @click="item.action ? item.action(data) : $emit('click', item)">
                <span v-if="item.icon" class="mdi mr-2" :class="`mdi-${item.icon}`"></span>
                <span v-if="skipTranslation">{{ item.text }}</span>
                <span v-else>{{ $tc(item.text) }}</span>
              </button>
            </li>
          </template>
        </ul>
      </div>
    </template>
  </Popper>
</template>
