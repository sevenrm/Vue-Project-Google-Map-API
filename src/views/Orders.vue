
<script lang="ts" setup>
import { Ref, ref, watch, onBeforeUnmount, computed, onMounted, ComputedRef, KeepAlive, onUnmounted } from 'vue'
import { IOrdersAccountViewModel, MenuCategoryViewModel, MenuAttributeGroupViewModel, MenuAttributeItemViewModel, MenuItemViewModel, MenuViewModel, OrderStatusEnum, OrderViewModel, PrinterViewModel, TableGroupViewModel, OrderTypeEnum, OrderItemViewModel, CreateManualTransactionRequest, FullTableViewModel, ReceiptViewModel } from '../services/api.client'
import { apiClient } from '../services/api'
import { store } from '../services/store'
import Modal from '../components/ui/Modal.vue'
import DefaultNotification from '../assets/sounds/default.wav'
import DingDongNotification from '../assets/sounds/dingdong.wav'
import { enumToArray, isMobile } from '../services/utils'
import { AudioSource, OrdersSettings } from '../components/orders/orders-settings'
import OrdersAccountSessionsModal from '../components/orders/OrdersAccountSessionsModal.vue'
import { loadMenuMappings } from '../services/menu.loader'
import { useRouter } from 'vue-router'
import { notifier } from '../services/notification'
import OrdersAccountTransactions from '../components/orders/OrdersAccountReceipts.vue'
import OrdersListView from '../components/orders/OrdersListView.vue'
import OrdersCashierView from '../components/orders/OrdersCashierView.vue'
import OrdersFloorView from '../components/orders/OrdersFloorView.vue'
import OrdersKanbanView from '../components/orders/OrdersKanbanView.vue'
import OrdersSettingsModal from '../components/orders/OrdersSettingsModal.vue'
import OrderDetailSection from '../components/orders/OrderDetailSection.vue'
import OrderItemSelector from '../components/orders/OrderItemSelector.vue'
import { OrderDetailMode } from '../components/orders/order-detail-mode'
import { OrdersMap, orderStore, RemovedElementsMap, TableOrderMap } from '../components/orders/order-store'
import Toggle from '../components/ui/Toggle.vue'
import ReceiptModal from '../components/orders/ReceiptModal.vue'
import { openCashbox } from '../services/printer'
import { useShowConfirm } from '../services/injections'

enum OrderView {
  List = 1,
  Cashier = 2,
  Floor = 3,
  Kanban = 4
}

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const router = useRouter()
const showConfirm = useShowConfirm()
const isAddingItem = ref(false)
const tablesAsList = ref(false)
const isAssignMode = ref(false)
const isCheckoutMode = ref(false)
const isCashierConfirmMode = ref(false)
const currentReceipt = ref<ReceiptViewModel | undefined>()
const ordersMap: ComputedRef<OrdersMap> = computed(() => orderStore.ordersMap.value)
const ordersAccountsMap: ComputedRef<{ [ordersAccountId: string]: IOrdersAccountViewModel }> = computed(() => orderStore.ordersAccountsMap.value)
const ordersAccountsTablesMap: ComputedRef<{ [tableId: string]: string }> = computed(() => Object.values(ordersAccountsMap.value)
  .filter(o => !!o.table?.id)
  .reduce((map, o) => ({ ...map, [o.table!.id!]: o.id }), {}))
const removedAtMap: Ref<RemovedElementsMap> = ref({})
const tableOrderMap: Ref<TableOrderMap> = ref({})

const closedOrdersAccounts = ref<string[]>([])

