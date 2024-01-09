<script setup lang="ts">
import { computed, onBeforeUnmount, PropType, Ref, ref, watch, watchEffect } from 'vue'
import { apiClient } from '../../services/api'
import { MenuCategoryViewModel, MenuAttributeGroupViewModel, MenuAttributeItemViewModel, MenuItemViewModel, OrderStatusEnum, OrderViewModel, UpdateOrderStatusRequest, PrinterViewModel, IOrdersAccountViewModel, OrderTypeEnum, RefundRequest, IOrderItemViewModel, MenuViewModel, ReceiptViewModel, PriceModifierTypeEnum, UpdatePriceModifierRequest } from '../../services/api.client'
import { useShowConfirm } from '../../services/injections'
import LoadingButton from '../ui/LoadingButton.vue'
import { numberFormatter } from '../../services/number.formatter'
import { store } from '../../services/store'
import { printOrder, printOrdersAccount, printReceipt } from '../../services/printer'
import { notifier } from '../../services/notification'
import { pageContentHeight } from '../../services/utils'
import OrderCard from './OrderCard.vue'
import PrintersDropdown from './PrintersDropdown.vue'
import { OrderDetailMode } from './order-detail-mode'
import OrderCardLabels from './OrderCardLabels.vue'
import ScrollableDiv from '../ui/ScrollableDiv.vue'
import { OrdersSettings } from './orders-settings'
import NumericKeypad from './NumericKeypad.vue'
import Modal from '../ui/Modal.vue'
import { DropdownItem, ModalSize } from '../ui/types'
import OrdersAccountReceipts from './OrdersAccountReceipts.vue'
import Collapse from '../ui/Collapse.vue'
import Dropdown from '../ui/Dropdown.vue'

