<script setup lang="ts">
import { computed, onMounted, PropType, Ref, ref, watch } from 'vue'
import { apiClient } from '../../services/api'
import { CreateManualTransactionRequest, IOrdersAccountViewModel, MenuAttributeItemViewModel, MenuItemViewModel, MenuViewModel, OrderItemViewModel, OrderStatusEnum, OrderTypeEnum, OrderViewModel, PaymentProviderEnum, PriceModifierTypeEnum, PrinterViewModel, ReceiptViewModel, TableGroupViewModel } from '../../services/api.client'
import { enumToArray, pageContentHeight } from '../../services/utils'
import { numberFormatter } from '../../services/number.formatter'
import { notifier } from '../../services/notification'
import NumericKeypad from './NumericKeypad.vue'
import LoadingButton from '../ui/LoadingButton.vue'
import Dropdown from '../ui/Dropdown.vue'
import { DropdownItem, ModalSize } from '../ui/types'
import Modal from '../ui/Modal.vue'
import { store } from '../../services/store'
import { openCashbox, printOrder, printReceipt } from '../../services/printer'
import ScrollableDiv from '../ui/ScrollableDiv.vue'
import { OrdersSettings } from './orders-settings'
import { i18nInstance } from '../../services/i18n'
import Datepicker from '@vuepic/vue-datepicker'

const emits = defineEmits([
  'close',
  'clear:order',
  'created:order',
  'save:orderItem',
  'delete:orderItem',
  'isAddingItem',
  'update:order',
  'update:currentCheckoutAmount',
  'update:selectedOrdersAccountId',
  'update:selectedOrderItem',
  'update:currentReceipt',
  'update:filterItems'
])

const props = defineProps({
  ordersAccountsMap: {
    type: Object as PropType<{ [ordersAccountId: string]: IOrdersAccountViewModel }>,
    required: true
  },
  ordersMap: {
    type: Object as PropType<{ [orderId: string]: OrderViewModel }>,
    required: true
  },
  currentCheckoutAmount: Number as PropType<number | undefined>,
  languageCode: {
    type: String,
    required: true
  },
  tableGroups: {
    type: Array as PropType<TableGroupViewModel[]>,
    required: true
  },
  currentReceipt: ReceiptViewModel,
  selectedOrdersAccountId: String,
  tablesMap: {
    type: Object as PropType<{ [tableId: string]: { tableGroupName: string, tableNumber: string } }>,
    required: true
  },
  restaurantId: {
    type: String,
    required: true
  },
  menuId: String,
  orderSettings: {
    type: Object as PropType<OrdersSettings>,
    required: true
  },
  menuItemsMap: {
    type: Object as PropType<{ [menuItemId: string]: MenuItemViewModel }>,
    required: true
  },
  menuItemAttributesMap: {
    type: Object as PropType<{ [menuAttributeId: string]: MenuAttributeItemViewModel }>,
    required: true
  },
  printers: {
    type: Array as PropType<PrinterViewModel[]>,
    required: true
  },
  order: Object as PropType<OrderViewModel>,
  selectedOrderItem: Object as PropType<OrderItemViewModel>,
  filterItems: {
    type: Array as PropType<string[]>,
    required: true
  },
  isSelectorMode: {
    type: Boolean,
    required: true
  },
  hasMoneySplit: {
    type: Boolean,
    required: true
  }
})

watch(() => props.selectedOrdersAccountId, () => ordersAccountLocal.value = props.selectedOrdersAccountId ? props.ordersAccountsMap[props.selectedOrdersAccountId!] ?? (ordersAccountLocal.value?.id === props.selectedOrdersAccountId ? ordersAccountLocal.value : undefined) : undefined)
watch(() => props.ordersAccountsMap, () => {
  if (props.selectedOrdersAccountId && props.ordersAccountsMap[props.selectedOrdersAccountId])
    ordersAccountLocal.value = props.ordersAccountsMap[props.selectedOrdersAccountId]
})

