<script lang="ts" setup>
import { computed, PropType, ref, Ref } from 'vue'
import { IMenuAttributeGroupViewModel, IMenuAttributeItemViewModel, IMenuCategoryViewModel, IMenuItemViewModel, IOrderViewModel, IPrinterViewModel, OrderItemAttributeViewModel, OrderItemViewModel, OrderStatusEnum, PriceModifierTypeEnum } from '../../services/api.client'
import { store } from '../../services/store'
import { MAX_MINUTES_TIME_COUNTER } from '../../types'
import { numberFormatter } from '../../services/number.formatter'
import { printOrder } from '../../services/printer'
import LoadingButton from '../ui/LoadingButton.vue'
import Toggle from '../ui/Toggle.vue'
import TimeCounter from './TimeCounter.vue'
import PrintersDropdown from './PrintersDropdown.vue'
import { dateFormatter } from '../../services/date.formatter'

const props = defineProps({
  isHistoryMode: Boolean,
  order: {
    type: Object as PropType<IOrderViewModel>,
    required: true
  },
  hasMoneySplit: Boolean,
  mode: {
    type: String as PropType<'view' | 'settle' | 'refund' | 'recap' | 'edit'>,
    required: true
  },
  categoriesMap: Object as PropType<{ [categoryId: string]: IMenuCategoryViewModel }>,
  menuItemsMap: Object as PropType<{ [menuItemId: string]: IMenuItemViewModel }>,
  menuItemAttributeGroupsMap: Object as PropType<{ [menuAttributeGroupId: string]: IMenuAttributeGroupViewModel }>,
  menuItemAttributesMap: Object as PropType<{ [menuAttributeId: string]: IMenuAttributeItemViewModel }>,
  languageCode: {
    type: String,
    required: true
  },
  printers: {
    type: Array as PropType<IPrinterViewModel[]>,
    required: true
  },
  loadingState: {
    type: Number as PropType<OrderStatusEnum | null>
  },
  categoriesFilter: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  paidOrderItems: {
    type: Array as PropType<string[]>,
    required: true
  },
  selectedItems: {
    type: Array as PropType<string[]>,
    required: true
  },
  selectedAttributeItems: {
    type: Array as PropType<string[]>,
    required: true
  },
  removedAtMap: {
    type: Object as PropType<{ [orderId: string]: { removedAt: Date, percentageCompleted: number } }>,
    default: () => ({})
  }
})
defineEmits([
  'toggle:selectedItem',
  'toggle:selectedAttributeItem',
  'toggle:mode',
  'update:orderStatus',
  'refund'
])
const markSelectedAsInvisible = ref(true)

const orderedItems = (items: OrderItemViewModel[]) => {
  const orderedCategoryItems = Object.values(props.categoriesMap ?? {}).map((category) => category.menuItemIds!)
  if (!props.isHistoryMode)
    items = items.filter(i => !i.isRemoved)
  return items.sort((a, b) => {
    const idxA = orderedCategoryItems.findIndex(items => items.indexOf(a.menuItemId!) > -1)
    const idxB = orderedCategoryItems.findIndex(items => items.indexOf(b.menuItemId!) > -1)
    return idxA - idxB
  })
}

const hasCategoryFilter = (menuItemId: string) => {
  const categories = Object.values(props.categoriesMap ?? {}).filter(c => c.menuItemIds!.indexOf(menuItemId) > -1)
  return categories.some(c => props.categoriesFilter!.indexOf(c.id!) > -1)
}

const diffMinutes = (dt1: Date, dt2?: Date) => {
  if (!dt2) dt2 = new Date()
  return Math.round((dt2.getTime() - dt1.getTime()) / 1000 / 60)
}

const updatedAmount = computed(() => {
  if (props.mode !== 'edit')
    return props.order.amount
  else
    return props.order.items
      .filter(item => !props.selectedItems.includes(item.id!))
      .reduce((total, item) => total +
        item.count * (item.price + item.attributeGroups!
          .flatMap(g => g!.orderItemAttributes!)
          .filter(a => !props.selectedAttributeItems.includes(a.id!))
          .reduce((subTotal, attribute) => subTotal + attribute!.count! * (attribute!.price! ?? 0), 0) ?? 0), 0) ?? 0
})

const getOrderedAttributeGroups = (orderItem: OrderItemViewModel) => {
  const variantGroupIdx = orderItem.attributeGroups?.findIndex(g => !!g.orderItemAttributes?.find(a => a.isVariant)) ?? -1
  const attributeGroups = [...orderItem.attributeGroups!]
  if (variantGroupIdx > -1) {
    const variantGroup = attributeGroups[variantGroupIdx]
    attributeGroups.splice(variantGroupIdx, 1)
    attributeGroups.unshift(variantGroup)
  }
  return attributeGroups
}

