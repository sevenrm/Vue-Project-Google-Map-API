<script lang="ts" setup>
import { computed, PropType } from 'vue'
import { OrderTypeEnum, OrderViewModel } from '../../services/api.client'
import { dateFormatter } from '../../services/date.formatter';

const props = defineProps({
  order: {
    type: Object as PropType<OrderViewModel>,
    required: true
  },
  tablesMap: {
    type: Object as PropType<{ [tableId: string]: { tableGroupName: string, tableNumber: string } }>,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    required: true
  },
  removedAtMap: {
    type: Object as PropType<{ [id: string]: { removedAt: Date, percentageCompleted: number } }>,
    required: true
  },
  statusOnly: Boolean
})

const isFullyPaid = computed(() => props.paidAmount === props.totalAmount)

</script>
<template>
  <div v-if="!statusOnly">
    <div class="flex flex-col w-full" v-if="order.orderTypeId === OrderTypeEnum.Table">
      <div class="rounded-lg flex flex-nowrap w-full bg-blue-100 text-blue-600 p-1 px-2 text-xs font-semibold">
        <span class="mdi mdi-table-chair mr-1"></span>
        <span>{{ $tc('table') }}&nbsp;{{ tablesMap[order.tableId!]?.tableNumber }}</span>&nbsp;|&nbsp;<span>{{
          tablesMap[order.tableId!]?.tableGroupName
        }}</span>
      </div>
    </div>
    <div class="flex flex-col w-full" v-else-if="order.orderTypeId === OrderTypeEnum.TakeAway">
      <div class="rounded-default w-full bg-blue-100 text-blue-600 p-1 px-2 text-xs font-semibold">
        <span class="mdi mdi-bag-checked mr-1"></span>
        <span>{{ $tc('takeaway') }}</span>
        <template v-if="order.scheduledAt">
          |&nbsp;{{ dateFormatter.time(order.scheduledAt, undefined, false) }}
        </template>
      </div>
    </div>
    <div class="flex flex-col w-full" v-else-if="order.orderTypeId === OrderTypeEnum.Delivery">
      <div class="rounded-default w-full bg-blue-100 text-blue-600 p-1 px-2 text-xs font-semibold">
        <span class="mdi mdi-moped mr-1"></span>
        <span>
          {{ $tc('delivery') }}
        </span>
      </div>
    </div>
    <div class="flex flex-col w-full" v-else-if="order.orderTypeId === OrderTypeEnum.Cashier">
      <div class="rounded-default w-full bg-blue-100 text-blue-600 p-1 px-2 text-xs font-semibold">
        <span class="mdi mdi-cash-register mr-1"></span>
        <span>
          {{ $tc('cashier') }}
        </span>
      </div>
    </div>
  </div>

  <div class="text-center flex flex-nowrap">
    <template v-if="order.ordersAccountId && !isFullyPaid">
      <span class="bg-green-500 text-xs ml-2 p-1 rounded-default text-white font-medium"
        v-if="removedAtMap && removedAtMap[order.ordersAccountId]">{{
          $tc('closed')
        }}</span>
      <span v-else class="bg-orange-500 ml-2 p-1 rounded-default text-white text-xs font-medium">{{
        $tc('openOrder')
      }}</span>
    </template>
    <span v-else class="bg-green-500 ml-2 p-1 text-xs rounded-default text-white font-medium">{{
      $tc('paid')
    }}</span>
  </div>
</template>