const timeScheduleSelectorVisible = ref(false)
const editOrderItemId = ref<string | undefined>()
const cashSelectorVisible = ref(false)
const currentKeypadValue = ref(0)
const orderTypes = ref([OrderTypeEnum.Cashier, OrderTypeEnum.Table, OrderTypeEnum.TakeAway]) // ref(enumToArray<keyof typeof OrderTypeEnum>(OrderTypeEnum).map(v => OrderTypeEnum[v as any] as any))
const isLoading = ref(false)
const currentTableValue: Ref<number | undefined> = ref(undefined)
const orderTypeSelectorVisible = ref(false)
const tableSelectorVisible = ref(false)
const selectedTableGroupId = ref('')
const ordersAccountLocal = ref<IOrdersAccountViewModel | undefined>(props.selectedOrdersAccountId ? props.ordersAccountsMap[props.selectedOrdersAccountId!] : undefined)
const filteredTables = computed(() => (props.tableGroups?.find(g => g.id === selectedTableGroupId.value)?.tables ?? [])
  .filter(t => currentTableValue.value === undefined || isNaN(currentTableValue.value!) || t.number.toString().indexOf(currentTableValue.value!.toString()) > -1))

const ordersAccountsItems = computed(() => ordersAccountLocal.value
  ?.orders
  ?.map(o => props.ordersMap[o.id!])
  ?.filter(o => o.statusId !== OrderStatusEnum.Rejected)
  ?.flatMap(o => o.items)
  ?.filter(o => !o.isRefunded && !o.isRemoved) ?? [])
const paidItems = computed(() => ordersAccountLocal.value?.receipts?.flatMap(t => t.orderItems) ?? [])
const payableItems = computed(() => ordersAccountsItems.value.filter(i => !paidItems.value.includes(i.id!)))
const paidAmount = computed(() => ordersAccountLocal.value?.receipts?.reduce((total, t) => total + t.amount, 0) ?? 0)
const payableAmount = computed(() => totalAmount.value - paidAmount.value)
const orderItems = computed(() => {
  if (props.isSelectorMode && props.order)
    return props.order.items
  else if (ordersAccountLocal.value)
    return payableItems.value.filter(i => props.filterItems.includes(i.id!))
  return []
})

const insertOrder = async () => {
  try {
    const order = props.order!
    if (order.ordersAccountId && !props.ordersAccountsMap[order.ordersAccountId])
      order.ordersAccountId = undefined
    isLoading.value = true
    if ([OrderTypeEnum.TakeAway, OrderTypeEnum.Delivery].includes(props.order?.orderTypeId ?? OrderTypeEnum.Unset) && !!currentScheduleTime.value) {
      order.scheduledAt = new Date()
      order.scheduledAt.setHours(currentScheduleTime.value!.hours, currentScheduleTime.value!.minutes)
      if (order.scheduledAt < new Date())
        order.scheduledAt.setDate(order.scheduledAt.getDate() + 1)
    }

    const response = await apiClient.order(props.restaurantId, order)
    notifier.notifySuccess('created', 'order')
    currentScheduleTime.value = undefined
    ordersAccountLocal.value = response.ordersAccount
    if (props.orderSettings?.automaticPrintDevices?.[props.menuId ?? '']) {
      const printersSettings = props.printers
        .filter(p => props.orderSettings!.automaticPrintDevices[props.menuId!][p.id!]?.length > 0)
        .map(p => ({ printer: p, categoriesId: props.orderSettings?.automaticPrintDevices?.[props.menuId!]?.[p.id!] ?? [] }))
      printOrder(response.orderId!, ...printersSettings)
    }
    emits('created:order', ordersAccountLocal.value!.id)
  } catch (error) {
    notifier.notifyError('creating', error, 'order')
  }
  isLoading.value = false
}