orderStore.on('tableOrderMapUpdated', tableOrderMapUpdated => tableOrderMap.value = tableOrderMapUpdated)
orderStore.on('ordersAccountRemoved', ({ ordersAccountId, lastId }) => {
  if (selectedOrderId.value === lastId)
    selectedOrderId.value = undefined
})
orderStore.on('removedAtMapUpdated', removedAtMapUpdated => removedAtMap.value = removedAtMapUpdated)
orderStore.on('ordersAccountClosed', ordersAccountId => {
  if (newOrder.value?.ordersAccountId === ordersAccountId)
    newOrder.value.ordersAccountId = undefined
  if (selectedOrdersAccountId.value === ordersAccountId) {
    selectedOrdersAccountId.value = undefined
    ordersAccountSessionModalVisible.value = false
    if (orderView.value === OrderView.Cashier)
      selectOrderView(OrderView[OrderView.List])
  }
  if (ordersAccountId && !closedOrdersAccounts.value.includes(ordersAccountId)) {
    notifier.notifySuccess('closed', 'ordersAccount')
    closedOrdersAccounts.value.push(ordersAccountId)
  }
})
orderStore.on('ordersUpdated', ({ updatedOrdersMap, updatedOrdersAccountsMap }) => {
  if (selectedOrderId.value) {
    const selectedOrder = updatedOrdersMap[selectedOrderId.value]
    if (!selectedOrder)
      selectedOrderId.value = undefined
    else if (selectedOrder && selectedOrder.ordersAccountId) {
      const selectedOrdersAccount = updatedOrdersAccountsMap[selectedOrder.ordersAccountId]
      selectedOrderId.value = selectedOrdersAccount.lastId
    }
  }
})
orderStore.on('tableOrderRemoved', order => {
  if (selectedOrderId.value === order.id)
    selectedOrderId.value = tableOrderMap.value[order.table!.id!].lastOrderId
})
orderStore.on('newTableOrder', order => {
  if (selectedOrderId.value === order.id)
    selectedOrderId.value = order.id!
})

const currentCheckoutAmount: Ref<number | undefined> = ref()
const selectedOrderId: Ref<string | undefined> = ref()
const selectedOrdersAccountId: Ref<string | undefined> = ref()
const orderView = ref(OrderView.List)
const orderDetailMode = ref<OrderDetailMode>('view')
const orderSettings = ref(OrdersSettings.LoadOrCreate())
watch(orderSettings, () => orderSettings.value.save(), { deep: true })
const orderSettingsModalVisible = ref<boolean>(false)
const menu: Ref<MenuViewModel | undefined> = ref(undefined)
const tablesMap: Ref<{ [tableId: string]: { tableGroupName: string, tableNumber: string } }> = ref({})
const tableGroupsMap: Ref<{ [tableGroupId: string]: TableGroupViewModel }> = ref({})
const ordersAccountSessionModalVisible = ref(false)
const showHiddenProducts = ref(false)
const categoriesMap: Ref<{ [categoryId: string]: MenuCategoryViewModel }> = ref({})
const menuItemsMap: Ref<{ [menuItemId: string]: MenuItemViewModel }> = ref({})
const menuItemAttributeGroupsMap: Ref<{ [menuItemAttributeGroupId: string]: MenuAttributeGroupViewModel }> = ref({})
const menuItemAttributesMap: Ref<{ [menuItemAttributeId: string]: MenuAttributeItemViewModel }> = ref({})
const audioNotification = computed(() => {
  let notification
  switch (orderSettings.value.audioSource) {
    case AudioSource.DingDong:
      notification = DingDongNotification
      break
    default:
      notification = DefaultNotification
      break
  }
  return new Audio(notification)
})
const pinnedOrders: Ref<Set<string>> = ref(new Set())
const printersMap: Ref<{ [printerId: string]: PrinterViewModel }> = ref({})
const selectedMenuItemId = ref<string | undefined>()
const newOrder: Ref<OrderViewModel> = ref(OrderViewModel.fromJS({ orderTypeId: OrderTypeEnum.Cashier })!)
const selectedOrderItem: Ref<OrderItemViewModel | undefined> = ref()
const selectedOrderItems = ref<string[]>([])
const selectedSessionId: Ref<string | undefined> = ref(undefined)
const hasMoneySplit = ref(false)

watch(store.selectedRestaurant, () => {
  router.push({ name: 'orders-list', params: { restaurantId: store.selectedRestaurantId } })
  setTimeout(() => location.reload())
})

watch(selectedOrderId, () => {
  if (orderDetailMode.value !== 'settle')
    orderDetailMode.value = 'view'
})

const selectedOrdersAccount = computed(() => {
  if (!selectedOrdersAccountId.value || !ordersAccountsMap.value[selectedOrdersAccountId.value]) return
  const ordersAccount = ordersAccountsMap.value[selectedOrdersAccountId.value]
  ordersAccount.orders = ordersAccount.orders?.map(o => ordersMap.value[o.id!]) ?? []
  return ordersAccount
})

