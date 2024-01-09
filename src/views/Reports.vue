<script lang="ts" setup>
import { computed, onMounted, Ref, ref, watch } from 'vue'
import { apiClient } from '../services/api'
import { EndOfPeriodReportViewModel, MenuAttributeItemViewModel, MenuItemViewModel, PaymentProviderEnum } from '../services/api.client'
import { store } from '../services/store'
import { download, pageContentHeight, pageContentHeightPx, toCsv } from '../services/utils'
import { loadMenuMappings } from '../services/menu.loader'
import { numberFormatter } from '../services/number.formatter'
import { notifier } from '../services/notification'
import SimpleSpinner from '../components/ui/SimpleSpinner.vue'
import Datepicker from '@vuepic/vue-datepicker'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'
import { dateFormatter } from '../services/date.formatter'
import { printEndOfPeriodReport } from '../services/printer'

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

type Mode = 'daily' | 'weekly' | 'monthly' | 'custom'
const isLoading = ref(false)
const selectedMode: Ref<Mode> = ref('daily')
const dateFrom = ref(new Date())
const dateTo = ref(new Date())
const endOfPeriodReport: Ref<EndOfPeriodReportViewModel | undefined> = ref(undefined)
const menuItemsMapping: Ref<Record<string, MenuItemViewModel> | undefined> = ref(undefined)
const menuItemAttributeMapping: Ref<Record<string, MenuAttributeItemViewModel> | undefined> = ref(undefined)
const aggregateAttributeItems = ref(true)
const transactionsExpanded = ref(false)

const loadReports = async () => {
  isLoading.value = true
  try {
    endOfPeriodReport.value = await apiClient.report(props.restaurantId, dateFrom.value, dateTo.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'reports')
  }
  isLoading.value = false
}

const setTimeframe = () => {
  const startDate = new Date()
  startDate.setHours(0)
  const endDate = new Date()
  switch (selectedMode.value) {
    case 'daily':
      endDate.setHours(0)
      endDate.setHours(24)
      break
    case 'weekly':
      startDate.setHours(startDate.getHours() - startDate.getDay() * 24)
      endDate.setHours(endDate.getHours() + (7 - startDate.getDay()) * 24)
      break
    case 'monthly':
      startDate.setDate(1)
      endDate.setDate(31)
      break
    case 'custom':
      return
  }
  dateFrom.value = startDate
  dateTo.value = endDate
  loadReports()
}

const exportItems = () => {
  const values = endOfPeriodReport.value!.items!.flatMap(i => [
    { item: i.menuItemId ? menuItemsMapping.value![i.menuItemId!].languageInfo[store.selectedRestaurant.value!.defaultLangCode].name : i.itemName!, count: i.itemsCount, price: i.amount },
    ...(i.attributes?.map(a => ({
      item: `*${menuItemAttributeMapping.value![a.menuAttributeItemId!].languageInfo[store.selectedRestaurant.value!.defaultLangCode].name}`,
      count: a.itemsCount,
      price: a.amount
    })) ?? [])
  ])
  const csv = toCsv(values, ['item', 'count', 'price'])
  download(csv, `report-${currentPeriodTitle.value}.csv`, 'csv')
}

const currentPeriodTitle = computed(() => `${dateFormatter.datetime(dateFrom.value, undefined, '-', '-', '-')}_${dateFormatter.datetime(dateTo.value, undefined, '-', '-', '-')}`)

const exportSummary = () => {
  const values = Object.keys(endOfPeriodReport.value!.transactionProvidersAmounts!).map(provider => ({ provider, total: endOfPeriodReport.value!.transactionProvidersAmounts![provider as any] }))
  values.push({ provider: 'total', total: values.reduce((sum, v) => sum + v.total!, 0) })
  const csv = toCsv(values, ['provider', 'total'])
  download(csv, `summary - ${currentPeriodTitle.value}.csv`, 'csv')
}

