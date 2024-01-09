<script lang="ts" setup>
import { computed, PropType } from 'vue'
import { IOrdersAccountViewModel, OrderStatusEnum, OrderTypeEnum, OrderViewModel } from '../../services/api.client'
import { MAX_MINUTES_TIME_COUNTER } from '../../types'
import { numberFormatter } from '../../services/number.formatter'
import OrderCardLabels from './OrderCardLabels.vue'
import TimeCounter from './TimeCounter.vue'
import { dateFormatter } from '../../services/date.formatter'

const props = defineProps({
  isSelected: {
    type: Boolean,
    required: true
  },
  mainOrder: {
    type: Object as PropType<OrderViewModel>,
    required: true
  },
  tableOrderMap: {
    type: Object as PropType<{ [tableId: string]: { lastOrderId: string; orderIds: string[] } }>,
    required: true
  },
  ordersAccountsMap: {
    type: Object as PropType<{ [ordersAccountId: string]: IOrdersAccountViewModel }>,
    required: true
  },
  removedAtMap: {
    type: Object as PropType<{ [orderId: string]: { removedAt: Date, percentageCompleted: number } }>,
    required: true
  },
  ordersMap: {
    type: Object as PropType<{ [orderId: string]: OrderViewModel }>,
    required: true
  },
  languageCode: {
    type: String,
    required: true
  },
  tablesMap: {
    type: Object as PropType<{ [tableId: string]: { tableGroupName: string, tableNumber: string } }>,
    required: true
  },
  paidOrderItems: Array as PropType<string[]>
})

const diffMinutes = (dt1: Date, dt2?: Date) => {
  if (!dt2) dt2 = new Date()
  return Math.round((dt2.getTime() - dt1.getTime()) / 1000 / 60)
}

const orders = computed(() => {
  if (!props.mainOrder) return []
  let orders = []
  if (props.mainOrder.ordersAccountId)
    orders = (props.ordersAccountsMap[props.mainOrder.ordersAccountId]?.orders?.map(order => props.ordersMap[order.id!]) ?? [])
  else {
    if (props.mainOrder.orderTypeId === OrderTypeEnum.Table) {
      orders = props.tableOrderMap[props.mainOrder.table!.id!].orderIds
        .map(orderId => props.ordersMap[orderId])
        .filter(order => !!order)
    } else
      orders = [props.mainOrder]
  }
  return orders
})

const orderedOrders = computed(() => orders.value
  .filter(o => [
    OrderStatusEnum.Canceled
  ].indexOf(o.statusId) === -1 && o.items.filter(i => !i.isRemoved && !i.isRefunded).length > 0)
  .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime()))

const hasNewOrders = computed(() => orders.value.some(o => o.statusId === OrderStatusEnum.Sent))

const updatedAmount = computed(() => orders.value
  .filter(o => [OrderStatusEnum.Rejected, OrderStatusEnum.Canceled].indexOf(o.statusId) === -1)
  .reduce((total, order) => total + order.amount, 0))

const ordersAccount = computed(() => props.mainOrder?.ordersAccountId ? props.ordersAccountsMap[props.mainOrder.ordersAccountId!] : undefined)
const paidAmount = computed(() => ordersAccount.value?.receipts?.reduce((total, t) => total + t.amount, 0) ?? 0)

