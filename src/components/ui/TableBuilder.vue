<script lang="ts" setup>
import { ref, PropType, useSlots, computed } from 'vue'
import { getPages, pageContentWidthPx } from '../../services/utils'
import { numberFormatter } from '../../services/number.formatter'
import SimpleSpinner from './SimpleSpinner.vue'
import LoadingButton from './LoadingButton.vue'
import Toggle from './Toggle.vue'
import { TableBuilderFieldDefinition, TableBuilderSingleFieldDefinition } from './types'
import { dateFormatter } from '../../services/date.formatter'
import Datepicker from '@vuepic/vue-datepicker'

const currentPage = ref(0)
const pageSize = ref(10)
const props = defineProps({
  columns: {
    type: Object as PropType<TableBuilderFieldDefinition>,
    required: true
  },
  items: {
    type: Array as PropType<any[] | Record<string, any>>,
    required: true
  },
  hasRowExpanded: Function as PropType<(model: any) => boolean>,
  changePageCallback: Function as PropType<(currentPage: number, pageSize: number, query?: string) => void>,
  showSearchButton: {
    type: Boolean,
    default: true
  },
  rowClass: Function as PropType<(model: any) => string>,
  showPages: Boolean,
  hideHead: Boolean,
  totalRecords: Number,
  totalPages: Number,
  fixedPageSize: Number,
  filterFn: Function as PropType<(item: any, query: string) => boolean>,
  isLoading: {
    type: Boolean,
    required: true
  },
  carded: {
    type: Boolean,
    default: true
  },
  showSearchInput: Boolean
})

defineEmits(['clicked'])

const query = ref('')

const slots = useSlots()
const hasSlot = (name: string) => {
  return !!slots[name]
}

const getValue = (propName: string, obj: any, def: TableBuilderSingleFieldDefinition): any => {
  if (def.value) return def.value(obj)
  if (propName.includes('.'))
    return getValue(propName.split('.').slice(1).join('.'), obj[propName.split('.')[0]], def)
  return obj[propName]
}

const itemsList = computed(() => {
  let ret = Array.isArray(props.items) ? props.items : Object.keys(props.items as Record<string, unknown>).map(k => ({ '[key]': k, '[value]': (props.items as any)[k] }))
  if (props.fixedPageSize && query.value.length)
    ret = ret.filter(item => props.filterFn ? props.filterFn(item, query.value) : (item as any).toString().indexOf(query.value) > -1)
  return ret
})

const pagedList = computed(() => !props.fixedPageSize
  ? itemsList.value
  : itemsList.value
    .slice((currentPage.value * props.fixedPageSize), (currentPage.value * props.fixedPageSize) + props.fixedPageSize))

const columnClicked = (item: any, def: TableBuilderSingleFieldDefinition, $event: any) => {
  if (def.clicked && !def.disabled?.(item) && (def.if?.(item) ?? true)) {
    def.clicked(item)
    $event.stopPropagation()
  }
}

const changePage = (pageNumber: number) => {
  currentPage.value = pageNumber
  if (props.fixedPageSize)
    currentPage.value = pageNumber
  else
    props.changePageCallback?.(pageNumber, pageSize.value, query.value)
}

const getPropObject = (propName: string, obj: any, definition: any): any => {
  if (propName.includes('.')) {
    const currentPropName = propName.split('.')[0]
    let nextObj
    if (currentPropName.indexOf('[') > -1) {
      nextObj = obj[currentPropName.split('[')[0]]
      let variableName = currentPropName.split('[')[1]
      variableName = variableName.split(']')[0]
      nextObj = nextObj[definition.propsObject()[variableName]]
    } else {
      nextObj = obj[currentPropName]
    }
    return getPropObject(propName.split('.').slice(1).join('.'), nextObj, definition)
  } else if (propName.indexOf('[') > -1) {
    const currentPropName = propName.split('[')[0]
    let nextObj = obj[currentPropName]
    let variableName = currentPropName.split('[')[1]
    variableName = variableName.split(']')[0]
    nextObj = nextObj[definition.propsObject()[variableName]]
  }
  return obj
}

const getFinalPropName = (propName: string): string => {
  return propName.split('.').reverse()[0]
}

const totalFixedPages = computed(() => {
  const pageSize = (props.fixedPageSize ?? 1)
  let pagesCount = itemsList.value.length / pageSize
  if (itemsList.value.length % pageSize !== 0)
    pagesCount++
  return Math.floor(pagesCount)
})

const getDefType = (def: TableBuilderSingleFieldDefinition, item: any): string => typeof def.type === 'string' ? def.type as string : (def.type as any)(item)