const newOrders = computed(() => Object.values(ordersMap.value)
  .filter(order => order.statusId === OrderStatusEnum.Sent))

const filteredOrders = computed(() => {
  const orders = Object.values(ordersMap.value)
    .filter(order => {
      if (order.ordersAccountId) {
        if (!!ordersAccountsMap.value[order.ordersAccountId!] && ordersAccountsMap.value[order.ordersAccountId!].lastId !== order.id)
          return false
        else {
          const ordersAccountOrders = ordersAccountsMap.value[order.ordersAccountId!]?.orders?.map(order => ordersMap.value[order.id!]) ?? []
          if (ordersAccountOrders.some(order => {
            if ((orderSettings.value.statusFilters.length > 0 && !orderSettings.value.statusFilters.includes(order.statusId)) ||
              (orderSettings.value.categoryFilters.length > 0 && !order.items.some(i => hasCategoryFilter(i.menuItemId!))))
              return false
            return true
          }))
            return true
          return false
        }
      } else if (order.orderTypeId === OrderTypeEnum.Table) {
        if (orderSettings.value.tableGroupsFilters.length > 0 &&
          !orderSettings.value.tableGroupsFilters.includes(order.table!.groupId!))
          return false
        else if (tableOrderMap.value[order.table!.id!]?.lastOrderId !== order.id)
          return false
        else {
          const tableOrders = tableOrderMap.value[order.table!.id!].orderIds.map(orderId => ordersMap.value[orderId])
          if (tableOrders.some(tableOrder => {
            if ((orderSettings.value.statusFilters.length > 0 && !orderSettings.value.statusFilters.includes(tableOrder.statusId)) ||
              (orderSettings.value.categoryFilters.length > 0 && !tableOrder.items.some(i => hasCategoryFilter(i.menuItemId!))))
              return false
            return true
          }))
            return true
          return false
        }
      } else if (
        (
          orderSettings.value.statusFilters.length > 0 &&
          !orderSettings.value.statusFilters.includes(order.statusId)
        ) ||
        (
          orderSettings.value.tableGroupsFilters.length > 0 &&
          !orderSettings.value.tableGroupsFilters.includes(order.table!.groupId!)
        ) ||
        (
          orderSettings.value.categoryFilters.length > 0 &&
          !order.items.some(i => hasCategoryFilter(i.menuItemId!))
        )
      )
        return false
      return true
    })

  if ([...pinnedOrders.value].length > 0)
    return orders
      .sort((a, b) => [...pinnedOrders.value].indexOf((b.ordersAccountId ?? b.id)!) - [...pinnedOrders.value].indexOf((a.ordersAccountId ?? a.id)!))
  return orders.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
})

let notificationInterval: any
watch(() => filteredOrders.value, (newVal, oldVal) => {
  const oldIdsMap = oldVal.reduce((map, o) => ({ ...map, [o!.id!]: true }), {} as any)
  if (newVal.filter(o => !oldIdsMap[o!.id!]).length > 0) {
    triggerOrderNotification()
    if (!notificationInterval && orderSettings.value.notificationIntervalSeconds)
      notificationInterval = setInterval(() => {
        if (filteredOrders.value.some(o => [OrderStatusEnum.Sent, OrderStatusEnum.Created].includes(o.statusId)))
          triggerOrderNotification()
        else
          clearInterval(notificationInterval)
      }, 1000 * 15)
  }
  if (selectedOrdersAccountId.value && !!ordersAccountsMap.value[selectedOrdersAccountId.value])
    selectedOrderId.value = ordersAccountsMap.value[selectedOrdersAccountId.value].lastId
  else if (!selectedOrderId.value && newVal.length > 0 && !isMobile.value) {
    selectedOrderId.value = newVal[0].id
  }
  // if (orderView.value === OrderView.List)
  //   selectedOrdersAccountId.value = undefined
})

let lastTimePlayedNotification: Date | undefined
const DEFAULT_NOTIFICATION_INTERVAL_SECONDS = 30
const triggerOrderNotification = () => {
  if (lastTimePlayedNotification && orderSettings.value.notificationIntervalSeconds) {
    const secondsDiff = Math.round((new Date().getTime() - lastTimePlayedNotification.getTime()) / 1000)
    if (secondsDiff < (orderSettings.value.notificationIntervalSeconds!)) return
  }
  audioNotification.value.play()
  lastTimePlayedNotification = new Date()
}

