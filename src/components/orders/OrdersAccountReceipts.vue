<script lang="ts" setup>
import { nameof } from 'ts-simple-nameof'
import { Ref, ref, onMounted, PropType } from 'vue'
import { apiClient } from '../../services/api'
import { OrderItemViewModel, IOrdersAccountViewModel, OrdersAccountTransactionViewModel, PaymentProviderEnum, ReceiptViewModel, OrderViewModel } from '../../services/api.client'
import { notifier } from '../../services/notification'
import { numberFormatter } from '../../services/number.formatter'
import { printReceipt } from '../../services/printer'
import { store } from '../../services/store'
import SimpleSpinner from '../ui/SimpleSpinner.vue'
import TableBuilder from '../ui/TableBuilder.vue'
import { TableBuilderFieldDefinition } from '../ui/types'

const isLoading = ref(false)

const emits = defineEmits(['selected'])

const props = defineProps({
  ordersAccount: {
    type: Object as PropType<IOrdersAccountViewModel>,
    required: true
  },
  restaurantId: {
    type: String,
    required: true
  },
  ordersMap: {
    type: Object as PropType<{ [orderId: string]: OrderViewModel }>,
    required: true
  }
})

const expandedTransactionsMap: Ref<Record<string, boolean>> = ref({})
const orderItemsMap: Ref<Record<string, OrderItemViewModel>> = ref({})

const buildOrderItemsMap = () => {
  orderItemsMap.value = props.ordersAccount?.orders
    ?.map(o => props.ordersMap[o.id!])
    ?.flatMap(o => o.items)
    ?.reduce((map, i) => ({ ...map, [i.id!]: i }), {}) ?? {}
}

onMounted(() => {
  buildOrderItemsMap()
})

const receiptsColumnDef = ref<TableBuilderFieldDefinition>({
  [nameof<ReceiptViewModel>(m => m.id)]: {
    type: 'id',
    name: '@'
  },
  [nameof<ReceiptViewModel>(m => m.createdAt)]: {
    type: 'date',
    name: '@'
  },
  [nameof<ReceiptViewModel>(m => m.paymentProviderId)]: {
    type: 'enum',
    enumValue: PaymentProviderEnum,
    enumName: 'PaymentProviderEnum',
    name: 'paymentType'
  },
  [nameof<ReceiptViewModel>(m => m.amount)]: {
    type: 'currency',
    name: '@'
  },
  [nameof<ReceiptViewModel>(m => m.refundedAmount)]: {
    type: 'currency',
    name: 'refund'
  },
  detail: {
    type: 'icon',
    iconName: 'open-in-new',
    name: '@',
    clicked: (model: ReceiptViewModel) => emits('selected', model)
  },
  print: {
    name: '@',
    type: 'icon',
    iconButtonClass: 'indigo',
    iconName: 'printer',
    columnIf: () => !!store.device.value?.defaultPrinterId,
    clicked: (model: ReceiptViewModel) => printReceipt(props.restaurantId, store.device.value!.id!, model.id!)
  },
  expander: {
    type: 'expander',
    name: '',
    clicked: (model: ReceiptViewModel) => expandedTransactionsMap.value[model.id!] = !expandedTransactionsMap.value[model.id!],
    if: (model: ReceiptViewModel) => !props.ordersAccount.hasMoneySplit
  }
})

const selectedReceiptId = ref<string | undefined>()
</script>
<template>
  <TableBuilder :show-search-button="false" :items="ordersAccount?.receipts ?? []" :is-loading="isLoading"
    :columns="receiptsColumnDef" @clicked="selectedReceiptId = $event.id"
    :has-row-expanded="item => expandedTransactionsMap[(item as any).id]">
    <template v-slot:expandedRow="{ item } : { item: any }">
      <tr>
        <td :colspan="Object.keys(receiptsColumnDef).length">
          <table class="w-full">
            <tr class="" v-for="orderItemId of item.orderItems" :key="orderItemId">
              <td class="px-2 py-2" colspan="5">
                <span class="font-semibold text-gray-body">x{{ orderItemsMap[orderItemId].count }}</span>&nbsp;
                <span class="text-gray-body">{{ orderItemsMap[orderItemId].itemName }}</span>
              </td>
              <td class="py-2 text-center">
                <span class="font-semibold">{{
                  numberFormatter.currency(orderItemsMap[orderItemId].price)
                }}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </template>
  </TableBuilder>
</template>