const createManualTransaction = async (paymentMethod: PaymentProviderEnum, cashAmount?: number) => {
  if (!ordersAccountLocal.value) return
  isLoading.value = true
  try {
    const response = await apiClient.ordersAccountSettle(props.restaurantId, ordersAccountLocal.value!.id, CreateManualTransactionRequest.fromJS({
      // forSessionId: selectedOrdersAccount!.sessions!.length > 1 ? selectedSessionId.value! : selectedOrdersAccount.sessions!.length > 0 ? selectedOrdersAccount!.sessions![0].key! : undefined,
      orderItems: props.hasMoneySplit ? [] : props.filterItems,
      paymentProviderId: paymentMethod,
      amount: parseFloat((props.hasMoneySplit ? props.currentCheckoutAmount! : totalAmount.value).toFixed(2)),
      cashAmount: paymentMethod === PaymentProviderEnum.Cash ? cashAmount : undefined
    })!)
    ordersAccountLocal.value = response.ordersAccount
    cashSelectorVisible.value = false
    notifier.notifySuccess('payment', 'order')
    if (store.device.value) {
      if (props.orderSettings.printReceiptOnSettle)
        printReceipt(props.restaurantId, store.device.value!.id!, response.receiptId!)
      if (paymentMethod === PaymentProviderEnum.Cash)
        openCashbox(props.restaurantId, store.device.value!.id!)
    }

    emits('update:currentReceipt', response.ordersAccount!.receipts!.find(r => r.id === response.receiptId))
    emits('update:currentCheckoutAmount', undefined)
    emits('update:filterItems', [])

    if (response.amountLeft === 0)
      emits('close')
  } catch (error) {
    notifier.notifyError('updating', error, 'order')
  }
  isLoading.value = false
}

const totalAmount = computed(() => {
  if (props.hasMoneySplit && !props.isSelectorMode)
    return props.currentCheckoutAmount ?? 0
  else
    return orderItems.value!
      .reduce((total, item) => {
        let itemPrice = (item.price +
          item!.attributeGroups!
            .flatMap(g => g.orderItemAttributes)
            .reduce((subTotal, attribute) => subTotal + (attribute!.count ?? 1) * (attribute?.price ?? 0), 0))
        if (item.priceModifierTypeId)
          switch (item.priceModifierTypeId) {
            case PriceModifierTypeEnum.DISCOUNT_AMOUNT:
              itemPrice -= item.priceModifierValue!
              break
            case PriceModifierTypeEnum.DISCOUNT_PERCENTAGE:
              itemPrice -= Math.round(itemPrice * item.priceModifierValue!) / 100
              break
            case PriceModifierTypeEnum.SURCHARGE_AMOUNT:
              itemPrice += item.priceModifierValue!
              break
            case PriceModifierTypeEnum.SURCHARGE_PERCENTAGE:
              itemPrice += Math.round(itemPrice * item.priceModifierValue!) / 100
              break
          }
        return total + item.count * itemPrice
      }, 0)
})

const notes = [5, 10, 20, 50, 100, 200, 500]
const availableAmounts = computed(() => [totalAmount.value, ...notes.filter(amount => amount > totalAmount.value).slice(0, 3)])

onMounted(() => {
  if ((props.tableGroups?.length ?? 0) > 0)
    selectedTableGroupId.value = props.tableGroups![0].id!
})

const keypadBackspace = () => { }
const keypadClicked = (key: number) => { }
const keypadClear = () => { }

const currentKeypadLabel = computed(() => { return undefined })

const orderItemSelected = (item: OrderItemViewModel) => {
  if (props.isSelectorMode) {
    if (item.menuItemId)
      emits('update:selectedOrderItem', item)
    else {
      editOrderItemId.value = item.id
      currentKeypadValue.value = item.price
      newItemName.value = item.itemName!
    }
  }
}

const isOrderValid = computed(() => {
  if ((orderItems.value?.length ?? 0) === 0)
    return false
  switch (props.order?.orderTypeId) {
    case OrderTypeEnum.Table:
      return !!props.order.tableId
    case OrderTypeEnum.Cashier:
      return true
  }
  return true
})

const dropdownItems = ref<DropdownItem[]>([
  {
    text: 'openDrawer',
    icon: 'cash-register',
    action: () => openCashbox(props.restaurantId, store.device.value!.id!),
    isVisible: () => !!store.device.value
  },
  {
    text: 'newOrderItem',
    icon: 'plus',
    action: () => cashSelectorVisible.value = true,
    isVisible: () => props.isSelectorMode
  },
  {
    text: 'clear',
    icon: 'delete',
    action: () => {
      emits('clear:order')
      currentScheduleTime.value = undefined
    }
  }
])

