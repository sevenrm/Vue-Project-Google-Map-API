<script lang="ts" setup>
import { PropType } from 'vue'
import { IOrdersAccountViewModel, OrderViewModel } from '../../services/api.client'
import { store } from '../../services/store'
import { pageContentHeight } from '../../services/utils'
import OrderItemCard from './OrderItemCard.vue'
import SimpleSpinner from '../ui/SimpleSpinner.vue'
import ScrollableDiv from '../ui/ScrollableDiv.vue'

const props = defineProps({
  filteredOrders: {
    type: Array as PropType<OrderViewModel[]>,
    required: true
  },
  ordersMap: {
    type: Object as PropType<{ [orderId: string]: OrderViewModel }>,
    required: true
  },
  removedAtMap: {
    type: Object as PropType<{ [orderId: string]: { removedAt: Date, percentageCompleted: number } }>,
    required: true
  },
  selectedOrderId: String,
  tableOrderMap: {
    type: Object as PropType<{ [tableId: string]: { lastOrderId: string; orderIds: string[] } }>,
    required: true
  },
  ordersAccountsMap: {
    type: Object as PropType<{ [ordersAccountId: string]: IOrdersAccountViewModel }>,
    required: true
  },
  languageCode: {
    type: String,
    required: true
  },
  tablesMap: {
    type: Object as PropType<{ [tableId: string]: { tableGroupName: string, tableNumber: string } }>,
    required: true
  }
})
const emits = defineEmits([
  'update:selectedOrderId'
])

</script>
<template>
  <ScrollableDiv class="px-2 overflow-x-hidden flex flex-col gap-2" :height="pageContentHeight - 55">
    <div v-if="filteredOrders.length === 0" class="h-full w-full flex flex-col justify-center items-center -mt-20">
      <h2 class="font-semibold text-2xl text-gray-400">{{ $tc('awaitingOrders') }}</h2>
      <SimpleSpinner class="mt-4" />
    </div>
    <OrderItemCard :is-selected="selectedOrderId === order.id" :tables-map="tablesMap" :orders-map="ordersMap"
      :main-order="order" :orders-accounts-map="ordersAccountsMap"
      :language-code="store.selectedRestaurant.value!.defaultLangCode" :removed-at-map="removedAtMap"
      :table-order-map="tableOrderMap" @click="$emit('update:selectedOrderId', order.id)"
      v-for="order of filteredOrders" :key="order.id" />
  </ScrollableDiv>
</template>