const getTotalItemPriceModifier = (item: OrderItemViewModel) => {
  if ([PriceModifierTypeEnum.DISCOUNT_AMOUNT, PriceModifierTypeEnum.SURCHARGE_AMOUNT].includes(item.priceModifierTypeId!))
    return item.priceModifierValue!
  const totalItemPrice = item.count * (item.price + (item.attributeGroups?.flatMap(g => g.orderItemAttributes).reduce((total, a) => total + (a?.price ?? 0) * (a?.count ?? 1), 0) ?? 0))
  return Math.round(totalItemPrice * item.priceModifierValue!) / 100
}
</script>
<template>
  <div class="card w-full pb-0 pt-1 relative">
    <div
      :class="{ 'border-green-500': order.statusId === OrderStatusEnum.Done, 'border-red-500': order.statusId === OrderStatusEnum.Rejected }"
      class=" border-t-2 border-radius-t h-1 absolute top-0 left-0 transition-all"
      :style="{ 'width': `${removedAtMap[order.id!].percentageCompleted}%` }" v-if="removedAtMap[order.id!]">
    </div>
    <div class="relative" v-if="mode !== 'recap'">
      <div v-if="order.statusId === OrderStatusEnum.Sent"
        class="text-xl bg-white absolute shadow-default h-6 w-6 flex items-center justify-center -right-5 -top-3 rounded-full">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
      </div>
      <div class="md:hidden text-sm text-center">
        <TimeCounter v-if="diffMinutes(new Date(order.sentAt)) <= MAX_MINUTES_TIME_COUNTER" class="text-gray-body"
          :model="new Date(order.sentAt)" />
        <span v-else class="text-gray-body">{{ dateFormatter.datetime(order.sentAt, true) }}</span>
      </div>
      <div class="flex items-center justify-between" :class="{ 'cursor-pointer': mode === 'view' }">
        <div class="w-1/3 flex items-center">
          <span class="font-semibold text-gray-800 text-sm md:text-base">{{ $tc('orderNumber', {
            orderNumber:
              order.orderNumber
          })
          }}</span>
          <div v-if="order.statusId === OrderStatusEnum.Sent"
            class="bg-indigo-500 text-xs rounded-default ml-2 text-white p-1 font-medium text-center">
            {{ $tc('new') }}</div>
          <div v-else class=" text-xs rounded-default ml-2 text-white p-1 font-medium text-center" :class="{
            'bg-red-500': order.statusId === OrderStatusEnum.Rejected,
            'bg-yellow-400': order.statusId === OrderStatusEnum.Accepted,
            'bg-green-500': [OrderStatusEnum.Ready, OrderStatusEnum.Done].indexOf(order.statusId) > -1,
          }">{{
  $tc(OrderStatusEnum[order.statusId].toLowerCase())
}}
          </div>
        </div>
        <div class="md:flex flex-col cursor-pointer w-1/3 items-center hidden">
          <div class="text-sm">
            <TimeCounter v-if="diffMinutes(new Date(order.sentAt)) <= MAX_MINUTES_TIME_COUNTER" class="text-gray-body"
              :model="new Date(order.sentAt)" />
            <span v-else class="text-gray-body">{{ dateFormatter.datetime(order.sentAt, true) }}</span>
          </div>
        </div>
        <div class="w-1/3 flex justify-end">
          <div class="flex flex-col text-right">
            <span class="text-gray-body text-sm">x{{ order.items.length }}&nbsp;{{ $tc('items') }}</span>
            <span class="text-black font-semibold text-lg">{{
              numberFormatter.currency(updatedAmount)
            }}</span>
          </div>
        </div>
      </div>

    </div>

    <div>
      <div class="border-gray-100 border-t flex flex-col mt-1">
        <div>
          <template v-for="(orderItem, orderItemIdx) of orderedItems(order.items)" :key="orderItem.id">
            <div
              v-if="(mode !== 'recap' || selectedItems?.includes(orderItem.id!)) && ((categoriesFilter?.length ?? 0) === 0 || hasCategoryFilter(orderItem.menuItemId!))"
              class="flex flex-col my-1">
              <div class="flex justify-between"
                :class="{ 'line-through': !hasMoneySplit && ((!isHistoryMode && paidOrderItems?.includes(orderItem.id!)) || (selectedItems?.includes(orderItem.id!) && mode !== 'recap') || orderItem.isRefunded || orderItem.isRemoved), 'decoration-red-500': orderItem.isRefunded || orderItem.isRemoved }">
                <div class="flex items-center">
                  <div class="mr-4">
                    <label @click="$event.stopPropagation()"
                      class="form-label layout-only row flex flex-row cursor-pointer">
                      <span class="mdi mdi-credit-card-refund text-2xl" v-if="orderItem.isRefunded"></span>
                      <span class="mdi mdi-cash-check text-2xl"
                        v-else-if="paidOrderItems?.includes(orderItem.id!) && mode !== 'refund'"></span>
                      <input
                        v-else-if="mode === 'edit' || (mode === 'settle' && !paidOrderItems?.includes(orderItem.id!)) || (mode === 'refund' && !orderItem.isRefunded)"
                        type="checkbox" :checked="selectedItems?.includes(orderItem.id!)"
                        class="form-checkbox mr-1 -mt-0.5" @change="$emit('toggle:selectedItem', orderItem.id!)" />
                      <span class="mdi mdi-circle-small text-2xl" v-else></span>
                      <span class="font-semibold text-md">x{{ orderItem.count }}</span>
                      <span :class="{ 'cursor-pointer': mode !== 'view' }" class="font-medium black ml-1">
                        <template v-if="menuItemsMap?.[orderItem.menuItemId!]?.languageInfo?.[languageCode]?.name">
                          {{ menuItemsMap[orderItem.menuItemId!]?.languageInfo?.[languageCode]?.name }}
                        </template>
                        <template v-else>
                          {{ orderItem.itemName }}
                        </template>
                      </span>
                    </label>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <div @click.prevent.stop :class="{ 'cursor-pointer': mode !== 'view' }"
                    class="font-medium text-gray-body text-sm">
                    <span>{{ numberFormatter.currency(orderItem.price) }}</span>
                  </div>
                </div>
              </div>
              <div class="flex flex-col ml-8" v-for="orderItemGroup of getOrderedAttributeGroups(orderItem)"
                :key="orderItemGroup.id">
                <span v-if="menuItemAttributeGroupsMap?.[orderItemGroup.id!]?.languageInfo?.[languageCode]"
                  class="text-gray-heading text-sm">{{
                    menuItemAttributeGroupsMap[orderItemGroup.id!]?.languageInfo?.[languageCode].name
                  }}:</span>
                <div class="flex flex-col">
                  <div v-for="attributeItem of orderItemGroup.orderItemAttributes" class="flex"
                    :class="{ 'line-through': !hasMoneySplit && (selectedAttributeItems?.includes(attributeItem.id!) || (selectedItems.includes(orderItem.id!) && (mode === 'edit' || mode === 'refund')) || (!isHistoryMode && paidOrderItems?.includes(orderItem.id!)) || attributeItem.isRefunded) }"
                    :key="attributeItem.id">
                    <div class="w-2/3 text-md text-gray-body font-medium flex items-center">
                      <label class="form-label row cursor-pointer"
                        :class="{ 'my-2': (mode === 'refund' && !attributeItem.isRefunded) || mode === 'edit' || (mode === 'refund' && !orderItem.isRefunded) && !attributeItem.isRefunded }">
                        <span class="mdi mdi-credit-card-refund text-2xl" v-if="attributeItem.isRefunded"></span>
                        <div
                          v-else-if="!attributeItem.isVariant && (mode === 'refund' && !attributeItem.isRefunded && !orderItem.isRefunded) || mode === 'edit'">
                          <input :disabled="selectedItems.includes(orderItem.id!)" type="checkbox"
                            class="form-checkbox mr-1 -mt-0.5"
                            @change="$emit('toggle:selectedAttributeItem', attributeItem.id!)"
                            :checked="!selectedItems.includes(orderItem.id!) && selectedAttributeItems!.includes(attributeItem.id!)" />
                        </div>
                        <span class="mdi mdi-circle-small text-2xl" v-else></span>
                        <span class="font-semibold" v-if="!attributeItem.isVariant">x{{ attributeItem.count }}</span>
                        <span class="text-gray-body ml-1">
                          <template
                            v-if="menuItemAttributesMap?.[attributeItem.menuAttributeItemId!]?.languageInfo?.[languageCode].name">
                            {{
                              menuItemAttributesMap[attributeItem.menuAttributeItemId!]?.languageInfo?.[languageCode].name
                            }}
                          </template>
                          <template v-else>
                            {{ attributeItem.attributeName }}
                          </template>
                        </span>
                      </label>
                    </div>
                    <div class="w-1/3 flex justify-end items-center">
                      <span @click="$emit('toggle:selectedItemAttribute', attributeItem.id!)"
                        v-if="!attributeItem.isVariant" :class="{ 'cursor-pointer': mode !== 'view' }"
                        class="font-medium text-sm text-gray-body">
                        {{
                          numberFormatter.currency(attributeItem.price)
                        }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex flex-col ml-8" v-if="orderItem.priceModifierTypeId">
                <div class="flex justify-between items-center gap-2" :class="{
                      'text-orange-500': [PriceModifierTypeEnum.SURCHARGE_AMOUNT, PriceModifierTypeEnum.SURCHARGE_PERCENTAGE].includes(orderItem.priceModifierTypeId),
                      'text-teal-500': [PriceModifierTypeEnum.DISCOUNT_AMOUNT, PriceModifierTypeEnum.DISCOUNT_PERCENTAGE].includes(orderItem.priceModifierTypeId)
                    }">
                  <div class="flex flex-1 items-center font-semibold">
                    <span><template
                        v-if="[PriceModifierTypeEnum.SURCHARGE_AMOUNT, PriceModifierTypeEnum.SURCHARGE_PERCENTAGE].includes(orderItem.priceModifierTypeId)">
                        <span>{{ $tc('surcharge') }}</span>
                      </template>
                      <template v-else>
                        <span>{{ $tc('discount') }}</span>
                      </template>&nbsp;
                    </span>
                    <span
                      v-if="[PriceModifierTypeEnum.DISCOUNT_AMOUNT, PriceModifierTypeEnum.SURCHARGE_AMOUNT].includes(orderItem.priceModifierTypeId)">
                      {{ numberFormatter.currency(orderItem.priceModifierValue!) }}
                    </span>
                    <span
                      v-if="[PriceModifierTypeEnum.SURCHARGE_PERCENTAGE, PriceModifierTypeEnum.DISCOUNT_PERCENTAGE].includes(orderItem.priceModifierTypeId)">
                      {{ orderItem.priceModifierValue! }}%
                    </span>
                  </div>
                  <div class="flex items-center gap-4 justify-end">
                    <span class="font-semibold">
                      <span
                        v-if="[PriceModifierTypeEnum.SURCHARGE_AMOUNT, PriceModifierTypeEnum.SURCHARGE_PERCENTAGE].includes(orderItem.priceModifierTypeId)">+</span>
                      <span v-else>-</span>
                      <span>{{ numberFormatter.currency(getTotalItemPriceModifier(orderItem)) }}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div v-if="orderItem.notes" class="flex flex-col ml-7">
                <span class="text-gray-body font-medium text-md">{{ $tc('notes') }}:</span>
                <span class="text-md text-black font-medium">{{ orderItem.notes }}</span>
              </div>
              <div class="flex items-center justify-center my-2"
                v-if="(orderItem.notes || orderItem.attributeGroups!.length > 0) && orderItemIdx < order.items.length - 1">
                <hr class="w-40 border-gray-10" />
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
    <div v-if="!['settle', 'recap'].includes(mode) && (mode !== 'refund' || !order.ordersAccountId)"
      class="flex justify-between items-center border-t border-gray-100">
      <div v-if="mode === 'view'">
        <button v-if="order.statusId !== OrderStatusEnum.Sent && !order.ordersAccountId" class="btn-action dark-teal"
          @click="$emit('toggle:mode', 'refund', order.id!)">
          <span class="mdi mdi-pencil"></span>
        </button>
        <!-- <button v-if="order.statusId == OrderStatusEnum.Sent && !order.ordersAccountId && store.isUserAdmin()"
            class="py-1 px-3 flex items-center"
            @click="$emit('update:orderStatus', order, OrderStatusEnum.Rejected, markSelectedAsInvisible, true)">
            <span class="mdi mdi-delete mr-2"></span>
            <span>{{ $tc('forceReject') }}</span>
          </button> -->
      </div>
      <div class="flex justify-end gap-2 my-2 flex-wrap w-full" @click="$event.stopPropagation()">
        <template v-if="mode === 'refund' && !order.ordersAccountId">
          <button class="btn-action gray" @click="$emit('toggle:mode', 'view')">
            <span class="mdi mdi-cancel mr-1 text-lg"></span>
            <span class="uppercase">{{ $tc('cancel') }}</span>
          </button>
          <LoadingButton @click="$emit('refund', order.id)" class="btn-action yellow"
            :is-loading="loadingState == OrderStatusEnum.ProcessingPayment" :is-disabled="loadingState != null">
            <span class="mdi mdi-check-all mr-1 text-lg"></span>
            <span class="uppercase">{{ $tc('refund') }}</span>
          </LoadingButton>
        </template>
        <template v-else-if="mode === 'view'">
          <PrintersDropdown @print="printOrder(order.id!, { printer: $event, categoriesId: [] })" :printers="printers">
          </PrintersDropdown>
          <template v-if="!isHistoryMode">
            <template v-if="order.statusId == OrderStatusEnum.Sent">
              <button @click.stop="$emit('toggle:mode', 'edit', order.id)" :is-disabled="loadingState != null"
                class="btn-action dark-teal">
                <span class="mdi mdi-playlist-edit"></span>
                <span class="uppercase">{{ $tc('changes') }}</span>
              </button>
              <LoadingButton
                @click.stop.prevent="$emit('update:orderStatus', order, OrderStatusEnum.Rejected, markSelectedAsInvisible, true)"
                class="btn-action danger" :is-loading="loadingState == OrderStatusEnum.Rejected"
                :is-disabled="loadingState != null">
                <span class="mdi mdi-close"></span>
                <span class="uppercase">{{ $tc('reject') }}</span>
              </LoadingButton>
              <LoadingButton
                @click.stop.prevent="$emit('update:orderStatus', order, OrderStatusEnum.Accepted, markSelectedAsInvisible, false)"
                class="btn-action success" :is-loading="loadingState == OrderStatusEnum.Accepted"
                :is-disabled="loadingState != null">
                <span class="mdi mdi-check"></span>
                <span class="uppercase">{{ $tc('accept') }}</span>
              </LoadingButton>
            </template>
            <LoadingButton
              v-if="order.statusId == OrderStatusEnum.Accepted && !store.selectedRestaurant.value?.skipReadyOrderStatus"
              @click.stop.prevent="$emit('update:orderStatus', order, OrderStatusEnum.Ready, markSelectedAsInvisible, false)"
              class="btn-action light-green" :is-loading="loadingState == OrderStatusEnum.Ready"
              :is-disabled="loadingState != null">
              <span class="mdi mdi-check-all"></span>
              <span class="uppercase">{{ $tc('ready') }}</span>
            </LoadingButton>
            <LoadingButton
              v-if="order.statusId == OrderStatusEnum.Ready || (order.statusId === OrderStatusEnum.Accepted && store.selectedRestaurant.value?.skipReadyOrderStatus)"
              @click.stop.prevent="$emit('update:orderStatus', order, OrderStatusEnum.Done, markSelectedAsInvisible, false)"
              class="btn-action success" :is-loading="loadingState == OrderStatusEnum.Done"
              :is-disabled="loadingState != null">
              <span class="mdi mdi-check-all"></span>
              <span class="uppercase">{{ $tc('done') }}</span>
            </LoadingButton>
          </template>
        </template>
        <template v-else-if="mode == 'edit' && order.statusId == OrderStatusEnum.Sent">
          <div class="flex items-center justify-between w-full">
            <div>
              <div class="form-label flex flex-nowrap flex-row items-center my-0">
                <Toggle v-model="markSelectedAsInvisible" class="row" />
                <span class="ml-2 text-sm">{{ $tc('setToInvisible') }}</span>
              </div>
            </div>
            <div class="flex items-center justify-end w-full flex-wrap gap-2">
              <button class="btn-action gray" @click="$emit('toggle:mode', 'view')">
                <span class="mdi mdi-cancel text-lg"></span>
                <span class="uppercase">{{ $tc('cancel') }}</span>
              </button>
              <!-- <LoadingButton
                                                    @click="$emit('update:orderStatus', order, OrderStatusEnum.Rejected, markSelectedAsInvisible, true)"
                                                    class="btn-action danger" :is-loading="loadingState == OrderStatusEnum.Rejected"
                                                    :is-disabled="loadingState != null">
                                                    <span class="mdi mdi-close mr-1 text-lg"></span>
                                                    <span class="uppercase">{{ $tc('reject') }}</span>
                                                  </LoadingButton> -->
              <LoadingButton
                @click="$emit('update:orderStatus', order, OrderStatusEnum.Accepted, markSelectedAsInvisible, true)"
                class="btn-action success" :is-loading="loadingState == OrderStatusEnum.Accepted"
                :is-disabled="loadingState != null">
                <span class="mdi mdi-check text-lg"></span>
                <span class="uppercase">{{ $tc('confirm') }}</span>
              </LoadingButton>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