const keypadConfirm = (value: number) => {
  if (props.isSelectorMode) {
    emits('save:orderItem', OrderItemViewModel.fromJS({
      id: editOrderItemId.value ?? `#${Math.random()}`,
      itemName: newItemName.value ?? i18nInstance.global.t('various'),
      count: 1,
      price: value,
      attributeGroups: []
    }))
    cashSelectorVisible.value = false
    editOrderItemId.value = undefined
    newItemName.value = i18nInstance.global.t('various')
  } else
    createManualTransaction(PaymentProviderEnum.Cash, value)
  currentKeypadValue.value = 0
}

const deleteOrderItem = () => {
  emits('delete:orderItem', editOrderItemId.value)
  editOrderItemId.value = undefined
}

const newItemName = ref(i18nInstance.global.t('various'))
const currentScheduleTime = ref<{ hours: number; minutes: number; } | undefined>()
const getTotalItemPriceModifier = (item: OrderItemViewModel) => {
  if ([PriceModifierTypeEnum.DISCOUNT_AMOUNT, PriceModifierTypeEnum.SURCHARGE_AMOUNT].includes(item.priceModifierTypeId!))
    return item.priceModifierValue!
  const totalItemPrice = item.count * (item.price + (item.attributeGroups?.flatMap(g => g.orderItemAttributes).reduce((total, a) => total + (a?.price ?? 0) * (a?.count ?? 1), 0) ?? 0))
  return totalItemPrice / 100 * item.priceModifierValue!
}