const loadTables = async () => {
  try {
    const availableTableGroups = await apiClient.restaurantTablegroupsGet(props.restaurantId)
    tableGroupsMap.value = availableTableGroups.reduce((map, tableGroup) => ({ ...map, [tableGroup.id!]: tableGroup }), {})
    tablesMap.value = availableTableGroups.reduce((groupMap, tableGroup) => ({
      ...groupMap,
      ...tableGroup.tables.reduce((map, table) => ({ ...map, [table.id!]: { tableGroupName: tableGroup.name, tableNumber: table.number } }), {})
    }), {})
  } catch (error) {
    notifier.notifyError('loading', error, 'tables')
  }
}

const loadMappings = async () => {
  try {
    const mappings = await loadMenuMappings(props.restaurantId)
    if (!mappings)
      throw new Error('Empty menu')
    menu.value = mappings.menu
    menuItemAttributeGroupsMap.value = mappings.menuItemAttributeGroupMapping
    menuItemAttributesMap.value = mappings.menuItemAttributeMapping
    categoriesMap.value = mappings.categoriesMapping
    menuItemsMap.value = mappings.menuItemsMapping

    orderStore.startWsConnection(props.restaurantId)
  } catch (error) {
    notifier.notifyError('loading', error, 'menu')
  }
}

const updateMenuItemVisiblity = (menuItemId: string, isVisible: boolean) => {
  const menuCopy = menu.value!
  const menuItemIdx = menuCopy.menuItems.findIndex(i => i.id === menuItemId)
  const menuItem = menuCopy.menuItems[menuItemIdx]
  menuItem.isVisible = isVisible
  menuCopy.menuItems[menuItemIdx] = menuItem
  menu.value = menuCopy
  menuItemsMap.value[menuItem.id!] = menuItem
}

const updateMenuCategoryVisibility = (categoryId: string, isVisible: boolean) => {
  const menuCopy = menu.value!
  const categoryIdx = menuCopy.categories.findIndex(i => i.id === categoryId)
  const category = menuCopy.categories[categoryIdx]
  category.isVisible = isVisible
  menuCopy.categories[categoryIdx] = category
  menu.value = menuCopy
  categoriesMap.value[categoryId] = category
}

const loadPrinters = async () => {
  try {
    const printers = await apiClient.restaurantPrinters(props.restaurantId)
    printersMap.value = printers.reduce((map, printer) => ({ ...map, [printer.id!]: printer }), {})
    orderSettings.value.automaticPrintDevices = Object.keys(orderSettings.value.automaticPrintDevices)
      .reduce((map, menuId) => {
        const menuMappings = orderSettings.value.automaticPrintDevices[menuId]
        map[menuId] = Object.keys(menuMappings)
          .filter(p => !!printersMap.value[p])
          .reduce((pMap, printerId) => ({ ...pMap, [printerId]: menuMappings[printerId] }), {} as any)
        return map
      }, {} as any)
  } catch (error) {
    notifier.notifyError('loading', error, 'devices')
  }
}

const hasCategoryFilter = (menuItemId: string) => {
  const categories = Object.values(categoriesMap.value).filter(c => c.menuItemIds!.indexOf(menuItemId) > -1)
  return categories.some(c => orderSettings.value.categoryFilters.indexOf(c.id!) > -1)
}

const saveOrderItem = (item: OrderItemViewModel) => {
  const idx = newOrder.value!.items.findIndex(i => i.id === item!.id)
  if (idx < 0)
    newOrder.value?.items.push(item)
  else
    newOrder.value!.items[idx] = item
  selectedOrderItem.value = undefined
  selectedMenuItemId.value = undefined
}

const removeOrderItem = (orderItemId: string) => {
  if (!orderItemId) return
  const idx = newOrder.value!.items.findIndex(i => i.id === orderItemId)
  if (idx < 0) return
  newOrder.value!.items.splice(idx, 1)
  selectedOrderItem.value = undefined
}

