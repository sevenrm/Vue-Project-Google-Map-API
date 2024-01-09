<script lang="ts" setup>
import { computed, onMounted, PropType, ref, useSlots } from 'vue'
import { getPages } from '../../services/utils'

const props = defineProps({
  items: {
    type: Array as PropType<any[]>,
    required: true
  },
  initialPageSize: {
    type: Number,
    default: 5
  },
  itemKey: String,
  showSearchInput: Boolean,
  filterFn: Function as PropType<(item: any, query: string) => boolean>
})

const currentPage = ref(0)
const pageSize = ref(10)

const filteredItems = computed(() => props.filterFn ? props.items.filter(item => props.filterFn ? props.filterFn(item, query.value) : item.toString().indexOf(query.value) > -1) : props.items)

const pagedList = computed(() => filteredItems.value
  .slice((currentPage.value * pageSize.value), (currentPage.value * pageSize.value) + pageSize.value))

const changePage = (pageNumber: number) => {
  currentPage.value = pageNumber
}

const totalFixedPages = computed(() => {
  let pagesCount = filteredItems.value.length / pageSize.value
  if (filteredItems.value.length % pageSize.value !== 0)
    pagesCount++
  return Math.floor(pagesCount)
})
const query = ref('')
const slots = useSlots()
const hasSlot = (name: string) => {
  return !!slots[name]
}

onMounted(() => pageSize.value = props.initialPageSize)
</script>
<template>
  <div>
    <div class="flex w-full justify-between my-1" v-if="hasSlot('head') || showSearchInput">
      <div v-if="showSearchInput">
        <label class="form-label my-0">
          <span>{{ $tc('search') }}</span>
          <div class="relative">
            <input type="text" v-model="query" @input="currentPage = 0" />
            <div v-if="query.length" @click="query = ''"
              class="flex cursor-pointer items-center justify-center absolute top-1 bottom-0 right-2 hover:text-primary">
              <span class="mdi mdi-close text-xl icon"></span>
            </div>
          </div>
        </label>
      </div>
      <slot name="head"></slot>
    </div>
    <div class="flex flex-col gap-2 mt-2">
      <slot :item="item" v-for="(item, idx) of pagedList" :key="!!itemKey ? item[itemKey] : idx"></slot>
    </div>
    <div class="flex flex-col md:flex-row justify-between w-full pt-2 text-[8px] md:text-base"
      v-if="filteredItems?.length">
      <div class="flex justify-start">
        <div class="flex items-center justify-center rounded-default mx-4 h-10" v-if="pageSize < filteredItems.length">
          <div class="flex justify-center items-center">
            <button :disabled="currentPage === 0" @click="changePage(0)"
              :class="{ 'text-primary': currentPage !== 0, 'text-gray-400': currentPage === 0 }"
              class="p-1 flex flex-nowrap px-2 text-base bg-gray-100 rounded-full focus:outline-none focus:shadow-outline-red"
              aria-label="Previous">
              <span class="mdi mdi-chevron-left -mr-3"></span>
              <span class="mdi mdi-chevron-left"></span>
            </button>
            <button :disabled="currentPage === 0" @click="changePage(currentPage - 1)"
              :class="{ 'text-primary': currentPage !== 0, 'text-gray-400': currentPage === 0 }"
              class="p-1 px-2 text-base bg-gray-100 rounded-full focus:outline-none focus:shadow-outline-red"
              aria-label="Previous">
              <span class="mdi mdi-chevron-left"></span>
            </button>
          </div>
          <div class="flex justify-center items-center bg-gray-100 rounded-3xl gap-1 px-1 mx-1 h-8">
            <button @click="changePage(pageNumber)" v-for="pageNumber in getPages(currentPage, totalFixedPages)"
              :key="pageNumber" class="text-base transition-all duration-150 focus:outline-none font-medium" :class="{
                'bg-primary w-9 h-9 text-white rounded-full font-bold': currentPage === pageNumber,
                'rounded-md w-6 h-8': currentPage !== pageNumber,
                'rounded-l-3xl': pageNumber === 0 && currentPage !== pageNumber,
                'rounded-r-3xl': pageNumber === totalFixedPages,
                'text-gray-500': currentPage != pageNumber
              }">{{ pageNumber + 1 }}</button>
          </div>
          <div class="flex justify-center items-center">
            <button :disabled="currentPage + 1 >= totalFixedPages" @click="changePage(currentPage + 1)"
              :class="{ 'text-primary': currentPage + 1 < totalFixedPages, 'text-gray-400!': currentPage + 1 >= totalFixedPages }"
              class="p-1 px-2 text-base bg-gray-100 rounded-full focus:outline-none focus:shadow-outline-red">
              <span class="mdi mdi-chevron-right"></span>
            </button>
            <button :disabled="currentPage === totalFixedPages" @click="changePage(totalFixedPages - 1)"
              :class="{ 'text-primary': currentPage < (totalFixedPages - 1), 'text-gray-400!': currentPage === (totalFixedPages - 1) }"
              class="p-1 flex flex-nowrap px-2 text-base bg-gray-100 rounded-full focus:outline-none focus:shadow-outline-red">
              <span class="mdi mdi-chevron-right"></span>
              <span class="mdi mdi-chevron-right -ml-3"></span>
            </button>
          </div>
        </div>
      </div>
      <div class="flex justify-end">
        <div class="flex items-center justify-center  mx-4 h-10">
          <span class="text-cool-gray-400 p-4">{{ $tc('show') }}:</span>
          <select v-model="pageSize" @change="changePage(0)"
            class="uppercase border-gray-input border rounded text-gray-body p-2 pr-4 outline-none">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="-1">{{ $tc('all') }}</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>