const props = defineProps({
  isHistoryMode: Boolean,
  selectedSessionId: String,
  menu: Object as PropType<MenuViewModel>,
  mode: {
    type: String as PropType<OrderDetailMode>,
    required: true
  },
  orderSettings: Object as PropType<OrdersSettings>,
  ordersMap: {
    type: Object as PropType<{ [orderId: string]: OrderViewModel }>,
    required: true
  },
  currentCheckoutAmount: Number,
  removedAtMap: {
    type: Object as PropType<{ [orderId: string]: { removedAt: Date, percentageCompleted: number } }>,
    default: () => ({})
  },
  selectedOrderId: {
    type: String,
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
  languageCode: {
    type: String,
    required: true
  },
  selectedItems: {
    type: Array as PropType<string[]>,
    default: () => ([])
  },
  categoriesMap: Object as PropType<{ [categoryId: string]: MenuCategoryViewModel }>,
  menuItemsMap: Object as PropType<{ [menuItemId: string]: MenuItemViewModel }>,
  menuItemAttributeGroupsMap: Object as PropType<{ [menuAttributeGroupId: string]: MenuAttributeGroupViewModel }>,
  menuItemAttributesMap: Object as PropType<{ [menuAttributeId: string]: MenuAttributeItemViewModel }>,
  printers: {
    type: Array as PropType<PrinterViewModel[]>,
    required: true
  },
  tablesMap: {
    type: Object as PropType<{ [tableId: string]: { tableGroupName: string, tableNumber: string } }>,
    required: true
  },
  restaurantId: {
    type: String,
    required: true
  },
  hasMoneySplit: Boolean
})
const emits = defineEmits([
  'refresh',
  'showModal:sessions',
  'settle',
  'update:currentCheckoutAmount',
  'cancel',
  'assign',
  'add:order',
  'update:hasMoneySplit',
  'showModal:receipt',
  'updated:order',
  'update:mode',
  'update:selectedSessionId',
  'update:selectedItems',
  'updated:ordersAccount'
])

const selectedAttributeItems: Ref<string[]> = ref([])
const showConfirm = useShowConfirm()
const loadingState: Ref<OrderStatusEnum | null> = ref(null)
const selectedOrderIdForMode: Ref<string | undefined> = ref(undefined)
const splittedAmounts = ref<number[]>([])
const selectedSplitAmountIdx = ref<number | null>(null)
const priceModifierValue = ref(0)
const priceModifierVisible = ref(false)
const priceModifier = ref<PriceModifierTypeEnum | undefined>()

let checkTimeout: any

const updateOrderStatus = async (order: OrderViewModel, status: OrderStatusEnum, markAsInvisible: boolean, withConfirm?: boolean, force?: boolean) => {
  const fn = async () => {
    loadingState.value = status
    try {
      const originalStatusId = order.statusId
      await apiClient.orderStatus(props.restaurantId, order.id!, UpdateOrderStatusRequest.fromJS({
        status,
        force: force ?? false,
        refundOrderItems: props.selectedItems,
        refundOrderItemAttributes: selectedAttributeItems.value,
        markAsInvisible
      })!)

      emits('update:selectedItems', [])
      selectedAttributeItems.value = []

      checkTimeout = setTimeout(() => {
        if (order && order.statusId === originalStatusId)
          order.statusId = status
      }, 2000)
      loadingState.value = null

      notifier.notifySuccess('updated', 'order')
      if (!!props.menu && status === OrderStatusEnum.Accepted && props.orderSettings?.automaticPrintDevices?.[props.menu!.id! ?? '']) {
        const printersSettings = props.printers
          .filter(p => props.orderSettings!.automaticPrintDevices[props.menu!.id!][p.id!]?.length > 0)
          .map(p => ({ printer: p, categoriesId: props.orderSettings?.automaticPrintDevices?.[props.menu!.id!]?.[p.id!] ?? [] }))
        printOrder(order.id!, ...printersSettings)
      }
      emits('updated:order')
      emits('update:mode', 'view')
    } catch (error) {
      notifier.notifyError('updating', error, 'order')
      loadingState.value = null
    }
    // checkTimeout = setTimeout(() => emits('refresh', props.order.id), ORDER_CHECK_TIMEOUT)
  }
  if (withConfirm)
    showConfirm('proceedQuestion', () => fn())
  else
    await fn()
}

const removeFromOrders = () => {
  showConfirm('proceedQuestion', () => {
    const fn = async () => {
      loadingState.value = OrderStatusEnum.ProcessingPayment
      try {
        const request = new RefundRequest({
          refundOrderItemAttributes: selectedAttributeItems.value,
          refundOrderItems: props.selectedItems,
          markAsInvisible: false
        })
        if (ordersAccount.value) {
          const updatedOrdersAccount = await apiClient.ordersAccountRefund(props.restaurantId, ordersAccount.value.id, request)
          emits('updated:ordersAccount', updatedOrdersAccount)
        } else {
          const updatedOrder = await apiClient.orderRefund(props.restaurantId, selectedOrderIdForMode.value!, request)
          emits('updated:order', updatedOrder)
        }

        selectedAttributeItems.value = []
        emits('update:selectedItems', [])
        notifier.notifySuccess('removed', 'items')
        emits('update:mode', 'view')
      } catch (error) {
        notifier.notifyError('removing', error)
        loadingState.value = null
      }
    }
    const orderItemsSelectedAttributes = orders.value
      ?.flatMap(o => o.items)
      .filter(i => i.attributeGroups
        ?.some(g => g.orderItemAttributes
          ?.some(a => selectedAttributeItems.value.includes(a.id!))))
      .map(i => i.id!) ?? []
    if (paidItems.value.some(i => [...props.selectedItems, ...orderItemsSelectedAttributes].includes(i)))
      showConfirm('itemsAlreadyPaid', async () => fn())
    else
      fn()
  })
}

const toggleItem = (id: string) => {
  const localSelectedItems = props.selectedItems
  const idx = localSelectedItems.indexOf(id)
  if (idx > -1)
    localSelectedItems.splice(idx, 1)
  else
    localSelectedItems.push(id)
  emits('update:selectedItems', localSelectedItems)
}

const toggleAttribute = (id: string) => {
  const idx = selectedAttributeItems.value.indexOf(id)
  if (idx > -1)
    selectedAttributeItems.value.splice(idx, 1)
  else
    selectedAttributeItems.value.push(id)
}

const toggleMode = (modeNew: OrderDetailMode, forId?: string) => {
  emits('update:mode', modeNew)
  emits('update:selectedSessionId', undefined)
  selectedAttributeItems.value = []
  emits('update:selectedItems', [])
  selectedOrderIdForMode.value = forId
}

const hasCategoryFilter = (menuItemId: string) => {
  const categories = Object.values(props.categoriesMap ?? {}).filter(c => c.menuItemIds!.indexOf(menuItemId) > -1)
  return categories.some(c => props.orderSettings!.categoryFilters.indexOf(c.id!) > -1)
}

const toggleAll = () => {
  emits('update:selectedItems', props.selectedItems.length === payableItems.value.length ? [] : payableItems.value)
}

const setSplitAmounts = (totalSplits: number) => {
  if (payableAmount.value <= 0) {
    splittedAmounts.value = []
    return
  }
  if (totalSplits <= 1) {
    splittedAmounts.value = [payableAmount.value]
    return
  }
  const singleAmount = parseFloat((payableAmount.value / totalSplits).toFixed(2))
  splittedAmounts.value = [...Array(totalSplits).keys()].map(k => singleAmount)
  splittedAmounts.value[0] = parseFloat((singleAmount + (payableAmount.value - singleAmount * totalSplits)).toFixed(2))
}

const recalculateSplit = () => {
  const fixedIndex = selectedSplitAmountIdx.value
  if (fixedIndex === null) return
  const fixedValue = splittedAmounts.value[fixedIndex]
  const leftAmount = payableAmount.value - fixedValue
  if (leftAmount === 0) {
    splittedAmounts.value = [fixedValue]
    return
  }
  const totalSplits = splittedAmounts.value.length > 1 ? splittedAmounts.value.length - 1 : 1
  const singleAmount = parseFloat((leftAmount / totalSplits).toFixed(2))
  splittedAmounts.value = [fixedValue, ...[...Array(totalSplits).keys()].map(k => singleAmount)]
  splittedAmounts.value[1] = parseFloat((singleAmount + (leftAmount - singleAmount * totalSplits)).toFixed(2))
  selectedSplitAmountIdx.value = null
}

const mainOrder = computed(() => props.ordersMap[props.selectedOrderId!]!)
const ordersAccount = computed(() => {
  if (mainOrder.value?.ordersAccountId)
    return props.ordersAccountsMap[mainOrder.value.ordersAccountId!]
  return undefined
})
const paidItems = computed(() => ordersAccount.value?.receipts?.flatMap(t => t.orderItems!) ?? [])
const orders = computed(() => {
  if (!mainOrder.value) return []
  let orders = []
  if (mainOrder.value.ordersAccountId) {
    let cleanedOrders = props.ordersAccountsMap[mainOrder.value.ordersAccountId!]
      ?.orders
      ?.map(order => props.ordersMap[order.id!]) ?? []
    if (props.orderSettings)
      cleanedOrders = cleanedOrders?.filter(order => {
        if ((props.orderSettings!.statusFilters.length > 0 && !props.orderSettings!.statusFilters.includes(order.statusId)) ||
          (props.orderSettings!.categoryFilters.length > 0 && !order.items.some(i => hasCategoryFilter(i.menuItemId!))))
          return false
        return true
      })
    orders = cleanedOrders ?? []
  } else {
    if (mainOrder.value.orderTypeId === OrderTypeEnum.Table) {
      let cleanedOrders = props.tableOrderMap[mainOrder.value.table!.id!].orderIds
        .map(orderId => props.ordersMap[orderId])
        .filter(order => !!order)
      if (props.orderSettings)
        cleanedOrders = cleanedOrders.filter(order => {
          if ((props.orderSettings!.statusFilters.length > 0 && !props.orderSettings!.statusFilters.includes(order.statusId)) ||
            (props.orderSettings!.categoryFilters.length > 0 && !order.items.some(i => hasCategoryFilter(i.menuItemId!))))
            return false
          return true
        })
      orders = cleanedOrders
    } else
      orders = [mainOrder.value]
  }
  return orders
})

const paidAmount = computed(() => ordersAccount.value?.receipts?.reduce((total, t) => total + t.amount, 0) ?? 0)

const orderedOrders = computed(() => {
  let ordersRet = orders.value
    .filter(o =>
      o.items.filter(i => !i.isRemoved && !i.isRefunded).length > 0 &&
      ((props.mode !== 'settle' || (o.items.filter(i => !paidItems.value.includes(i.id!)).length > 0)) &&
        [
          OrderStatusEnum.Canceled,
          ...(['settle', 'recap', 'edit', 'refund'].includes(props.mode) ? [OrderStatusEnum.Rejected] : []),
          ...(props.mode === 'refund' ? [OrderStatusEnum.Sent] : [])
        ].indexOf(o.statusId) === -1))
  if (props.mode === 'recap')
    ordersRet = ordersRet.filter(o => o.items.some(i => props.selectedItems.includes(i.id!)))
  return ordersRet.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
})

const payableItems = computed(() => orders.value
  .flatMap(o => o.items.map(i => i.id!))
  .filter(id => !paidItems.value.includes(id)))

const totalOrderItemsCount = computed(() => {
  const tot = orders.value
    .filter(o => [OrderStatusEnum.Rejected, OrderStatusEnum.Canceled].indexOf(o.statusId) === -1)
    .reduce((total, order) => total + order.items.reduce((subTotal, orderItem) =>
      subTotal + orderItem.count * (orderItem.price + orderItem.attributeGroups!
        .flatMap(g => g.orderItemAttributes)
        .reduce((total, a) => total + (a!.price * a!.count), 0)), 0), 0)
  return tot
})

const totalOrdersAmount = computed(() => orders.value
  .filter(o => [OrderStatusEnum.Rejected, OrderStatusEnum.Canceled].indexOf(o.statusId) === -1)
  .reduce((total, order) => total + order.amount, 0))

const totalAmount = computed(() => totalOrdersAmount.value + totalPriceModifier.value)

const updatedAmount = computed(() => {
  let orderAmount = 0
  if (props.mode === 'settle' && props.hasMoneySplit) return totalAmount.value
  if (['recap', 'settle', 'refund'].includes(props.mode))
    orders.value
      .filter(o => [
        OrderStatusEnum.Rejected,
        OrderStatusEnum.Canceled
      ].indexOf(o.statusId) === -1)
      .flatMap(o => o.items).forEach(orderItem => {
        if (props.selectedItems.includes(orderItem.id!)) {
          let orderItemAmount = orderItem.count * (orderItem.price + orderItem.attributeGroups!
            .flatMap(g => g.orderItemAttributes)
            .reduce((total, a) => total + (a!.price * a!.count), 0))
          if (orderItem.priceModifierTypeId != null) {
            switch (orderItem.priceModifierTypeId) {
              case PriceModifierTypeEnum.DISCOUNT_AMOUNT:
                orderItemAmount -= orderItem.priceModifierValue!
                break
              case PriceModifierTypeEnum.DISCOUNT_PERCENTAGE:
                orderItemAmount -= Math.round(orderItemAmount * orderItem.priceModifierValue!) / 100
                break
              case PriceModifierTypeEnum.SURCHARGE_AMOUNT:
                orderItemAmount += orderItem.priceModifierValue!
                break
              case PriceModifierTypeEnum.SURCHARGE_PERCENTAGE:
                orderItemAmount += Math.round(orderItemAmount * orderItem.priceModifierValue!) / 100
                break
            }
          }
          orderAmount += orderItemAmount
        } else if (props.mode === 'refund')
          orderAmount += orderItem.attributeGroups!
            .flatMap(g => g.orderItemAttributes)
            .filter(a => selectedAttributeItems.value.includes(a!.id!))
            .reduce((total, a) => total + (a!.price * a!.count), 0)
      })
  else {
    orderAmount = totalAmount.value
    if (props.mode === 'view')
      orders.value
        .filter(o => [OrderStatusEnum.Rejected, OrderStatusEnum.Canceled].indexOf(o.statusId) === -1)
        .flatMap(o => o.items).forEach(orderItem => {
          if (props.selectedItems.includes(orderItem.id!))
            orderAmount -= orderItem.count * orderItem.price
          if (selectedAttributeItems.value.length > 0 && orderItem.attributeGroups!.length > 0)
            orderItem.attributeGroups!.forEach(orderItemAttributeGroup => {
              orderItemAttributeGroup.orderItemAttributes!.forEach(orderItemAttribute => {
                if (selectedAttributeItems.value.indexOf(orderItemAttribute.menuAttributeItemId!) > -1)
                  orderAmount -= orderItemAttribute.count * orderItemAttribute.price
              })
            })
        })
  }
  return orderAmount
})

const payableAmount = computed(() => parseFloat((totalAmount.value - paidAmount.value - (props.currentCheckoutAmount ?? 0)).toFixed(2)))

const defaultPrinter = computed(() => {
  if (!store.device.value?.defaultPrinterId || props.printers.length === 0) return undefined
  return props.printers.find(p => p.id === store.device.value?.defaultPrinterId)
})

watch(() => props.ordersMap, () => {
  if (checkTimeout)
    clearTimeout(checkTimeout)

  emits('update:hasMoneySplit', ordersAccount.value?.hasMoneySplit ? true : props.hasMoneySplit)
  loadingState.value = null
})

watch(() => props.selectedOrderId, () => {
  emits('update:hasMoneySplit', ordersAccount.value?.hasMoneySplit ?? false)
})

watchEffect(() => {
  priceModifier.value = ordersAccount.value?.priceModifierTypeId
  priceModifierValue.value = ordersAccount.value?.priceModifierValue ?? 0
})

watch(() => props.mode, () => {
  if (props.mode === 'settle' && props.hasMoneySplit)
    setSplitAmounts(1)
})

watch(() => props.hasMoneySplit, () => setSplitAmounts(1))

watch(() => props.currentCheckoutAmount, (newVal) => {
  const splittedCount = splittedAmounts.value.length
  if (newVal !== undefined)
    setSplitAmounts(splittedCount - 1)
  else
    setSplitAmounts(splittedCount)
})

watch(paidAmount, () => {
  if (props.hasMoneySplit && ordersAccount.value)
    setSplitAmounts(splittedAmounts.value.length)
})

onBeforeUnmount(() => {
  if (checkTimeout)
    clearTimeout(checkTimeout)
})

const getCategoriesByPrinterId = (printerId: string) => {
  if (!props.menu || !props.orderSettings) return []
  return props.orderSettings?.automaticPrintDevices[props.menu!.id!]?.[printerId] ?? []
}

const dropdownItems = ref<DropdownItem[]>([
  {
    text: 'edit',
    icon: 'pencil',
    action: () => emits('update:mode', 'refund')
  },
  {
    text: 'assignToTable',
    icon: 'table-chair',
    action: () => emits('assign')
  }
  // {
  //   text: 'merge',
  //   icon: 'call-merge',
  //   action: () => {

  //   }
  // },
  // {
  //   text: 'split',
  //   icon: 'call-split',
  //   action: () => {

  //   }
  // },
  // {
  //   text: 'addDiscount',
  //   icon: 'brightness-percent',
  //   action: () => {
  //     priceModifier.value = PriceModifierTypeEnum.DISCOUNT_PERCENTAGE
  //     priceModifierVisible.value = true
  //   }
  // },
  // {
  //   text: 'addSurcharge',
  //   icon: 'cart-percent',
  //   action: () => {
  //     priceModifier.value = PriceModifierTypeEnum.SURCHARGE_PERCENTAGE
  //     priceModifierVisible.value = true
  //   }
  // }
])

const switchActiveUnit = () => {
  switch (priceModifier.value) {
    case PriceModifierTypeEnum.DISCOUNT_AMOUNT:
      priceModifier.value = PriceModifierTypeEnum.DISCOUNT_PERCENTAGE
      break
    case PriceModifierTypeEnum.DISCOUNT_PERCENTAGE:
      priceModifier.value = PriceModifierTypeEnum.DISCOUNT_AMOUNT
      break
    case PriceModifierTypeEnum.SURCHARGE_PERCENTAGE:
      priceModifier.value = PriceModifierTypeEnum.SURCHARGE_AMOUNT
      break
    case PriceModifierTypeEnum.SURCHARGE_AMOUNT:
      priceModifier.value = PriceModifierTypeEnum.SURCHARGE_PERCENTAGE
      break
  }
}

const totalPriceModifier = computed(() => {
  switch (priceModifier.value) {
    case PriceModifierTypeEnum.DISCOUNT_AMOUNT:
      return -1 * priceModifierValue.value
    case PriceModifierTypeEnum.SURCHARGE_AMOUNT:
      return priceModifierValue.value
    case PriceModifierTypeEnum.DISCOUNT_PERCENTAGE:
      return -1 * Math.round((totalOrdersAmount.value - paidAmount.value) * priceModifierValue.value) / 100
    case PriceModifierTypeEnum.SURCHARGE_PERCENTAGE:
      return Math.round((totalOrdersAmount.value - paidAmount.value) * priceModifierValue.value) / 100
  }
  return 0
})

const savePriceModifier = async () => {
  try {
    await apiClient.ordersAccountModifier(props.restaurantId, ordersAccount.value!.id, new UpdatePriceModifierRequest({ priceModifierTypeId: priceModifier.value!, value: priceModifierValue.value }))
    priceModifierVisible.value = false
  } catch (error) {

  }
}
</script>

<template>
  <Modal
    :title="[PriceModifierTypeEnum.SURCHARGE_AMOUNT, PriceModifierTypeEnum.SURCHARGE_PERCENTAGE].includes(priceModifier) ? 'surcharge' : 'discount'"
    :size="ModalSize.Medium" v-if="priceModifierVisible && priceModifier" @close="priceModifierVisible = false"
    :action-buttons="[{ text: 'delete', iconName: 'delete', colorClass: 'danger', action: () => { priceModifier = undefined; priceModifierVisible = false; priceModifierValue = 0; savePriceModifier() } }]">
    <template v-slot:content>
      <div class="flex flex-col">
        <div class="flex flex-col gap-2 uppercase font-bold">
          <NumericKeypad :unit-selector="[numberFormatter.currencySymbol, '%']" @update:active-unit="switchActiveUnit()"
            :active-unit="[PriceModifierTypeEnum.SURCHARGE_AMOUNT, PriceModifierTypeEnum.DISCOUNT_AMOUNT].includes(priceModifier) ? numberFormatter.currencySymbol : '%'"
            :label="$tc(`PriceModifierEnum.${PriceModifierTypeEnum[priceModifier]}`)" :allow-decimals="true"
            v-model="priceModifierValue"
            :confirm-disabled="priceModifierValue === 0 || (priceModifier === PriceModifierTypeEnum.DISCOUNT_AMOUNT && priceModifierValue > totalOrdersAmount)"
            @clear="priceModifierValue = 0" @confirm="savePriceModifier">
          </NumericKeypad>
        </div>
      </div>
    </template>
  </Modal>
  <Modal :size="ModalSize.Medium" @close="selectedSplitAmountIdx = null" v-if="selectedSplitAmountIdx !== null">
    <template v-slot:content>
      <NumericKeypad :max-value="totalAmount"
        @confirm="splittedAmounts[selectedSplitAmountIdx!] = $event; recalculateSplit()">
      </NumericKeypad>
    </template>
  </Modal>
  <div class="flex gap-2 flex-col w-full" v-if="orders.length">
    <div class="card flex flex-col gap-1 max-w-full relative mx-3">
      <div class="flex items-center justify-between w-full">
        <div v-if="mainOrder.ordersAccountId && removedAtMap && removedAtMap[mainOrder.ordersAccountId]"
          class="border-green-500 border-t-2 border-radius-default h-1 absolute top-0 left-0 transition-all"
          :style="{ 'width': `${removedAtMap[mainOrder.ordersAccountId].percentageCompleted}%` }"></div>
        <div class="flex items-center">
          <OrderCardLabels :removed-at-map="removedAtMap" :order="mainOrder" :paid-amount="paidAmount"
            :total-amount="totalAmount" :tables-map="tablesMap"></OrderCardLabels>
        </div>
        <div class="flex flex-col">
          <div class="flex flex-nowrap gap-1 text-center justify-end items-center font-semibold text-base md:text-lg">
            <span class="hidden md:block"
              v-if="['recap', 'refund'].includes(mode) || (mode === 'settle' && !hasMoneySplit)">{{
                $tc('totalSelected')
              }}</span>
            <span v-else class="hidden md:block">{{ $tc('total') }}</span>
            <template v-if="!['refund', 'edit', 'recap'].includes(mode) && mainOrder.ordersAccountId">
              <template v-if="mode !== 'settle' || hasMoneySplit">
                <span class="text-gray-body font-medium">
                  {{ numberFormatter.currency(paidAmount) }}
                </span>
                <span class="text-gray-body font-medium">/</span>
                <span class="text-red-pnp">{{ numberFormatter.currency(totalAmount) }}</span>
              </template>
              <template v-else>
                <span class="text-gray-body font-medium">
                  {{ numberFormatter.currency(updatedAmount) }}
                </span>
                <span class="text-gray-body font-medium">/</span>
                <span class="text-red-pnp">{{ numberFormatter.currency(totalAmount - paidAmount) }}</span>
              </template>
            </template>
            <span v-else-if="['view', 'edit', 'refund', 'recap'].includes(mode)" class="text-red-pnp">
              {{ numberFormatter.currency(updatedAmount) }}
            </span>
          </div>
        </div>
      </div>
      <div
        class="flex justify-between max-w-full overflow-x-auto overflow-y-hidden whitespace-nowrap gap-2 pt-1 border-t border-gray-200"
        v-if="ordersAccount">
        <div class="flex items-center justify-center gap-2">
          <template v-if="!isHistoryMode">
            <Dropdown :items="dropdownItems" v-if="ordersAccount && mode === 'view'">
              <button class="btn-action gray">
                <span class="mdi mdi-dots-vertical"></span>
              </button>
            </Dropdown>
            <button class="btn-action indigo" v-if="mode === 'view' && defaultPrinter"
              @click="printOrdersAccount(ordersAccount!.id!, { printer: defaultPrinter!, categoriesId: [] })">
              <span class="mdi mdi-printer"></span>
            </button>
            <button class="btn-action gray" v-if="mode === 'refund'"
              @click="emits('update:mode', 'view'); $emit('update:selectedItems', [])" :disabled="loadingState != null">
              <span class="mdi mdi-cancel mr-1 text-lg"></span>
              <span class="uppercase">{{ $tc('cancel') }}</span>
            </button>
            <button class="btn-action lime px-3" v-if="mode === 'view' && !!ordersAccount.table?.id"
              @click="emits('showModal:sessions', ordersAccount!.id!)">
              <span class="mdi mdi-account-multiple"></span>
            </button>
          </template>
          <div v-if="mode === 'settle' && !removedAtMap[mainOrder.ordersAccountId!] && orderedOrders.length">
            <button @click="emits('update:hasMoneySplit', true)" class="btn-action blue" v-if="!hasMoneySplit">
              <span class="mdi mdi-call-split"></span>
              <span class="uppercase hidden md:block">{{
                $tc('splitByAmount')
              }}</span>
            </button>
            <button @click="emits('update:hasMoneySplit', false)" class="btn-action blue"
              v-if="!ordersAccount.hasMoneySplit && hasMoneySplit">
              <span class="mdi mdi-format-list-bulleted-type"></span>
              <span class="uppercase hidden md:block">{{
                $tc('splitByProduct')
              }}</span>
            </button>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <template v-if="mode === 'refund'">
            <!-- <button class="btn-action light-teal font-bold uppercase"
                                                                                                                                                                                                      @click="priceModifier = PriceModifierTypeEnum.DISCOUNT_PERCENTAGE; priceModifierVisible = true">
                                                                                                                                                                                                      <span class="mdi mdi-brightness-percent"></span>
                                                                                                                                                                                                      <span>{{ $tc('discount') }}</span>
                                                                                                                                                                                                    </button>
                                                                                                                                                                                                    <button class="btn-action orange font-bold uppercase"
                                                                                                                                                                                                      @click="priceModifier = PriceModifierTypeEnum.SURCHARGE_PERCENTAGE; priceModifierVisible = true">
                                                                                                                                                                                                      <span class="mdi mdi-cart-percent"></span>
                                                                                                                                                                                                      <span>{{ $tc('surcharge') }}</span>
                                                                                                                                                                                                    </button> -->
            <LoadingButton @click="removeFromOrders" class="btn-action yellow"
              :is-loading="loadingState == OrderStatusEnum.ProcessingPayment" :is-disabled="loadingState != null">
              <span class="mdi mdi-delete-outline mr-1 text-lg"></span>
              <span class="uppercase">{{ $tc('remove') }}</span>
            </LoadingButton>
          </template>
          <template v-if="mode === 'receipts'">
            <button class="btn-action gray" @click="emits('update:mode', 'view')" :disabled="loadingState != null">
              <span class="mdi mdi-cancel mr-1 text-lg"></span>
              <span class="uppercase">{{ $tc('cancel') }}</span>
            </button>
          </template>
          <template v-if="!['recap', 'settle', 'refund', 'receipts'].includes(mode)">
            <PrintersDropdown
              @print="printOrdersAccount(ordersAccount!.id!, { printer: $event, categoriesId: getCategoriesByPrinterId($event.id) })"
              :printers="printers" v-if="orderedOrders.length > 0"></PrintersDropdown>
            <button @click="emits('update:mode', 'receipts')" :disabled="mode !== 'view'" v-if="paidAmount > 0"
              class="btn-action light-teal">
              <span class="mdi mdi-cash-multiple"></span>
              <span class="uppercase hidden md:block">{{ $tc('receipts') }}</span>
            </button>
            <template v-if="!isHistoryMode">
              <button v-if="paidItems.length < totalOrderItemsCount"
                :disabled="mode !== 'view' || !!removedAtMap[mainOrder.ordersAccountId!]"
                @click.stop="$emit('add:order', ordersAccount!.id!)" class="btn-action orange">
                <span class="mdi mdi-plus "></span>
                <span class="uppercase hidden md:block">{{ $tc('add') }}</span>
              </button>
              <button v-if="paidItems.length < totalOrderItemsCount" :disabled="mode !== 'view' || payableAmount === 0"
                @click.stop="$emit('settle', ordersAccount!.id!)" class="btn-action cyan">
                <span class="mdi mdi-cash-check"></span>
                <span class="uppercase hidden md:block">{{ $tc('checkout') }}</span>
              </button>
            </template>
          </template>
          <template
            v-if="['settle', 'recap'].includes(mode) && !removedAtMap[mainOrder.ordersAccountId!] && orderedOrders.length">
            <template v-if="mode === 'settle'">
              <button @click="$emit('update:selectedItems', []); $emit('cancel')" class="btn-action gray">
                <span class="mdi mdi-cancel "></span>
                <span class="uppercase">{{ $tc('cancel') }}</span>
              </button>
              <template v-if="!hasMoneySplit">
                <button class="btn-action success md:hidden" :disabled="selectedItems.length === 0"
                  @click="$emit('update:checkoutMode', true)">
                  <span class="mdi mdi-check "></span>
                  <span class="uppercase">{{ $tc('confirm') }}</span>
                </button>
                <button @click="toggleAll" class="btn-action blue">
                  <span class="mdi"
                    :class="{ 'mdi-select-all': selectedItems.length !== payableItems.length, 'mdi-select-remove': selectedItems.length === payableItems.length }"></span>
                  <span class="uppercase hidden md:block" v-if="selectedItems.length === payableItems.length">{{
                    $tc('deselectAll')
                  }}</span>
                  <span class="uppercase hidden md:block" v-else>{{ $tc('selectAll') }}</span>
                </button>
              </template>
              <template v-else>
                <div
                  class="flex gap-2 border pl-2 border-blue-500 rounded shadow-default text-blue-600 text-sm font-medium items-center justify-center">
                  <span class="mdi mdi-call-split"></span>
                  <span class="uppercase hidden md:block">{{
                    $tc('split')
                  }}</span>
                  <div class="border-l border-blue-500 h-full flex items-center">
                    <button :disabled="payableAmount === 0 || splittedAmounts.length <= 1"
                      @click="setSplitAmounts(splittedAmounts.length - 1)"
                      class="bg-blue-50 disabled:bg-gray-50 p-2 px-3 rounded-l -my-2">
                      <span class="mdi mdi-minus"></span>
                    </button>
                    <button :disabled="payableAmount === 0 || splittedAmounts.length === 0"
                      @click="setSplitAmounts(splittedAmounts.length + 1)"
                      class="bg-blue-50 disabled:bg-gray-50 rounded-r p-2 px-3 -my-2 border-l border-blue-500">
                      <span class="mdi mdi-plus"></span>
                    </button>
                  </div>
                </div>

              </template>
            </template>
            <LoadingButton v-if="mode === 'recap'" @click="emits('update:mode', 'settle')" class="btn-action gray"
              :is-disabled="loadingState !== null">
              <span class="mdi mdi-cancel"></span>
              <span class="uppercase">{{ $tc('cancel') }}</span>
            </LoadingButton>
          </template>
        </div>
      </div>
      <div class="flex-1" v-if="mode === 'recap' && (ordersAccount?.sessions?.length ?? 0) > 1"
        @click="$event.stopPropagation()">
        <div class="py-2"><span>{{ $tc('selectTheRecipient') }}</span></div>
        <ul class="border rounded-default">
          <li class="cursor-pointer p-3" :class="{
            'bg-gradient text-white': selectedSessionId === session.key,
            'rounded-t': idx === 0,
            'rounded-b': idx === ordersAccount!.sessions!.length - 1,
            'border-b': ordersAccount!.sessions!.length > 1 && idx < ordersAccount!.sessions!.length
          }" v-for="(session, idx) of ordersAccount!.sessions!" :key="session.key"
            @click="emits('update:selectedSessionId', session.key)">
            <span>{{ session.value }}</span>
          </li>
        </ul>
      </div>
    </div>
    <div class="card flex flex-col py-1 mx-3 cursor-pointer" v-if="priceModifier" @click="priceModifierVisible = true">
      <div class="flex justify-between my-1 text-lg" :class="{
        'text-teal-400': [PriceModifierTypeEnum.DISCOUNT_AMOUNT, PriceModifierTypeEnum.DISCOUNT_PERCENTAGE].includes(priceModifier),
        'text-orange-500': [PriceModifierTypeEnum.SURCHARGE_AMOUNT, PriceModifierTypeEnum.SURCHARGE_PERCENTAGE].includes(priceModifier)
      }">
        <div class="flex items-center gap-1">
          <span class="font-semibold">
            <template
              v-if="[PriceModifierTypeEnum.SURCHARGE_AMOUNT, PriceModifierTypeEnum.SURCHARGE_PERCENTAGE].includes(priceModifier)">
              <span>{{ $tc('surcharge') }}</span>
            </template>
            <template v-else>
              <span>{{ $tc('discount') }}</span>
            </template>
          </span>
          <span class="font-bold"
            v-if="[PriceModifierTypeEnum.DISCOUNT_PERCENTAGE, PriceModifierTypeEnum.SURCHARGE_PERCENTAGE].includes(priceModifier)">
            {{ priceModifierValue }}%
          </span>
          <span class="mdi mdi-pencil"></span>
        </div>
        <div>
          <span class="font-semibold">{{ numberFormatter.currency(totalPriceModifier) }}</span>
        </div>
      </div>
    </div>
    <ScrollableDiv v-if="(mode !== 'settle' || !hasMoneySplit) && mode !== 'receipts'"
      class="overflow-y-auto overflow-x-hidden pb-4"
      :height="pageContentHeight - (isHistoryMode ? 180 : 146) - (priceModifier ? 50 : 0)"
      :scroll-class="{ true: 'pl-3 pr-2', false: 'px-3' }">
      <div class="flex flex-col gap-2">
        <template v-for="order of orderedOrders" :key="order.id">
          <OrderCard :is-history-mode="isHistoryMode" :printers="printers" :has-money-split="ordersAccount?.hasMoneySplit"
            :categories-filter="orderSettings?.categoryFilters ?? []" :removed-at-map="removedAtMap"
            :categories-map="categoriesMap" :language-code="languageCode" :paid-order-items="paidItems"
            :menu-items-map="menuItemsMap" :loading-state="loadingState" :selected-items="selectedItems"
            :selected-attribute-items="selectedAttributeItems"
            :menu-item-attribute-groups-map="menuItemAttributeGroupsMap"
            :mode="selectedOrderIdForMode === order.id || (ordersAccount && (mode === 'settle' || mode === 'recap' || mode === 'refund')) ? mode : 'view'"
            :menu-item-attributes-map="menuItemAttributesMap" :order="order" @toggle:selected-item="toggleItem"
            @toggle:selected-attribute-item="toggleAttribute" @update:orderStatus="updateOrderStatus"
            @toggle:mode="toggleMode" @refund="removeFromOrders" />
        </template>
      </div>
    </ScrollableDiv>
    <ScrollableDiv v-else-if="ordersAccount" class="flex flex-col gap-2"
      :height="pageContentHeight - (isHistoryMode ? 180 : 165)" :scroll-class="{ true: 'pl-3 pr-2', false: 'px-3' }">
      <Collapse :is-open="mode === 'receipts'" title="receipts" class="shadow-default" :is-first="true" :is-last="true">
        <OrdersAccountReceipts :orders-account="ordersAccount!" :orders-map="ordersMap" :restaurant-id="restaurantId"
          @selected="$emit('showModal:receipt', $event.id!)">
        </OrdersAccountReceipts>
      </Collapse>
      <template v-if="hasMoneySplit && !isHistoryMode && mode !== 'receipts'">
        <div class="card flex justify-between items-center" v-for="(amount, idx) of splittedAmounts" :key="idx">
          <span class="font-semibold">{{ numberFormatter.currency(splittedAmounts[idx]) }}</span>
          <div class="flex gap-2">
            <button class="btn-action light-teal px-3" @click="selectedSplitAmountIdx = idx">
              <span class="mdi mdi-pencil"></span>
            </button>
            <button class="btn btn-action success" @click="$emit('update:currentCheckoutAmount', splittedAmounts[idx])">
              {{ $tc('checkout') }}
            </button>
          </div>
        </div>
      </template>
    </ScrollableDiv>
  </div>
</template>