const createNewOrder = () => {
  newOrder.value = OrderViewModel.fromJS({
    restaurantId: props.restaurantId,
    orderTypeId: OrderTypeEnum.Cashier,
    items: []
  })!
}

const addOrderToOrdersAccount = (ordersAccountId: string) => {
  selectedOrdersAccountId.value = ordersAccountId
  createNewOrder()
  newOrder.value!.ordersAccountId = ordersAccountId
  newOrder.value!.orderTypeId = ordersMap.value[ordersAccountsMap.value[ordersAccountId].lastId!].orderTypeId
  newOrder.value!.tableId = ordersAccountsMap.value[ordersAccountId].table?.id
  orderView.value = OrderView.Cashier
  orderDetailMode.value = 'view'
}

const selectOrderView = (view: any) => {
  orderView.value = OrderView[view] as any
  orderDetailMode.value = 'view'
  selectedOrdersAccountId.value = undefined
  isAssignMode.value = false
  isAddingItem.value = false
  isCheckoutMode.value = false
  selectedOrderItems.value = []
  selectedOrderItem.value = undefined
  selectedMenuItemId.value = undefined
  if (isMobile.value)
    selectedOrderId.value = undefined
  if (orderView.value === OrderView.Cashier)
    isAddingItem.value = true
}

const selectTable = (tableId: string) => {
  if (isAssignMode.value) {
    showConfirm('proceedQuestion', async () => {
      try {
        const currentOrder = ordersMap.value[selectedOrderId.value!]
        await apiClient.ordersAccountTable(props.restaurantId, currentOrder.ordersAccountId!, tableId)
        notifier.notifySuccess('assigned', 'table')
      } catch (error) {
        notifier.notifyError('assigning', error, 'table')
      }
    })
    isAssignMode.value = false
    orderView.value = OrderView.List
    return
  }
  const currentOrdersAccountId = ordersAccountsTablesMap.value[tableId]
  if (currentOrdersAccountId) {
    selectedOrderId.value = ordersAccountsMap.value[currentOrdersAccountId].lastId
    selectedOrdersAccountId.value = undefined
    orderView.value = OrderView.List
  } else {
    selectedOrderId.value = undefined
    newOrder.value.tableId = tableId
    newOrder.value.orderTypeId = OrderTypeEnum.Table
    orderView.value = OrderView.Cashier
  }
}

const settle = (orderAccountId: string) => {
  selectedOrdersAccountId.value = orderAccountId
  orderView.value = OrderView.Cashier
  orderDetailMode.value = 'settle'
  const paidItems = ordersAccountsMap.value[orderAccountId].receipts?.flatMap(t => t.orderItems) ?? []
  selectedOrderItems.value = ordersAccountsMap.value[orderAccountId].orders
    ?.map(o => ordersMap.value[o.id!])
    .flatMap(o => o.items.map(i => i.id!))
    .filter(i => !paidItems.includes(i)) ?? []
  hasMoneySplit.value = selectedOrdersAccount.value?.hasMoneySplit ?? false
}

const tableOrdersCountMap = computed(() => Object.keys(ordersAccountsTablesMap.value)
  .reduce((map, tableId) => {
    const ordersAccountLocal = ordersAccountsMap.value[ordersAccountsTablesMap.value[tableId]]!
    const ordersLocal = ordersAccountLocal.orders
      ?.map(o => ordersMap.value[o.id!])
      ?.filter(o => [OrderStatusEnum.Rejected, OrderStatusEnum.Canceled].indexOf(o.statusId) === -1 && o.items?.filter(i => !i.isRemoved && !i.isRefunded).length > 0)
      ?? [] as OrderViewModel[]
    const updatedAmount = ordersLocal.reduce((total, order) => total + order.amount, 0)
    const paidAmount = ordersAccountLocal.receipts?.reduce((total, t) => total + t.amount, 0) ?? 0
    let status
    if (ordersLocal.some(o => o.statusId === OrderStatusEnum.Sent))
      status = 'hasPending'
    else if (updatedAmount === paidAmount)
      status = 'paid'
    else
      status = 'accepted'
    return {
      ...map,
      [tableId]: { count: ordersLocal.length, status }
    }
  }, {}))

