<script lang="ts" setup>
import { PropType, ref, computed } from 'vue'
import { LanguageInfoViewModel } from '../../services/api.client'
import { getPages } from '../../services/utils'

const props = defineProps({
  languages: {
    type: Array as PropType<string[]>,
    required: true
  },
  showDescription: Boolean,
  items: {
    type: Array as PropType<{ id: string | undefined; languageInfo: { [key: string]: LanguageInfoViewModel; } }[]>,
    required: true
  }
})

const currentPage = ref(0)
const pageSize = ref(10)

const pagedList = computed(() => props.items
  .slice((currentPage.value * pageSize.value), (currentPage.value * pageSize.value) + pageSize.value))

const changePage = (pageNumber: number) => {
  currentPage.value = pageNumber
}

const totalFixedPages = computed(() => {
  let pagesCount = props.items.length / pageSize.value
  if (props.items.length % pageSize.value !== 0)
    pagesCount++
  return Math.floor(pagesCount)
})
</script>
<template>
  <div>
    <table>
      <thead>
        <tr>
          <th v-for="lang of languages" :key="lang">
            <div class="flex gap-2 justify-center items-center py-2">
              <span class="fi" :class="`fi-${lang}`"></span>
              <span>{{ lang }}</span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, rowIdx) of pagedList" :key="item.id" class="border-gray-200"
          :class="{ 'border-t': rowIdx < pagedList.length - 1 }">
          <template v-for="(lang, colIdx) of languages" :key="lang">
            <td v-if="item.languageInfo[lang]" class="border-gray-200 px-2" :class="{ 'border-l': colIdx > 0 }">
              <div class="flex flex-col">
                <label class="form-label">
                  <span>{{ $tc('name') }}</span>
                  <input type="text" v-model.lazy="item.languageInfo[lang].name" />
                </label>
                <label v-if="showDescription" class="form-label">
                  <span>{{ $tc('description') }}</span>
                  <textarea v-model.lazy="item.languageInfo[lang].description" class="resize-none"></textarea>
                </label>
              </div>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
    <div class="flex justify-between w-full pt-2 text-[8px] md:text-base" v-if="items?.length">
      <div class="flex justify-start">
        <div class="flex items-center justify-center rounded-default mx-4 h-10" v-if="pageSize < items.length">
          <div class="flex justify-center items-center">
            <button :disabled="currentPage === 0" @click="changePage(0)"
              :class="{ 'text-primary': currentPage !== 0, 'text-gray-400': currentPage === 0 }"
              class="p-1 px-2 text-base bg-gray-100 rounded-full focus:outline-none focus:shadow-outline-red"
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
              class="p-1 px-2 text-base bg-gray-100 rounded-full focus:outline-none focus:shadow-outline-red">
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