const init = async () => {
  // TODO: return mapping with reports / include removed
  const mapping = await loadMenuMappings(store.selectedRestaurantId!, true)
  menuItemsMapping.value = mapping?.menuItemsMapping
  menuItemAttributeMapping.value = mapping?.menuItemAttributeMapping
  setTimeframe()
}

watch(store.selectedRestaurant, () => init())
onMounted(() => init())
</script>
<template>
  <div class="w-full">

    <!-- <div class="card"></div> -->
    <ScrollableDiv class="page-content" :height="pageContentHeight">

      <div class="flex flex-col gap-2">
        <div class="flex justify-between gap-4 card overflow-y-auto">
          <div class="flex gap-4">
            <label class="form-label">
              <span>{{ $tc('daily') }}</span>
              <input class="accent-red-pnp" type="radio" v-model="selectedMode" value="daily" @change="setTimeframe" />
            </label>
            <label class="form-label">
              <span>{{ $tc('weekly') }}</span>
              <input class="accent-red-pnp" type="radio" v-model="selectedMode" value="weekly" @change="setTimeframe" />
            </label>
            <label class="form-label">
              <span>{{ $tc('monthly') }}</span>
              <input class="accent-red-pnp" type="radio" v-model="selectedMode" value="monthly" @change="setTimeframe" />
            </label>
            <label class="form-label">
              <span>{{ $tc('custom') }}</span>
              <input class="accent-red-pnp" type="radio" v-model="selectedMode" value="custom" @change="setTimeframe" />
            </label>
            <template v-if="selectedMode === 'custom'">
              <label class="form-label">
                <span>{{ $tc('from') }}</span>
                <Datepicker v-model="dateFrom" @update:model-value="loadReports" :auto-apply="true">
                </Datepicker>
              </label>
              <label class="form-label">
                <span>{{ $tc('to') }}</span>
                <Datepicker v-model="dateTo" @update:model-value="loadReports" :auto-apply="true">
                </Datepicker>
              </label>
            </template>
            <label class="form-label">
              <span>{{ $tc('aggregateAttributeItems') }}</span>
              <input class="accent-red-pnp" type="checkbox" v-model="aggregateAttributeItems" />
            </label>
          </div>
          <div class="flex items-end gap-2">
            <button class="btn-action indigo" v-if="!!store.device.value"
              @click="printEndOfPeriodReport(restaurantId, dateFrom, dateTo, store.device.value!.id!, 'summary')"
              :disabled="!endOfPeriodReport">
              <span class="mdi mdi-printer"></span>
              <span>{{ $tc('printSummary') }}</span>
            </button>
            <button class="btn-action indigo" v-if="!!store.device.value"
              @click="printEndOfPeriodReport(restaurantId, dateFrom, dateTo, store.device.value!.id!, 'items')"
              :disabled="!endOfPeriodReport">
              <span class="mdi mdi-printer"></span>
              <span>{{ $tc('printItems') }}</span>
            </button>
            <button class="btn-action blue" @click="exportSummary" :disabled="!endOfPeriodReport">
              <span class="mdi mdi-file-export"></span>
              <span>{{ $tc('exportSummary') }}</span>
            </button>
            <button class="btn-action blue" @click="exportItems" :disabled="!endOfPeriodReport">
              <span class="mdi mdi-file-export"></span>
              <span>{{ $tc('exportItems') }}</span>
            </button>
          </div>
        </div>
        <div v-if="isLoading" class="h-full w-full flex justify-center items-center mt-20">
          <SimpleSpinner />
        </div>
        <template v-else-if="endOfPeriodReport">
          <div class="card p-4">
            <div>
              <div class="flex justify-between"
                v-for="(amount, provider) of endOfPeriodReport!.transactionProvidersAmounts" :key="provider">
                <span>{{ $tc(`PaymentProviderEnum.${provider}`) }}</span>
                <span class="font-semibold">{{ numberFormatter.currency(amount!) }}</span>
              </div>
              <div class="flex relative justify-between cursor-pointer">
                <span>{{ $tc('total') }}</span>
                <span class="font-semibold">{{ numberFormatter.currency(endOfPeriodReport!.total) }}</span>
              </div>
              <div class="flex justify-between">
                <span>{{ $tc('refunded') }}</span>
                <span class="font-semibold">{{ numberFormatter.currency(endOfPeriodReport!.refundedAmount) }}</span>
              </div>
              <div class="flex justify-between">
                <span>{{ $tc('totalCommission') }}</span>
                <span class="font-semibold">{{ numberFormatter.currency(endOfPeriodReport!.commissionAmount) }}</span>
              </div>
              <div class="flex justify-between">
                <span>{{ $tc('tipsAmount') }}</span>
                <span class="font-semibold">{{ numberFormatter.currency(endOfPeriodReport!.tipsAmount) }}</span>
              </div>
            </div>
          </div>
          <div class="card p-4">
            <div>
              <table class="w-full">
                <thead>
                  <th class="py-1 font-medium text-gray-400 text-left">{{ $tc('item') }}</th>
                  <th class="py-1 font-medium text-gray-400 text-right">{{ $tc('count') }}</th>
                  <th class="py-1 font-medium text-gray-400 text-right">{{ $tc('price') }}</th>
                </thead>
                <tbody>
                  <template v-for="(item, idx) of endOfPeriodReport?.items" :key="item.menuitemId">

                    <tr :class="{ 'border-t': idx > 0 }" class="hover:bg-gray-100 cursor-pointer">
                      <td>
                        <span v-if="item.menuItemId && menuItemsMapping![item.menuItemId!]">{{
                          menuItemsMapping![item.menuItemId!].languageInfo[store.selectedRestaurant.value!.defaultLangCode].name
                        }}</span>
                        <span v-else>{{ item.itemName }}</span>
                      </td>
                      <td class="text-right font-semibold">
                        x{{ item.itemsCount }}
                      </td>
                      <td class="text-right text-gray-heading font-semibold">
                        {{ numberFormatter.currency(item.amount) }}
                      </td>
                    </tr>
                    <template v-if="!aggregateAttributeItems">
                      <tr class="border-b hover:bg-gray-100 cursor-pointer" v-for="attribute of item.attributes"
                        :key="attribute.menuAttributeItemId">
                        <td class="pl-4">
                          {{
                            menuItemAttributeMapping![attribute.menuAttributeItemId!].languageInfo[store.selectedRestaurant.value!.defaultLangCode].name
                          }}
                        </td>
                        <td class="text-right font-semibold">
                          x{{ attribute.itemsCount }}
                        </td>
                        <td class="text-right text-gray-heading font-semibold">
                          {{ numberFormatter.currency(attribute.amount) }}
                        </td>
                      </tr>
                    </template>
                  </template>
                  <template v-if="aggregateAttributeItems">
                    <tr :class="{ 'border-t': idx > 0 }" class="hover:bg-gray-100 cursor-pointer"
                      v-for="(attribute, idx) of endOfPeriodReport.attributes" :key="attribute.menuAttributeItemId">
                      <td>
                        <span
                          v-if="attribute.menuAttributeItemId! && menuItemAttributeMapping![attribute.menuAttributeItemId!]">{{
                            menuItemAttributeMapping![attribute.menuAttributeItemId!].languageInfo[store.selectedRestaurant.value!.defaultLangCode].name
                          }}</span>
                        <span v-else>{{ attribute.menuAttributeItemId }}</span>
                      </td>
                      <td class="text-right font-semibold">
                        x{{ attribute.itemsCount }}
                      </td>
                      <td class="text-right text-gray-heading font-semibold">
                        {{ numberFormatter.currency(attribute.amount) }}
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </ScrollableDiv>
  </div>
</template>