const getDateTimeFormat = (def: TableBuilderSingleFieldDefinition) => {
  if (def.type === 'datepicker')
    return 'dd/MM/yyyy'
  else
    return 'HH:mm dd/MM/yyyy'
}

const noop = () => { }
</script>
<template>
  <div class="flex">
    <div class="py-1 pt-0 bg-white w-full" :class="{
      'pt-0': !hasSlot('head'),
      'pb-0': !showPages && (!fixedPageSize || itemsList?.length < fixedPageSize) || !itemsList?.length,
      'shadow-default rounded': carded
    }">
      <div class="flex flex-col gap-2 px-2 w-full py-1"
        v-if="hasSlot('head') || showSearchButton || hasSlot('action-buttons-left') || hasSlot('action-buttons-right') || showSearchInput">
        <div class="flex gap-2" v-if="hasSlot('head')">
          <slot name="head"></slot>
        </div>
        <div
          v-if="showSearchButton || hasSlot('action-buttons-left') || hasSlot('action-buttons-right') || showSearchInput"
          :class="{ 'border-t pt-1': hasSlot('head'), 'justify-end': !hasSlot('action-buttons-left') && showSearchButton, 'justify-between': hasSlot('action-buttons-left') }"
          class="border-gray-50 flex w-full">
          <div class="flex items-center justify-center" v-if="hasSlot('action-buttons-left')">
            <slot name="action-buttons-left"></slot>
          </div>
          <div class="flex items-center gap-2">
            <label class="form-label -my-1" v-if="showSearchInput">
              <span v-if="!showSearchButton">{{ $tc('search') }}</span>
              <div class="relative">
                <input type="text" v-model="query" @input="currentPage = 0"
                  @keyup.enter="changePageCallback?.(currentPage, pageSize, query)" />
                <div v-if="query.length" @click="query = ''"
                  class="flex items-center justify-center absolute top-0 bottom-0 right-2">
                  <span class="mdi mdi-close text-xl icon"></span>
                </div>
              </div>
            </label>
            <LoadingButton v-if="showSearchButton" class="btn-action primary" :is-loading="isLoading"
              :is-disabled="isLoading" @click="changePageCallback?.(currentPage, pageSize, query)">
              <span class="mdi mdi-magnify"></span>
              <span>{{ $tc('search') }}</span>
            </LoadingButton>
            <div :class="{ 'flex flex-col justify-end h-full': showSearchInput }" v-if="hasSlot('action-buttons-right')">
              <slot name="action-buttons-right"></slot>
            </div>
          </div>
        </div>
      </div>
      <div class="flex flex-col justify-center items-center">
        <template v-if="items && !isLoading">
          <div class="overflow-x-auto overflow-y-hidden w-full" :style="{ 'max-width': pageContentWidthPx }">
            <table class="w-full overflow-x-auto whitespace-nowrap">
              <thead v-if="!hideHead">
                <tr class="bg-gray-table-header">
                  <template v-for="(def, column) of columns" :key="column">
                    <th v-if="def.columnIf?.() ?? true" :class="def.columnClass ?? ''"
                      class="uppercase py-2 px-2 text-sm font-semibold text-gray-heading text-left">
                      <slot :name="`head-${def.name}`" v-if="hasSlot(`head-${def.name}`)"></slot>
                      <span v-else-if="def.name">{{
                        $tc(def.name === '@' ? getFinalPropName(column) : def.name)
                      }}</span>
                    </th>
                  </template>
                </tr>
              </thead>
              <tbody>
                <template v-for="(item, idx) of pagedList" :key="item">
                  <tr @click="$emit('clicked', item)" class="cursor-pointer transition-all hover:bg-gray-50"
                    :class="rowClass?.(item)">
                    <template v-for="(def, column) of columns" :key="column">
                      <td v-if="def.columnIf?.() ?? true" @click="columnClicked(item, def, $event)" :class="{
                            'border-b': idx !== pagedList.length - 1 || (showPages && pagedList?.length),
                            'w-6 pl-4 py-1': getDefType(def, item) === 'checkbox' || getDefType(def, item) === 'selector',
                            'px-2 py-2': def.type !== 'checkbox' && def.type !== 'selector',
                            'w-32': getDefType(def, item) === 'image',
                            'w-8': getDefType(def, item) === 'expander',
                            [def.columnClass ?? '']: true,
                          }" class=" border-gray-50 text-gray-body">
                        <template v-if="def.if?.(item) ?? true">
                          <slot :name="column" v-if="getDefType(def, item) === 'slot'" :item="item" :idx="idx"></slot>
                          <template v-else-if="getDefType(def, item) === 'checkbox'">
                            <label class="form-label row">
                              <input class="form-checkbox" type="checkbox"
                                :checked="def.isChecked?.(item) ?? getPropObject(column, item, def)[getFinalPropName(column)]"
                                @change="def.changeEvt ? def.changeEvt(item, ($event.target as any).checked) : noop" />
                            </label>
                          </template>
                          <template v-else-if="getDefType(def, item) === 'selector'">
                            <button
                              @click="def.changeEvt ? def.changeEvt(item, def.isChecked ? !def.isChecked(item) : true) : noop">
                              <span class="mdi"
                                :class="{ 'mdi-plus': def.isChecked ? !def.isChecked(item) : true, 'mdi-delete': def.isChecked ? def.isChecked(item) : false }"></span>
                            </button>
                          </template>
                          <template v-else-if="getDefType(def, item) === 'text' || getDefType(def, item) === 'number'">
                            <label class="form-label -my-2" :class="def.class">
                              <input :type="getDefType(def, item)" class="cell" :disabled="def.disabled?.(item) ?? false"
                                v-model="getPropObject(column, item, def)[getFinalPropName(column)]" />
                            </label>
                          </template>
                          <template
                            v-else-if="getDefType(def, item) === 'datepicker' || getDefType(def, item) === 'datetimepicker'">
                            <label class="form-label -my-2" :class="def.class">
                              <Datepicker v-model="getPropObject(column, item, def)[getFinalPropName(column)]"
                                :enableTimePicker="def.type === 'datetimepicker'" :auto-apply="true"
                                :format="getDateTimeFormat(def)" :disabled="def.disabled?.(item) ?? false">
                              </Datepicker>
                            </label>
                          </template>
                          <template v-else-if="getDefType(def, item) === 'date'">
                            <span :class="def.class" class="text-sm">
                              <template v-if="getValue(column, item, def)">
                                <span v-html="dateFormatter.datetime(new Date(getValue(column, item, def)))"></span>
                              </template>
                              <template v-else>
                                -
                              </template>
                            </span>
                          </template>
                          <template v-else-if="getDefType(def, item) === 'toggle'">
                            <div class="flex items-center">
                              <label class="form-label -mt-1" @click="$event.stopPropagation()">
                                <Toggle v-model="getPropObject(column, item, def)[getFinalPropName(column)]"
                                  @update:model-value="def.toggleUpdated?.(item, $event)"></Toggle>
                              </label>
                            </div>
                          </template>
                          <template v-else-if="getDefType(def, item) === 'string'">
                            <span :class="def.class">{{ getValue(column, item, def) }}</span>
                          </template>
                          <template v-else-if="getDefType(def, item) === 'image'">
                            <div class="w-10 h-10 flex items-center justify-center">
                              <img :class="def.class" class="rounded object-cover" v-if="getValue(column, item, def)"
                                :src="getValue(column, item, def)" />
                              <span v-else class="mdi mdi-image-outline text-3xl text-gray-300"></span>
                            </div>
                          </template>
                          <template v-else-if="getDefType(def, item) === 'percentage'">
                            <span :class="def.class" class="font-semibold">{{ getValue(column, item, def) }}%</span>
                          </template>
                          <template v-else-if="getDefType(def, item) === 'currency'">
                            <span :class="def.class" class="font-semibold">{{
                              numberFormatter.currency(getValue(column, item, def))
                            }}</span>
                          </template>
                          <template v-else-if="getDefType(def, item) === 'id'">
                            <span :class="def.class" class="text-primary text-sm font-semibold">{{
                              getValue(column, item, def)?.split("-")[0]
                            }}</span>
                          </template>
                          <template v-else-if="getDefType(def, item) === 'boolean'">
                            <span :class="def.class">{{ getValue(column, item, def) }}</span>
                          </template>
                          <template v-else-if="getDefType(def, item) === 'icon'">
                            <button class="btn-action" :class="def.iconButtonClass ?? 'light-gray'">
                              <span class="mdi" :class="`mdi-${def.iconName} ${def.class}`"></span>
                            </button>
                          </template>
                          <template v-else-if="getDefType(def, item) === 'expander'">
                            <span class="mdi mdi-arrow-collapse" v-if="hasRowExpanded?.(item)"></span>
                            <span class="mdi mdi-arrow-expand" v-else></span>
                          </template>
                          <template v-else-if="getDefType(def, item) === 'enum'">
                            <span v-if="def.skipTranslation">{{ def.enumValue[getValue(column, item, def)] }}</span>
                            <span v-else>{{ $tc(`${def.enumName}.${def.enumValue[getValue(column, item, def)]}`)
                            }}</span>
                          </template>
                        </template>
                      </td>
                    </template>
                  </tr>
                  <slot name="expandedRow" :item="item" v-if="hasSlot('expandedRow') && hasRowExpanded?.(item)"></slot>
                </template>
              </tbody>
            </table>
          </div>
          <h2 class="page-section my-4 flex items-center justify-center" v-if="!itemsList?.length">{{
            $tc('noRecordFound')
          }}</h2>
          <div class="flex flex-col md:flex-row justify-between w-full pt-2 text-[8px] md:text-base"
            v-if="(showPages || (!!fixedPageSize && itemsList?.length > fixedPageSize)) && itemsList?.length">
            <div class="flex items-center justify-center rounded-default mx-4 h-10"
              v-if="!fixedPageSize || fixedPageSize < itemsList.length">
              <div class="flex justify-center items-center">
                <button :disabled="currentPage === 0" @click="changePage(0)"
                  :class="{ 'text-primary': currentPage !== 0, 'text-gray-400': currentPage === 0 }"
                  class="p-1 px-2 text-base flex-nowrap flex bg-gray-100 rounded-full focus:outline-none focus:shadow-outline-red"
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
                <button @click="changePage(pageNumber)"
                  v-for="pageNumber in getPages(currentPage, fixedPageSize ? totalFixedPages : totalPages!)"
                  :key="pageNumber" class="text-base transition-all duration-150 focus:outline-none font-medium" :class="{
                        'bg-primary w-9 h-9 text-white rounded-full font-bold': currentPage === pageNumber,
                        'rounded-md w-6 h-8': currentPage !== pageNumber,
                        'rounded-l-3xl': pageNumber === 0 && currentPage !== pageNumber,
                        'rounded-r-3xl': pageNumber === (fixedPageSize ? totalFixedPages : totalPages!),
                        'text-gray-500': currentPage != pageNumber
                      }">{{ pageNumber + 1 }}</button>
              </div>
              <div class="flex justify-center items-center">
                <button :disabled="currentPage + 1 >= (fixedPageSize ? totalFixedPages : totalPages!)"
                  @click="changePage(currentPage + 1)"
                  :class="{ 'text-primary': currentPage + 1 < (fixedPageSize ? totalFixedPages : totalPages!), 'text-gray-400!': currentPage + 1 >= (fixedPageSize ? totalFixedPages : totalPages!) }"
                  class="p-1 px-2 text-base bg-gray-100 rounded-full focus:outline-none focus:shadow-outline-red">
                  <span class="mdi mdi-chevron-right"></span>
                </button>
                <button :disabled="currentPage === (fixedPageSize ? totalFixedPages : totalPages!) - 1"
                  @click="changePage((fixedPageSize ? totalFixedPages : totalPages!) - 1)"
                  :class="{ 'text-primary': currentPage < (fixedPageSize ? totalFixedPages : totalPages!) - 1, 'text-gray-400!': currentPage === (fixedPageSize ? totalFixedPages : totalPages!) - 1 }"
                  class="p-1 flex flex-nowrap px-2 text-base bg-gray-100 rounded-full focus:outline-none focus:shadow-outline-red">
                  <span class="mdi mdi-chevron-right"></span>
                  <span class="mdi mdi-chevron-right -ml-3"></span>
                </button>
              </div>
            </div>
            <div class="flex justify-end items-center" v-if="!fixedPageSize">
              <div class="flex text-sm">
                <span class="text-cool-gray-400">{{ $tc('totalRecords') }}:&nbsp;
                </span><span class="text-cool-gray-400">{{ totalRecords }}</span>
              </div>
              <div class="flex items-center justify-center mx-4 h-10">
                <span class="text-cool-gray-400 p-4 text-sm">{{ $tc('show') }}:</span>
                <select v-model="pageSize" @change="changePage(currentPage)"
                  class="uppercase border-gray-input border rounded text-gray-body p-2 pr-4 outline-none">
                  <option :value="5">5</option>
                  <option :value="10">10</option>
                  <option :value="20">20</option>
                  <option :value="50">50</option>
                </select>
              </div>
            </div>
          </div>
        </template>
        <div class="h-16 flex items-center justify-center bg-white" v-else>
          <SimpleSpinner></SimpleSpinner>
        </div>
      </div>
    </div>
  </div>
</template>
