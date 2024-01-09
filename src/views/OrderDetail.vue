<script lang="ts" setup>
import { Ref, ref, computed, onMounted, watch, ComputedRef } from 'vue'
import { apiClient } from '../services/api'
import { store } from '../services/store'
import { OrderViewModel, OrderTypeEnum, PrinterViewModel, IOrdersAccountViewModel, OrdersAccountViewModel, ReceiptViewModel } from '../services/api.client'
import { numberFormatter } from '../services/number.formatter'
import { useShowConfirm } from '../services/injections'
import { pageContentHeight, pageContentHeightPx } from '../services/utils'
import { useRouter } from 'vue-router'
import { notifier } from '../services/notification'
import SimpleSpinner from '../components/ui/SimpleSpinner.vue'
import OrderDetailSection from '../components/orders/OrderDetailSection.vue'
import Modal from '../components/ui/Modal.vue'
import OrdersAccountTransactions from '../components/orders/OrdersAccountReceipts.vue'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'
import { OrderDetailMode } from '../components/orders/order-detail-mode'
import ReceiptModal from '../components/orders/ReceiptModal.vue'

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  },
  orderId: String,
  ordersAccountId: String
})

const router = useRouter()
const tableOrderMap: Ref<{ [tableId: string]: { lastOrderId: string; orderIds: string[] } }> = ref({})
const ordersAccountsMap: Ref<{ [ordersAccountId: string]: IOrdersAccountViewModel }> = ref({})

const refundOrderItems: Ref<string[]> = ref([])
const refundOrderItemAttributes: Ref<string[]> = ref([])
const isLoading = ref(false)
const order: Ref<OrderViewModel | null> = ref(null)
const isRefundMode = ref(false)
const printers: Ref<PrinterViewModel[]> = ref([])
const ordersAccount: Ref<OrdersAccountViewModel | null> = ref(null)
const currentReceipt = ref<ReceiptViewModel | undefined>()
const selectedOrderItems = ref<string[]>([])
const orderDetailMode = ref<OrderDetailMode>('view')
const selectedOrderId = computed(() => order.value ? order.value!.id! : ordersAccount.value ? ordersAccount.value!.orders![0].id! : '')
watch(store.selectedRestaurant, () => router.push({ name: 'orders-history', params: { restaurantId: store.selectedRestaurantId } }))

const ordersMap: ComputedRef<{ [orderId: string]: OrderViewModel }> = computed(() => {
  if (order.value)
    return { [order.value.id!]: order.value }
  else if (ordersAccount.value)
    return ordersAccount.value.orders!.reduce((map, order) => ({ ...map, [order.id!]: order! }), {})
  return {}
})

const tablesMap: ComputedRef<{ [tableId: string]: { tableGroupName: string, tableNumber: string } }> = computed(() => {
  if (props.orderId)
    return order.value && order.value.table
      ? {
        [order.value!.tableId!]: {
          tableGroupName: order.value!.table!.groupName!,
          tableNumber: order.value.table!.number.toString()
        }
      }
      : {}
  else if (props.ordersAccountId)
    return ordersAccount.value
      ? {
        [ordersAccount.value!.table!.id!]: {
          tableGroupName: ordersAccount.value.table!.groupName!,
          tableNumber: ordersAccount.value.table!.number.toString()
        }
      }
      : {}
  return {}
})

const loadReceipt = async (receiptId: string) => {
  try {
    currentReceipt.value = await apiClient.receipt(props.restaurantId, receiptId)
  } catch (error) {
    notifier.notifyError('loading', error, 'receipt')
  }
}

const loadOrder = async () => {
  isLoading.value = true
  try {
    const response = await apiClient.orderDetail(props.restaurantId, props.orderId!)
    setOrder(response)
  } catch (error) {
    notifier.notifyError('loading', error, 'history')
  }
  isLoading.value = false
}

const setOrder = async (updatedOrder: OrderViewModel) => {
  order.value = updatedOrder
  if (updatedOrder.orderTypeId === OrderTypeEnum.Table) {
    tableOrderMap.value = { [updatedOrder.tableId!]: { orderIds: [updatedOrder.id!], lastOrderId: updatedOrder.id! } }
  }
}

const loadOrdersAccount = async () => {
  isLoading.value = true
  try {
    const response = await apiClient.ordersAccountDetail(props.restaurantId, props.ordersAccountId!)
    setOrdersAccount(response)
  } catch (error) {
    notifier.notifyError('loading', error, 'details')
  }
  isLoading.value = false
}

const setOrdersAccount = (updatedOrdersAccount: OrdersAccountViewModel) => {
  ordersAccountsMap.value = { [updatedOrdersAccount.id]: updatedOrdersAccount }
  ordersAccount.value = updatedOrdersAccount
}

const totalRefundAmount = computed(() => {
  if (order.value)
    return order.value.receipt?.refundedAmount ?? 0
  else if (ordersAccount.value)
    return ordersAccount.value?.receipts?.reduce((total, receipt) => total + receipt.refundedAmount, 0) ?? 0
  return 0
})

const loadPrinters = async () => {
  try {
    printers.value = await apiClient.restaurantPrinters(props.restaurantId)
  } catch (error) {
    notifier.notifyError('loading', error, 'devices')
  }
}

onMounted(() => {
  if (props.orderId)
    loadOrder()
  else if (props.ordersAccountId)
    loadOrdersAccount()
  else {
    router.push({ name: 'history' })
    return
  }
  loadPrinters()
})

const updateReceipt = (updatedReceipt: ReceiptViewModel) => {
  const updatedOrdersAccount = ordersAccount.value
  currentReceipt.value = updatedReceipt
  const receiptIdx = updatedOrdersAccount?.receipts?.findIndex(r => r.id === updatedReceipt.id) ?? -1
  if (receiptIdx > -1)
    updatedOrdersAccount!.receipts![receiptIdx] = updatedReceipt
}

</script>

<template>
  <div class="w-full">
    <ReceiptModal :restaurant-id="restaurantId" @update:receipt="updateReceipt" :receipt="currentReceipt"
      @close="currentReceipt = undefined">
    </ReceiptModal>
    <div class="page-content" :height="pageContentHeight">
      <div v-if="isLoading" class="h-full w-full flex justify-center items-center -mt-20">
        <SimpleSpinner />
      </div>
      <div v-else class="flex -ml-3">
        <div class="w-4/5">
          <OrderDetailSection @show-modal:receipt="loadReceipt" v-model:selected-items="selectedOrderItems"
            @cancel="orderDetailMode = 'view'" :table-order-map="tableOrderMap" v-model:mode="orderDetailMode"
            :restaurant-id="restaurantId" :tables-map="tablesMap" :orders-map="ordersMap"
            @updated:orders-account="ordersAccountsMap[$event.id] = $event" :selectedOrderId="selectedOrderId"
            :orders-accounts-map="ordersAccountsMap" :is-history-mode="true"
            :language-code="store.selectedRestaurant.value!.defaultLangCode" :printers="printers" />
        </div>
        <div class="w-1/5 ">
          <div class="card">
            <div class="flex justify-center flex-col items-center gap-2 text-lg my-2">
              <div>
                <div class="text-gray-heading">
                  <span>{{ $tc('totalRefund') }}</span>
                </div>
              </div>
              <span class="text-gray-body font-semibold">
                {{ numberFormatter.currency(totalRefundAmount) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