const loadReceipt = async (receiptId: string) => {
  try {
    currentReceipt.value = await apiClient.receipt(props.restaurantId, receiptId)
  } catch (error) {
    notifier.notifyError('loading', error, 'receipt')
  }
}

onMounted(() => {
  if (!props.restaurantId) {
    router.push({ name: 'home' })
    return
  }
  createNewOrder()
  loadMappings()
  loadPrinters()
  loadTables()
})

onUnmounted(() => {
  if (!store.isDeviceLocked)
    orderStore.unmount()
})

</script>
<template>
  <div>
    <ReceiptModal :restaurant-id="restaurantId" v-model:receipt="currentReceipt" @close="currentReceipt = undefined">
    </ReceiptModal>
    <OrdersSettingsModal :restaurant-id="restaurantId" v-model:order-settings="orderSettings" :menu-id="menu?.id ?? ''"
      v-model:is-open="orderSettingsModalVisible" @close="orderSettingsModalVisible = false" :printers-map="printersMap"
      :categories="menu?.categories ?? []" :table-groups-map="tableGroupsMap" />
    <OrdersAccountSessionsModal v-if="ordersAccountSessionModalVisible"
      @close="ordersAccountSessionModalVisible = false; selectedOrdersAccountId = undefined" :restaurant-id="restaurantId"
      :orders-account-id="selectedOrdersAccountId!">
    </OrdersAccountSessionsModal>
    <div class="flex flex-col w-full relative">
      <div
        class="bg-white justify-between shadow-default flex h-10 m-2 mr-3 items-center overflow-y-hidden px-2 rounded overflow-x-auto max-w-full">
        <div class="hidden md:flex gap-1 w-1/3">
          <button class="btn-action hidden md:flex h-8 blue w-auto" v-if=" store.device.value?.defaultPrinterId "
            @click=" openCashbox(props.restaurantId, store.device.value!.id!) ">
            <span class="mdi mdi-cash-register"></span>
            <span>{{ $tc('openDrawer') }}</span>
          </button>
        </div>
        <div class="flex items-center justify-center gap-1 md:gap-4 w-full md:w-1/3 relative">
          <button v-if=" selectedOrderId && orderView === OrderView.List "
            class="btn-action p-1 gray md:hidden absolute top-0 bottom-0 my-auto -left-1"
            @click=" selectedOrderId = undefined ">
            <span class="mdi mdi-close"></span>
          </button>
          <template v-if=" orderView === OrderView.Cashier ">
            <button v-if=" !isCheckoutMode && !isAddingItem "
              class="btn-action p-1 gray md:hidden absolute top-0 bottom-0 my-auto -left-1"
              @click=" orderView = OrderView.List; orderDetailMode = 'view' ">
              <span class="mdi mdi-arrow-left"></span>
            </button>
            <button v-if=" !isCheckoutMode && isAddingItem "
              class="btn-action p-1 gray md:hidden absolute top-0 bottom-0 my-auto -left-1"
              @click=" selectedOrderItem = undefined; selectedMenuItemId = undefined; isAddingItem = false ">
              <span class="mdi mdi-arrow-left"></span>
            </button>
            <button v-if=" isCheckoutMode " class="btn-action p-1 gray md:hidden absolute top-0 bottom-0 my-auto -left-1"
              @click=" isCheckoutMode = false ">
              <span class="mdi mdi-arrow-left"></span>
            </button>
          </template>
          <button
            class="flex outline-none items-center justify-center gap-1 hover:bg-white relative transition-all hover:shadow-default py-1 px-2 rounded-default"
            v-for="   view    of    enumToArray(OrderView).filter(v => (OrderView[v as number] as any) !== OrderView.Kanban)   "
            :key=" (view as any) " @click=" selectOrderView(view) "
            :class=" { 'text-gray-body hover:text-primary': orderView != OrderView[view as number] as any, 'bg-gradient text-white': orderView === OrderView[view as number] as any } ">
            <span :class="
              {
                'mdi-view-list': OrderView[view as number] as any === OrderView.List,
                  'mdi-cash-register': OrderView[view as number] as any === OrderView.Cashier,
                    'mdi-table-chair': OrderView[view as number] as any === OrderView.Floor,
                      'mdi-view-dashboard-variant': OrderView[view as number] as any === OrderView.Kanban,
                                                }
            " class="mdi "></span>
            <template v-if=" (OrderView[view as number] as any) === OrderView.List ">

              <span
                class="absolute top-0 bottom-0 my-auto -left-6 text-xs rounded-full bg-primary text-white font-semibold w-5 h-5 flex items-center justify-center">{{
                filteredOrders.length
                }}</span>
            </template>
            <span class="text-sm font-semibold">{{ $tc((view as string).toLowerCase()) }}</span>
          </button>
          <button @click=" orderSettingsModalVisible = true "
            class="md:hidden absolute right-1 my-auto top-0 bottom-0"><span
              class="text-gray-body mdi mdi-cog"></span></button>
        </div>
        <div class="md:flex gap-2 items-center justify-end px-1 hidden w-1/3">
          <div class="md:flex gap-2 border-r border-gray-200 items-center pr-2 hidden text-gray-body"
            v-if=" orderView === OrderView.Cashier && orderDetailMode !== 'settle' ">
            <span class="mdi mdi-eye-off"></span>
            <Toggle v-model=" showHiddenProducts "></Toggle>
            <span class="mdi mdi-eye"></span>
          </div>
          <div class="md:flex gap-2 border-r border-gray-200 items-center pr-2 hidden"
            v-if=" orderView === OrderView.Floor ">
            <span class="text-sm text-gray-body font-semibold">{{ $tc('floor') }}</span>
            <Toggle v-model=" tablesAsList "></Toggle>
            <span class="text-sm text-gray-body font-semibold">{{ $tc('list') }}</span>
          </div>
          <button @click=" orderSettingsModalVisible = true "><span class="text-gray-body mdi mdi-cog"></span></button>
        </div>
      </div>
      <div>
        <KeepAlive>
          <div class="w-full">
            <div class="flex" v-if=" [OrderView.List, OrderView.Cashier].includes(orderView) ">
              <div class="w-full md:w-[320px] border-r border-gray-200"
                :class=" { 'hidden md:block': (orderView === OrderView.List && selectedOrderId) || (orderView === OrderView.Cashier && (isAddingItem || !!selectedOrderItem || (orderDetailMode === 'settle' && !isCheckoutMode))) } ">
                <OrdersListView v-if=" orderView === OrderView.List " :selected-order-id=" selectedOrderId "
                  @update:selected-order-id=" selectedOrdersAccountId = undefined; selectedOrderId = $event; selectedOrderItems = [] "
                  :filtered-orders=" filteredOrders " :tables-map=" tablesMap " :orders-map=" ordersMap "
                  :orders-accounts-map=" ordersAccountsMap "
                  :language-code=" store.selectedRestaurant.value!.defaultLangCode " :removed-at-map=" removedAtMap "
                  :table-order-map=" tableOrderMap " />
                <OrdersCashierView v-else-if=" orderView === OrderView.Cashier " v-model:order=" newOrder "
                  :restaurant-id=" restaurantId " :menu-id=" menu?.id " @is-adding-item=" isAddingItem = true "
                  :order-settings=" orderSettings " v-model:current-receipt=" currentReceipt "
                  :current-checkout-amount=" currentCheckoutAmount "
                  @update:current-checkout-amount=" currentCheckoutAmount = $event; isCheckoutMode = false "
                  :has-money-split=" hasMoneySplit " @close=" orderView = OrderView.List; orderDetailMode = 'view' "
                  @clear:order=" createNewOrder(); selectedOrdersAccountId = undefined "
                  @created:order=" selectedOrdersAccountId = $event; orderView = OrderView.List; createNewOrder() "
                  :is-selector-mode=" orderDetailMode !== 'settle' " v-model:filter-items=" selectedOrderItems "
                  :orders-accounts-map=" ordersAccountsMap " :orders-map=" ordersMap " :tables-map=" tablesMap "
                  :printers=" Object.values(printersMap) " :menu-items-map=" menuItemsMap "
                  v-model:selected-orders-account-id=" selectedOrdersAccountId "
                  v-model:selected-order-item=" selectedOrderItem " :menu-item-attributes-map=" menuItemAttributesMap "
                  :table-groups=" Object.values(tableGroupsMap) " @save:order-item=" saveOrderItem($event) "
                  @delete:order-item=" removeOrderItem "
                  :language-code=" store.selectedRestaurant.value!.defaultLangCode " />
              </div>
              <div class="md:flex-1 w-full"
                :class=" { 'hidden md:block': !selectedOrderId || (orderDetailMode === 'settle' && isCheckoutMode) } "
                v-if=" orderView === OrderView.List || orderDetailMode === 'settle' ">
                <div class="w-full overflow-hidden">
                  <div v-if=" !selectedOrderId " class="h-full w-full flex flex-col justify-center items-center -mt-20">
                    <h2 class="font-semibold text-2xl text-gray-400">{{ $tc('noOrdersSelected') }}</h2>
                  </div>
                  <div class="md:flex flex-col" v-else>
                    <OrderDetailSection @updated:order=" orderStore.resetRefreshCounter() "
                      @update:checkout-mode=" isCheckoutMode = $event "
                      @assign=" isAssignMode = true; orderView = OrderView.Floor " @show-modal:receipt=" loadReceipt "
                      :current-checkout-amount=" currentCheckoutAmount "
                      @update:current-checkout-amount=" currentCheckoutAmount = $event; isCheckoutMode = true "
                      v-model:has-money-split=" hasMoneySplit "
                      @updated:orders-account=" orderStore.resetRefreshCounter() "
                      v-model:selected-items=" selectedOrderItems " v-model:selected-session-id=" selectedSessionId "
                      @cancel=" selectedOrdersAccountId = undefined; orderView = OrderView.List; orderDetailMode = 'view'; currentCheckoutAmount = undefined "
                      @add:order=" addOrderToOrdersAccount " @settle=" settle " v-model:mode=" orderDetailMode "
                      :restaurant-id=" restaurantId " :tables-map=" tablesMap " :orders-map=" ordersMap "
                      :selectedOrderId=" selectedOrderId " :orders-accounts-map=" ordersAccountsMap "
                      :language-code=" store.selectedRestaurant.value!.defaultLangCode " :menu=" menu "
                      :printers=" Object.values(printersMap) " :removed-at-map=" removedAtMap "
                      :menu-item-attribute-groups-map=" menuItemAttributeGroupsMap " :menu-items-map=" menuItemsMap "
                      :menu-item-attributes-map=" menuItemAttributesMap " :table-order-map=" tableOrderMap "
                      :order-settings=" orderSettings " :categories-map=" categoriesMap "
                      @show-modal:sessions=" selectedOrdersAccountId = $event; ordersAccountSessionModalVisible = true " />
                  </div>
                </div>
              </div>
              <div class="w-full md:block"
                :class=" { 'block': isAddingItem || selectedOrderItem, 'hidden': !isAddingItem && !selectedOrderItem } "
                v-else-if=" menu ">
                <OrderItemSelector @update:item-visibility=" updateMenuItemVisiblity "
                  @update:category-visibility=" updateMenuCategoryVisibility " :restaurant-id=" restaurantId "
                  :show-hidden-products=" showHiddenProducts " :categories-map=" categoriesMap "
                  :menu-items-map=" menuItemsMap " @delete=" removeOrderItem " :order-settings=" orderSettings "
                  @close=" selectedMenuItemId = undefined; selectedOrderItem = undefined "
                  :menu-item-attribute-groups-map=" menuItemAttributeGroupsMap " v-model:order-item=" selectedOrderItem "
                  :menu-item-attributes-map=" menuItemAttributesMap " class="w-full"
                  :show-as-grid=" orderSettings.showSelectorAsGrid " v-model:selected-item-id=" selectedMenuItemId "
                  :menu=" menu " :language-code=" store.selectedRestaurant.value!.defaultLangCode "
                  @selected=" saveOrderItem($event); isAddingItem = false " />
              </div>
            </div>
            <template v-else-if=" orderView === OrderView.Floor ">
              <OrdersFloorView v-if=" !tablesAsList " :table-orders-count-map=" tableOrdersCountMap "
                :table-groups-map=" tableGroupsMap " @selected:table=" selectTable " />
              <div v-else></div>
            </template>
            <OrdersKanbanView v-else-if=" orderView === OrderView.Kanban " />
          </div>
        </KeepAlive>
      </div>
    </div>
  </div>
</template>