const scheduleTime = computed(() => `${currentScheduleTime.value!.hours.toString().padStart(2, '0')}:${currentScheduleTime.value!.minutes.toString().padStart(2, '0')}`)
</script>
<template>
  <div class="flex w-full">
    <Modal :size="ModalSize.Small" title="scheduledAt" v-if="timeScheduleSelectorVisible"
      @close="timeScheduleSelectorVisible = false"
      :action-buttons="[{ text: 'confirm', iconName: 'content-save', colorClass: 'success', action: () => timeScheduleSelectorVisible = false }, { text: 'clear', iconName: 'delete', colorClass: 'danger', action: () => { timeScheduleSelectorVisible = false; currentScheduleTime = undefined } }]">
      <template v-slot:content>
        <div class="flex justify-center items-center">
          <Datepicker time-picker inline auto-apply v-model="currentScheduleTime"></Datepicker>
        </div>
      </template>
    </Modal>
    <Modal :size="ModalSize.Medium" v-if="cashSelectorVisible || editOrderItemId"
      @close="cashSelectorVisible = false; editOrderItemId = undefined"
      :action-buttons="editOrderItemId ? [{ text: 'delete', iconName: 'delete', colorClass: 'danger', action: () => deleteOrderItem() }] : []">
      <template v-slot:content>
        <div class="flex flex-col">
          <div class="flex flex-col py-1 mt-1" v-if="!isSelectorMode">
            <div class="flex justify-between my-1 text-xl">
              <span class="font-medium">{{ $tc('change') }}</span>&nbsp;
              <span class="font-bold text-gray-body">{{
                numberFormatter.currency(currentKeypadValue - totalAmount)
              }}</span>
            </div>
            <div class="flex justify-between my-1 text-2xl">
              <span class="font-semibold">{{ $tc('total') }}</span>&nbsp;
              <span class="font-bold text-red-pnp">{{ numberFormatter.currency(totalAmount) }}</span>
            </div>
          </div>
          <div v-else>
            <div class="flex items-center justify-center">
              <span class="font-medium text-center text-gray-body">{{ $tc('name') }}</span>
            </div>
            <div class="card relative flex items-center gap-1 my-2">
              <input v-model="newItemName" type="text" class="outline-none font-semibold w-full"
                :placeholder="$tc('name')" />
              <div class="absolute right-2 my-auto top-0 bottom-0 flex items-center justify-center" v-if="newItemName"
                @click="newItemName = ''">
                <span class="mdi mdi-close text-primary"></span>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-2 uppercase font-bold">
            <ul class="flex items-center gap-2">
              <li v-for="amount of availableAmounts" :key="amount"
                class="w-1/4 p-1 cursor-pointer flex items-center border border-indigo-500 bg-indigo-50 text-indigo-700 justify-center rounded-default py-2"
                @click="currentKeypadValue = amount">{{
                  amount.toString().indexOf('.') > -1 ? amount.toFixed(2) : amount
                }}</li>
            </ul>
            <NumericKeypad :is-loading="isLoading" :label="currentKeypadLabel" :allow-decimals="true"
              v-model="currentKeypadValue"
              :confirm-disabled="!isSelectorMode && (totalAmount === 0 || currentKeypadValue < totalAmount)"
              @clear="keypadClear" @backspace="keypadBackspace" @clicked="keypadClicked" @confirm="keypadConfirm">
            </NumericKeypad>
          </div>
        </div>
      </template>
    </Modal>
    <div class="flex flex-col pl-2 w-full md:w-[320px] border-gray-300 pr-3 md:pr-2">
      <div class="flex flex-col gap-2 overflow-y-auto" v-if="order" :style="{ maxHeight: `${pageContentHeight - 60}px` }">
        <div class="flex flex-col px-2 p-1 bg-white shadow-default rounded-default cursor-pointer"
          @click="$emit('update:selectedOrdersAccountId', undefined)" v-if="ordersAccountLocal">
          <div class="justify-between items-center flex">
            <div class="flex items-center gap-2">
              <span class="mdi mdi-link-variant"></span>
              <span v-if="isSelectorMode">{{ $tc('attachTo') }}:</span>
              <span v-else>{{ $tc('relatedTo') }}:</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-semibold">#{{
                ordersMap[ordersAccountLocal.lastId!]?.orderNumber
              }}
                <template v-if="ordersAccountLocal.orders!.length > 1">
                  {{ $tc('andMore', { number: ordersAccountLocal.orders!.length - 1 }) }}
                </template>
              </span>
              <span class="mdi mdi-close" v-if="isSelectorMode"></span>
            </div>
          </div>
        </div>
        <div class="flex px-2 flex-col p-1 bg-white shadow-default rounded-default cursor-pointer" v-if="isSelectorMode"
          @click="orderTypeSelectorVisible = !!ordersAccountLocal ? orderTypeSelectorVisible : !orderTypeSelectorVisible">
          <div class="justify-between items-center flex">
            <div class="flex items-center gap-2">
              <span class="mdi mdi-cart-variant"></span>
              <span>{{ $tc('orderType') }}:</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-semibold"> {{ $tc(`OrderTypeEnum.${OrderTypeEnum[order.orderTypeId]}`) }}</span>
              <span v-if="ordersAccountLocal" class="mdi mdi-lock"></span>
              <span v-else
                :class="{ 'mdi-chevron-down': !orderTypeSelectorVisible, 'mdi-chevron-up': orderTypeSelectorVisible }"
                class="mdi"></span>
            </div>
          </div>
          <div class="mt-2" v-if="orderTypeSelectorVisible">
            <ul>
              <template v-for="orderType of orderTypes" :key="orderType">
                <li
                  :class="{ 'text-red-pnp': order.orderTypeId === orderType, 'text-gray-500': order.orderTypeId != orderType }"
                  class="relative cursor-pointer rounded p-2 items-center uppercase text-base font-semibold transition-colors duration-150"
                  @click="order!.orderTypeId = orderType" v-if="orderType > -1">
                  <div class="flex items-center">
                    <label class="form-label row cursor-pointer">
                      <input type="radio" :checked="order.orderTypeId === orderType" :value="orderType" />
                      <span>
                        {{ $tc(`OrderTypeEnum.${OrderTypeEnum[orderType]}`) }}
                      </span>
                    </label>
                  </div>
                </li>
              </template>
            </ul>
          </div>
        </div>

        <div class="bg-white px-2 p-1 shadow-default rounded-default flex flex-col cursor-pointer"
          v-if="order.orderTypeId == OrderTypeEnum.Table && isSelectorMode"
          @click="tableSelectorVisible = !!ordersAccountLocal ? tableSelectorVisible : !tableSelectorVisible">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="mdi mdi-table-chair"></span>
              <span>{{ $tc('table') }}</span>
            </div>
            <div class="flex items-center gap-2 font-semibold">
              <div v-if="order.tableId">
                <span>{{ tablesMap[order.tableId]?.tableGroupName }}</span>&nbsp;|&nbsp;
                <span>{{ tablesMap[order.tableId]?.tableNumber }}</span>
              </div>
              <span v-else>{{ $tc('noTableSelected') }}</span>
              <span v-if="ordersAccountLocal" class="mdi mdi-lock"></span>
              <span v-else :class="{ 'mdi-chevron-down': !tableSelectorVisible, 'mdi-chevron-up': tableSelectorVisible }"
                class="mdi"></span>
            </div>
          </div>
          <div class="w-full mt-3 flex" v-if="tableSelectorVisible">
            <div class="w-1/2 border-r px-2">
              <h2 class="text-gray-heading font-medium">{{ $tc('tableGroup') }}</h2>
              <ul>
                <li v-for="group of tableGroups" :key="group.id"
                  @click="selectedTableGroupId = group.id!; $event.stopPropagation()"
                  class="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                  :class="{ 'text-red-pnp font-bold': selectedTableGroupId === group.id }">
                  {{ group.name }}
                </li>
              </ul>
            </div>
            <div class="w-1/2 pl-2">
              <h2 class="text-gray-heading font-medium">{{ $tc('table') }}</h2>
              <div class="overflow-y-auto">
                <ul>
                  <li v-for="table of filteredTables" :key="table.id" @click="order!.tableId = table.id"
                    class="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                    :class="{ 'text-red-pnp font-bold': order.tableId === table.id, 'text-gray-body': order.tableId != table.id }">
                    {{ table.number }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white px-2 p-1 shadow-default rounded-default flex items-center justify-between cursor-pointer"
          @click="timeScheduleSelectorVisible = true; currentScheduleTime ??= { hours: new Date().getHours(), minutes: new Date().getMinutes() }"
          v-if="[OrderTypeEnum.Delivery, OrderTypeEnum.TakeAway].includes(order.orderTypeId)">
          <div class="flex items-center gap-2">
            <span class="mdi mdi-clock"></span>
            <span>{{ $tc('scheduledAt') }}</span>
          </div>
          <div class="flex items-center gap-2 font-semibold">
            <span v-if="!currentScheduleTime">{{ $tc('notScheduled') }}</span>
            <span v-else>{{ scheduleTime }}</span>
            <span class="mdi mdi-chevron-down"></span>
          </div>
        </div>
      </div>
      <template v-if="!orderTypeSelectorVisible && !tableSelectorVisible">
        <ScrollableDiv class="w-full overflow-y-auto border-gray-300 pt-1 mt-2 border-t"
          :height="(pageContentHeight - (!!ordersAccountLocal ? 40 : 0) - (isSelectorMode ? 250 : 210) - (isSelectorMode && order?.orderTypeId === OrderTypeEnum.Table ? 40 : 0) - (order?.orderTypeId === OrderTypeEnum.TakeAway ? 40 : 0))"
          @click="$emit('update:selectedOrderItem', undefined)">
          <div>
            <div v-if="!hasMoneySplit || isSelectorMode">
              <ul>
                <li v-for="(item, idx) of orderItems" :key="idx"
                  @click="$event.stopPropagation(); orderItemSelected(item)"
                  class="relative shadow-default bg-white cursor-pointer transition-colors duration-150 p-2 pl-3 mb-2 rounded-default">
                  <span v-if="selectedOrderItem?.id === item.id"
                    class="absolute left-0 top-0 h-full bg-gradient w-1 rounded-l"></span>
                  <div class="w-full flex flex-col">
                    <div class="w-full flex justify-end">
                    </div>
                    <div class="flex justify-between items-center">
                      <div class="flex items-center gap-2">
                        <span class="font-bold">x{{ item.count }}</span>
                        <span class="font-semibold"
                          v-if="menuItemsMap[item.menuItemId!]?.languageInfo?.[languageCode]?.name">
                          {{ menuItemsMap[item.menuItemId!]?.languageInfo?.[languageCode]?.name }}
                        </span>
                        <span class="font-semibold" v-else-if="item.itemName">
                          {{ item.itemName }}
                        </span>
                        <span class="font-semibold" v-else>
                          {{ $tc('unnamed') }}
                        </span>
                      </div>
                      <div class="flex items-center gap-4 w-14 justify-end">
                        <span class="font-semibold text-red-pnp">
                          {{ numberFormatter.currency(item.price) }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <ul>
                      <li class="mt-1"
                        v-for="attribute of (item.attributeGroups ?? []).flatMap(g => g.orderItemAttributes)"
                        :key="attribute?.menuAttributeItemId">
                        <div class="flex justify-between items-center gap-2">
                          <div class="flex flex-1 items-center text-gray-body font-medium">
                            <span class="mdi mdi-circle-small text-xl mr-1"></span>
                            <span
                              v-if="menuItemAttributesMap[attribute!.menuAttributeItemId!]?.languageInfo?.[languageCode].name">
                              {{
                                menuItemAttributesMap[attribute!.menuAttributeItemId!]?.languageInfo?.[languageCode].name
                              }}
                            </span>
                            <span v-else-if="attribute?.attributeName">{{
                              attribute.attributeName
                            }}</span>
                            <span v-else>{{ $tc('unnamed') }}</span>
                          </div>
                          <div class="flex items-center gap-4 justify-end">
                            <span class="font-semibold" v-if="!attribute?.isVariant">
                              +{{
                                numberFormatter.currency(attribute!.price)
                              }}
                            </span>
                          </div>
                        </div>
                      </li>
                      <li class="mt-1" v-if="item.priceModifierTypeId">
                        <div class="flex justify-between items-center gap-2" :class="{
                          'text-orange-500': [PriceModifierTypeEnum.SURCHARGE_AMOUNT, PriceModifierTypeEnum.SURCHARGE_PERCENTAGE].includes(item.priceModifierTypeId),
                          'text-teal-500': [PriceModifierTypeEnum.DISCOUNT_AMOUNT, PriceModifierTypeEnum.DISCOUNT_PERCENTAGE].includes(item.priceModifierTypeId)
                        }">
                          <div class="flex flex-1 items-center font-semibold">
                            <span class="mdi mdi-circle-small text-xl mr-1"></span>
                            <span><template
                                v-if="[PriceModifierTypeEnum.SURCHARGE_AMOUNT, PriceModifierTypeEnum.SURCHARGE_PERCENTAGE].includes(item.priceModifierTypeId)">
                                <span>{{ $tc('surcharge') }}</span>
                              </template>
                              <template v-else>
                                <span>{{ $tc('discount') }}</span>
                              </template>&nbsp;
                            </span>
                            <span
                              v-if="[PriceModifierTypeEnum.DISCOUNT_AMOUNT, PriceModifierTypeEnum.SURCHARGE_AMOUNT].includes(item.priceModifierTypeId)">
                              {{ numberFormatter.currency(item.priceModifierValue!) }}
                            </span>
                            <span
                              v-if="[PriceModifierTypeEnum.SURCHARGE_PERCENTAGE, PriceModifierTypeEnum.DISCOUNT_PERCENTAGE].includes(item.priceModifierTypeId)">
                              {{ item.priceModifierValue! }}%
                            </span>
                          </div>
                          <div class="flex items-center gap-4 justify-end">
                            <span class="font-semibold">
                              <span
                                v-if="[PriceModifierTypeEnum.SURCHARGE_AMOUNT, PriceModifierTypeEnum.SURCHARGE_PERCENTAGE].includes(item.priceModifierTypeId)">+</span>
                              <span v-else>-</span>
                              <span>{{ numberFormatter.currency(getTotalItemPriceModifier(item)) }}</span>
                            </span>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <div v-if="item.notes" class="mt-2">
                    <span class="font-semibold">{{ $tc('notes') }}:</span>
                    <span class="font-medium text-gray-body">{{ item.notes }}</span>
                  </div>
                </li>
              </ul>
            </div>
            <div v-else-if="currentCheckoutAmount" class="card flex justify-between">
              <div class="flex items-center justify-center gap-2 cursor-pointer"
                @click="$emit('update:currentCheckoutAmount', undefined)">
                <span class="mdi mdi-delete"></span>
                <span class="font-semibold">{{ $tc('billSplit') }}</span>
              </div>
              <span class="font-semibold text-red-pnp">{{ numberFormatter.currency(currentCheckoutAmount) }}</span>
            </div>
          </div>
        </ScrollableDiv>
        <div class="flex flex-col justify-end h-[150px] w-full">
          <div class="flex flex-col w-full">
            <template v-if="ordersAccountLocal?.priceModifierTypeId">
              <div class="card flex justify-between"
                v-if="[PriceModifierTypeEnum.SURCHARGE_AMOUNT, PriceModifierTypeEnum.SURCHARGE_PERCENTAGE].includes(ordersAccountLocal?.priceModifierTypeId)">
                <span>{{ $tc('surcharge') }}</span>
                <span v-if="ordersAccountLocal?.priceModifierTypeId === PriceModifierTypeEnum.SURCHARGE_AMOUNT">{{
                  numberFormatter.currency(ordersAccountLocal.priceModifierValue!) }}</span>
                <span v-else>{{ ordersAccountLocal.priceModifierValue }}%</span>
              </div>
              <div class="card flex justify-between"
                v-if="[PriceModifierTypeEnum.DISCOUNT_AMOUNT, PriceModifierTypeEnum.DISCOUNT_PERCENTAGE].includes(ordersAccountLocal?.priceModifierTypeId)">
                <span>{{ $tc('discount') }}</span>
                <span v-if="ordersAccountLocal?.priceModifierTypeId === PriceModifierTypeEnum.DISCOUNT_AMOUNT">{{
                  numberFormatter.currency(ordersAccountLocal.priceModifierValue!) }}</span>
                <span v-else>{{ ordersAccountLocal.priceModifierValue }}%</span>
              </div>
            </template>
            <div class="card flex flex-col py-1 mt-1">
              <div class="flex justify-between my-1 text-lg" v-if="cashSelectorVisible">
                <span class="font-semibold">{{ $tc('change') }}</span>
                <span class="font-bold text-gray-body">{{
                  numberFormatter.currency(currentKeypadValue - totalAmount)
                }}</span>
              </div>
              <div class="flex justify-between my-1 text-2xl">
                <span class="font-semibold">{{ $tc('total') }}</span>
                <span class="font-bold text-red-pnp">{{ numberFormatter.currency(totalAmount) }}</span>
              </div>
            </div>
            <div class="flex flex-col gap-2 card p-2 mt-1" v-if="!cashSelectorVisible || isSelectorMode">
              <template v-if="!isSelectorMode">
                <div class="flex flex-col items-center justify-center gap-2">
                  <LoadingButton :disabled="totalAmount === 0" :is-loading="isLoading"
                    class="w-full btn-action p-4 light-teal uppercase font-bold"
                    @click="cashSelectorVisible = true; currentKeypadValue = totalAmount">
                    <span class="mdi mdi-cash text-2xl"></span>
                    <span>{{ $tc('cash') }}</span>
                  </LoadingButton>
                  <LoadingButton :disabled="totalAmount === 0" :is-loading="isLoading"
                    class="w-full btn-action p-4 orange uppercase font-bold"
                    @click="createManualTransaction(PaymentProviderEnum.PhysicalCard)">
                    <span class="mdi mdi-credit-card-outline text-2xl"></span>
                    <span>{{ $tc('cards') }}</span>
                  </LoadingButton>
                </div>
              </template>
              <div class="flex items-center gap-2" v-else>
                <Dropdown :items="dropdownItems" :disabled="isLoading">
                  <button class="text-gray-body btn-action gray h-14">
                    <span class="mdi mdi-dots-vertical text-xl"></span>
                  </button>
                </Dropdown>
                <LoadingButton :is-loading="isLoading" :disabled="!isOrderValid || isLoading"
                  class="w-full btn-action h-14 font-bold uppercase primary-fill" @click="insertOrder">
                  {{ $tc('confirm') }}
                </LoadingButton>
                <button class="btn-action h-14 primary md:hidden" @click="$emit('isAddingItem')">
                  <span class="mdi mdi-plus text-xl"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
