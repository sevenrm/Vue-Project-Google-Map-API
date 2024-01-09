<script setup lang="ts">
import { Ref, ref, watch, onMounted } from 'vue'
import { apiClient } from '../services/api'
import { OrderListItemViewModel, OrderTypeEnum, OrderViewModel, PaginatedResultOfOrderListItemViewModel, OrderSearchRequest } from '../services/api.client'
import { pageContentHeight } from '../services/utils'
import { store } from '../services/store'
import { useRouter } from 'vue-router'
import TableBuilder from '../components/ui/TableBuilder.vue'
import { notifier } from '../services/notification'
import { nameof } from 'ts-simple-nameof'
import { FormBuilderFieldGroupDefinition, TableBuilderFieldDefinition } from '../components/ui/types'
import FormBuilder from '../components/ui/FormBuilder.vue'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const isLoading = ref(false)
const historyResponse: Ref<PaginatedResultOfOrderListItemViewModel | undefined> = ref(undefined)
const orderSearchRequest = ref(new OrderSearchRequest())
const tablesMap: Ref<{ [tableId: string]: { tableGroupName: string, tableNumber: string } }> = ref({})

const loadHistory = async (pageIdx = 0, pageSize = 10) => {
  isLoading.value = true
  orderSearchRequest.value.pageIdx = pageIdx
  orderSearchRequest.value.pageSize = pageSize
  try {
    if (!orderSearchRequest.value.orderNumber)
      orderSearchRequest.value.orderNumber = undefined
    historyResponse.value = await apiClient.orderHistory(props.restaurantId, orderSearchRequest.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'history')
  }
  isLoading.value = false
}

const router = useRouter()
const openDetail = (order: OrderViewModel) =>
  router.push(order.ordersAccountId
    ? { name: 'orders-account-detail', params: { ordersAccountId: order.ordersAccountId, restaurantId: props.restaurantId } }
    : { name: 'order-detail', params: { orderId: order.id, restaurantId: props.restaurantId } })

const loadTables = async () => {
  if (store.selectedRestaurant.value === null)
    return
  try {
    const availableTableGroups = await apiClient.restaurantTablegroupsGet(props.restaurantId)
    tablesMap.value = availableTableGroups.reduce((groupMap, tableGroup) => ({
      ...groupMap,
      ...tableGroup.tables.reduce((map, table) => ({ ...map, [table.id!]: { tableGroupName: tableGroup.name, tableNumber: table.number } }), {})
    }), {})
  } catch (error) {
    notifier.notifyError('loading', error, 'tables')
  }
}

watch(store.selectedRestaurant, () => {
  if (!store.selectedRestaurant.value) return
  loadTables()
  loadHistory()
})

onMounted(() => {
  loadHistory()
  loadTables()
})

const columnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<OrderListItemViewModel>(m => m.id)]: {
    type: 'id',
    name: '@'
  },
  [nameof<OrderListItemViewModel>(m => m.orderNumber)]: {
    type: 'slot',
    name: '@'
  },
  [nameof<OrderListItemViewModel>(m => m.orderTypeId)]: {
    type: 'slot',
    name: 'type'
  },
  [nameof<OrderListItemViewModel>(m => m.amount)]: {
    type: 'currency',
    name: '@'
  },
  [nameof<OrderListItemViewModel>(m => m.sentAt)]: {
    type: 'date',
    name: '@'
  }
})

const searchFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    '[class]': 'grid grid-cols-3 gap-2',
    [nameof<OrderSearchRequest>(m => m.dateFrom)]: {
      type: 'date',
      name: '@'
    },
    [nameof<OrderSearchRequest>(m => m.dateTo)]: {
      type: 'date',
      name: '@'
    },
    [nameof<OrderSearchRequest>(m => m.id)]: {
      type: 'text',
      name: '@'
    },
    [nameof<OrderSearchRequest>(m => m.orderNumber)]: {
      type: 'number',
      name: '@'
    },
    [nameof<OrderSearchRequest>(m => m.orderTypeId)]: {
      type: 'enum',
      name: 'type',
      enumValue: OrderTypeEnum,
      enumName: 'OrderTypeEnum'
    }
  }
])
</script>
<template>
  <div class="w-full">
    <ScrollableDiv class="page-content" :height="pageContentHeight">
      <TableBuilder :items="historyResponse?.items ?? []" :total-pages="historyResponse?.totalPages"
        :total-records="historyResponse?.totalRecords" :is-loading="isLoading" :change-page-callback="loadHistory"
        :show-pages="true" :columns="columnDefinition" @clicked="openDetail($event)">
        <template v-slot:head>
          <FormBuilder :is-loading="isLoading" :fields-groups="searchFieldsGroups" v-model="orderSearchRequest">
          </FormBuilder>
        </template>
        <template v-slot:orderNumber="{ item } : { item: any }">
          <span class="font-medium">&nbsp;#{{ item.orderNumber }}</span>
        </template>
        <template v-slot:orderTypeId="{ item } : { item: any }">
          <div class="flex">
            <div class="rounded bg-blue-100 text-blue-600 p-1 px-2 text-xs font-semibold"
              v-if="item.orderTypeId === OrderTypeEnum.Table">
              <span class="mdi mdi-table-chair mr-1"></span>
              <span>{{ $tc('table') }}&nbsp;{{ tablesMap[item.tableId]?.tableNumber }}</span>&nbsp;|&nbsp;<span>{{
                tablesMap[item.tableId]?.tableGroupName
              }}</span>
            </div>
            <div class="rounded bg-blue-100 text-blue-600 p-1 px-2 text-xs font-semibold"
              v-else-if="item.orderTypeId === OrderTypeEnum.TakeAway">
              <span class="mdi mdi-bag-checked mr-1"></span>
              <span>{{ $tc('takeaway') }}</span>
            </div>
            <div class="rounded bg-blue-100 text-blue-600 p-1 px-2 text-xs font-semibold"
              v-else-if="item.orderTypeId === OrderTypeEnum.Delivery">
              <span class="mdi mdi-moped mr-1"></span>
              <span>
                {{ $tc('delivery') }}
              </span>
            </div>
            <div class="rounded bg-blue-100 text-blue-600 p-1 px-2 text-xs font-semibold"
              v-else-if="item.orderTypeId === OrderTypeEnum.Cashier">
              <span class="mdi mdi-cash-register mr-1"></span>
              <span>
                {{ $tc('cashier') }}
              </span>
            </div>
          </div>
        </template>
      </TableBuilder>
    </ScrollableDiv>
  </div>
</template>