</script>
<template>
  <div class="card p-0 transition-all border-2 relative cursor-pointer"
    :class="{ 'border-gray-400': isSelected, 'border-white': !isSelected }">
    <div v-if="hasNewOrders"
      class="text-xl bg-white absolute shadow-default h-6 w-6 flex items-center justify-center -right-3 -top-2 rounded-full">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
      <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
    </div>
    <div class="flex w-full">
      <div class="flex flex-col w-full" v-if="mainOrder.orderTypeId === OrderTypeEnum.Table">
        <div class="rounded-t w-full bg-blue-100 text-blue-600 p-1 px-2 text-xs font-semibold">
          <span class="mdi mdi-table-chair mr-1"></span>
          <span>{{ $tc('table') }}&nbsp;{{ tablesMap[mainOrder.tableId!]?.tableNumber }}</span>&nbsp;|&nbsp;<span>{{
            tablesMap[mainOrder.tableId!]?.tableGroupName
          }}</span>
        </div>
      </div>
      <div class="flex flex-col w-full" v-else-if="mainOrder.orderTypeId === OrderTypeEnum.TakeAway">
        <div class="rounded-t w-full bg-blue-100 text-blue-600 p-1 px-2 text-xs font-semibold">
          <span class="mdi mdi-bag-checked mr-1"></span>
          <span>{{ $tc('takeaway') }}</span>
          <template v-if="mainOrder.scheduledAt">
            |&nbsp;{{ dateFormatter.time(mainOrder.scheduledAt, undefined, false) }}
          </template>
        </div>
      </div>
      <div class="flex flex-col w-full" v-else-if="mainOrder.orderTypeId === OrderTypeEnum.Delivery">
        <div class="rounded-t w-full bg-blue-100 text-blue-600 p-1 px-2 text-xs font-semibold">
          <span class="mdi mdi-moped mr-1"></span>
          <span>
            {{ $tc('delivery') }}
          </span>
        </div>
      </div>
      <div class="flex flex-col w-full" v-else-if="mainOrder.orderTypeId === OrderTypeEnum.Cashier">
        <div class="rounded-t w-full bg-blue-100 text-blue-600 p-1 px-2 text-xs font-semibold">
          <span class="mdi mdi-cash-register mr-1"></span>
          <span>
            {{ $tc('cashier') }}
          </span>
        </div>
      </div>
    </div>

    <div class="p-1">
      <div class="flex justify-between gap-2 items-center">
        <OrderCardLabels :removed-at-map="removedAtMap" :order="mainOrder" :paid-amount="paidAmount" :status-only="true"
          :total-amount="updatedAmount" :tables-map="tablesMap"></OrderCardLabels>
        <div class="flex text-center justify-end items-center font-semibold">
          <span>{{ $tc('total') }}</span>&nbsp;
          <span class="text-gray-body font-medium" v-if="mainOrder.ordersAccountId">
            {{ numberFormatter.currency(paidAmount) }}&nbsp;/&nbsp;
          </span>
          <span class="text-red-pnp font-semibold">{{
            numberFormatter.currency(updatedAmount)
          }}</span>
        </div>
      </div>
    </div>
    <div class="flex flex-col">
      <div v-for="order of orderedOrders" :key="order.id" class="flex flex-col border-t p-1 pl-4 relative">
        <div
          :class="{ 'border-green-500': order.statusId === OrderStatusEnum.Done, 'border-red-500': order.statusId === OrderStatusEnum.Rejected }"
          class=" border-t-2 border-radius-t h-1 absolute top-0 left-0 transition-all"
          :style="{ 'width': `${removedAtMap[order.id!].percentageCompleted}%` }" v-if="removedAtMap[order.id!]">
        </div>
        <div class="absolute left-0 border-r rounded-r-full w-1 h-8 top-0 bottom-0 my-auto" :class="{
          'border-indigo-500 bg-indigo-500': order.statusId === OrderStatusEnum.Sent,
          'border-red-600 bg-red-600': order.statusId === OrderStatusEnum.Rejected,
          'border-yellow-400 bg-yellow-400': order.statusId === OrderStatusEnum.Accepted,
          'border-green-500 bg-green-500': order.statusId === OrderStatusEnum.Ready || order.statusId === OrderStatusEnum.Done
        }">
        </div>
        <div class="flex justify-between items-center">
          <span class="font-semibold text-sm text-gray-800">{{ $tc('orderNumber', { orderNumber: order.orderNumber })
          }}</span>

          <span class="text-xs">x{{ $tc('itemsCount', { count: order.itemsCount }) }}</span>
        </div>
        <div class="flex justify-between items-center">
          <div class="text-sm">
            <TimeCounter v-if="diffMinutes(new Date(order.sentAt)) <= MAX_MINUTES_TIME_COUNTER" class="text-gray-body"
              :model="new Date(order.sentAt)" />
            <span v-else class="text-gray-body">{{ dateFormatter.datetime(order.sentAt, true) }}</span>
          </div>
          <div class="flex text-center justify-end items-center font-medium text-sm">
            <span class="text-black">{{
              numberFormatter.currency(order.amount)
            }}</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
