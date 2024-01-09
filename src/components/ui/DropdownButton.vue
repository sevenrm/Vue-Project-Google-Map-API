<template>
  <Popper click arrow closeDelay="100" :placement="placement" class="mr-2imp">
    <button class="relative flex justify-between items-center" :class="btnClass" type="button">
      <slot name="btn"></slot>
      <span class="mdi right-0 ml-2"
        :class="{ 'mdi-chevron-down': placement == 'bottom', 'mdi-chevron-right': placement == 'right' }"></span>
    </button>
    <template #content>
      <div
        class="border-gray-200 z-10 w-44 -mt-2 text-base list-none rounded-default divide-y border divide-gray-100 shadow-default bg-white dark:bg-gray-800 dark:border-gray-800">
        <ul class="py-1" aria-labelledby="dropdownButton">
          <li v-for="(item, idx) in items" :key="idx"
            class="px-3 py-2 cursor-pointer text-lg hover:text-red-pnp font-semibold text-gray-500 hover:bg-gray-100 transition-colors duration-150"
            :class="itemClass">
            <slot name="item" :item="item"></slot>
          </li>
        </ul>
      </div>
    </template>
  </Popper>
</template>
<style>
.mr-2imp {
  margin-right: -8px !important;
}
</style>
<script lang="ts" setup>
import { PropType, ref } from 'vue'

defineProps({
  items: {
    type: Array as PropType<any[]>
  },
  disabled: Boolean,
  itemClass: String,
  bgClass: {
    type: String,
    default: 'bg-gray-200 dark:bg-gray-800'
  },
  btnClass: String,
  containerClass: String,
  placement: {
    type: String,
    default: 'right'
  }
})
</script>
