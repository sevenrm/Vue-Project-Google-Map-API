<script setup lang="ts">
import { computed, onMounted, PropType, Ref, ref, watch } from 'vue'
import { MenuAttributeGroupViewModel, MenuAttributeItemViewModel, MenuViewModel, OrderItemAttributeGroupViewModel, OrderItemAttributeViewModel, OrderItemViewModel, MenuItemViewModel, PriceModifierTypeEnum, MenuCategoryViewModel, PlatformPermissionEnum } from '../../services/api.client'
import { isMobile, pageContentHeight } from '../../services/utils'
import { numberFormatter } from '../../services/number.formatter'
import ScrollableDiv from '../ui/ScrollableDiv.vue'
import { OrdersSettings } from './orders-settings'
import NumericKeypad from './NumericKeypad.vue'
import Modal from '../ui/Modal.vue'
import { ModalSize } from '../ui/types'
import { notifier } from '../../services/notification'
import { apiClient } from '../../services/api'
import { useShowConfirm } from '../../services/injections'
import { store } from '../../services/store'

const props = defineProps({
  showHiddenProducts: Boolean,
  restaurantId: {
    type: String,
    required: true
  },
  menu: {
    type: Object as PropType<MenuViewModel>,
    required: true
  },
  orderSettings: {
    type: Object as PropType<OrdersSettings>,
    required: true
  },
  categoriesMap: {
    type: Object as PropType<{ [categoryId: string]: MenuCategoryViewModel }>,
    required: true
  },
  languageCode: {
    type: String,
    required: true
  },
  orderItem: Object as PropType<OrderItemViewModel>,
  selectedItemId: String,
  showAsGrid: Boolean,
  menuItemsMap: {
    type: Object as PropType<{ [menuItemId: string]: MenuItemViewModel }>,
    required: true
  },
  menuItemAttributeGroupsMap: {
    type: Object as PropType<{ [menuAttributeGroupId: string]: MenuAttributeGroupViewModel }>,
    required: true
  },
  menuItemAttributesMap: {
    type: Object as PropType<{ [menuAttributeId: string]: MenuAttributeItemViewModel }>,
    required: true
  }
})
const showConfirm = useShowConfirm()
const emits = defineEmits(['selected', 'update:selectedItemId', 'close', 'delete', 'update:itemVisibility', 'update:categoryVisibility'])
const FAVORITES_CATEGORY = '#favorites'
const isLoading = ref(false)
const notes = ref('')
const selectedCategoryId: Ref<string | undefined> = ref(undefined)
const menuItems = computed(() => {
  let items: MenuItemViewModel[] = []
  if (searchInput.value)
    items = props.menu.menuItems.filter(i => i.languageInfo?.[props.languageCode]?.name?.toLowerCase()?.includes(searchInput.value.toLowerCase()) ?? false)
  else if (selectedCategoryId.value === FAVORITES_CATEGORY)
    items = props.orderSettings.favoriteItems?.map(i => props.menuItemsMap[i]) ?? []
  else {
    const selectedCategory = props.menu.categories.find(c => c.id === selectedCategoryId.value)
    if (selectedCategory)
      items = props.menu.menuItems.filter(i => selectedCategory!.menuItemIds!.indexOf(i.id!) > -1)
  }
  return items.filter(i => !!i && (i.isVisible || props.showHiddenProducts))
})
const selectedItem = computed(() => props.menuItemsMap[(props.orderItem ? props.orderItem.menuItemId : props.selectedItemId)!])
const selectedAttributeGroups: Ref<{ [attributeGroupId: string]: string[] }> = ref({})
const count = ref(1)

watch(() => props.orderItem, () => {
  count.value = props.orderItem?.count ?? 1
  notes.value = props.orderItem?.notes ?? ''
  selectedAttributeGroups.value = props.orderItem
    ?.attributeGroups
    ?.reduce((map, g) => ({ ...map, [g.id!]: g.orderItemAttributes!.map(a => a.menuAttributeItemId) }), {}) ?? {}
  if (props.orderItem && props.orderItem.priceModifierTypeId) {
    priceModifierValue.value = props.orderItem.priceModifierValue ?? 0
    priceModifier.value = props.orderItem.priceModifierTypeId
  } else {
    priceModifierValue.value = 0
    priceModifier.value = undefined
  }
})

watch(() => props.selectedItemId, () => {
  selectedAttributeGroups.value = {}
  if (props.selectedItemId && selectedItem.value.variantAttributeGroupId)
    toggleAttribute(props.menuItemAttributeGroupsMap[selectedItem.value.variantAttributeGroupId], getDefaultAttributeGroupVariant(selectedItem.value.variantAttributeGroupId))
})

const saveItem = () => {
  let variantPrice: number | undefined
  const attributeGroups = Object.keys(selectedAttributeGroups.value)
    .map(groupAttributeId => OrderItemAttributeGroupViewModel
      .fromJS({
        id: groupAttributeId,
        orderItemAttributes: selectedAttributeGroups.value[groupAttributeId]
          .map((attributeId: string) => {
            if (groupAttributeId === selectedItem.value.variantAttributeGroupId)
              variantPrice = props.menuItemAttributesMap[attributeId].price
            return OrderItemAttributeViewModel
              .fromJS({
                menuAttributeItemId: attributeId,
                attributeName: props.menuItemAttributesMap[attributeId]?.languageInfo?.[props.languageCode]?.name,
                count: 1,
                price: groupAttributeId === selectedItem.value.variantAttributeGroupId ? 0 : props.menuItemAttributesMap[attributeId].price,
                isVariant: groupAttributeId === selectedItem.value.variantAttributeGroupId
              })
          })
      }))
  const orderItem = OrderItemViewModel.fromJS({
    id: props.orderItem?.id ?? `#${Math.random()}`,
    menuItemId: props.orderItem?.menuItemId ?? props.selectedItemId,
    itemName: props.menuItemsMap[(props.orderItem?.menuItemId ?? props.selectedItemId)!]?.languageInfo?.[props.languageCode]?.name,
    notes: notes.value,
    count: count.value,
    price: variantPrice ?? selectedItem.value.price,
    attributeGroups
  })!
  if (priceModifier.value && priceModifierValue.value) {
    orderItem.priceModifierTypeId = priceModifier.value
    orderItem.priceModifierValue = priceModifierValue.value
  }
  priceModifier.value = undefined
  priceModifierValue.value = 0
  emits('selected', orderItem)
  count.value = 1
  notes.value = ''
  if (isMobile.value)
    selectedCategoryId.value = undefined
}

const toggleAttribute = (attributeGroup: MenuAttributeGroupViewModel, attribute: MenuAttributeItemViewModel) => {
  if (!selectedAttributeGroups.value[attributeGroup.id!]) {
    selectedAttributeGroups.value[attributeGroup.id!] = []
  }
  if (attributeGroup.maxSelections === 1)
    selectedAttributeGroups.value[attributeGroup.id!] = selectedAttributeGroups.value[attributeGroup.id!][0] === attribute.id && attributeGroup.id !== selectedItem.value.variantAttributeGroupId ? [] : [attribute.id!]
  else if (selectedAttributeGroups.value[attributeGroup.id!].indexOf(attribute.id!) > -1)
    selectedAttributeGroups.value[attributeGroup.id!].splice(selectedAttributeGroups.value[attributeGroup.id!].indexOf(attribute.id!), 1)
  else if (!attribute!.maxSelections || selectedAttributeGroups.value[attributeGroup.id!].length <= attributeGroup!.maxSelections!)
    selectedAttributeGroups.value[attributeGroup.id!].push(attribute.id!)
}

const toggleFavorite = (itemId: string) => {
  const idx = props.orderSettings.favoriteItems.indexOf(itemId)
  if (idx === -1)
    props.orderSettings.favoriteItems.push(itemId)
  else
    props.orderSettings.favoriteItems.splice(idx, 1)
}

const toggleItemVisibility = async (itemId: string, isVisible: boolean) => {
  showConfirm('proceedQuestion', async () => {
    isLoading.value = true
    try {
      await apiClient.menuItemVisibility(props.restaurantId, itemId, isVisible)
      notifier.notifySuccess('updated', 'visibility')
      emits('update:itemVisibility', itemId, isVisible)
    } catch (error) {
      notifier.notifyError('updating', error, 'visibility')
    }
    isLoading.value = false
  })
}

const toggleCategoryVisibility = async (categoryId: string, isVisible: boolean) => {
  showConfirm('proceedQuestion', async () => {
    isLoading.value = true
    try {
      await apiClient.menuCategoryVisibility(props.restaurantId, categoryId, isVisible)
      notifier.notifySuccess('updated', 'visibility')
      emits('update:categoryVisibility', categoryId, isVisible)
    } catch (error) {
      notifier.notifyError('updating', error, 'visibility')
    }
    isLoading.value = false
  })
}

const attributeGroups = computed(() =>
  selectedItem.value
    ? [
      ...(
        selectedItem.value.variantAttributeGroupId
          ? [props.menuItemAttributeGroupsMap[selectedItem.value.variantAttributeGroupId]]
          : []
      ),
      ...selectedItem!.value!.attributeGroupIds.map(id => props.menuItemAttributeGroupsMap[id]).filter(g => !!g)
    ]
    : [])

const isValidRequest = () => {
  return attributeGroups.value.every(group => {
    const attributeGroupLength = (selectedAttributeGroups.value[group.id!] ?? []).length
    if (attributeGroupLength < group.minSelections || attributeGroupLength > group!.maxSelections!)
      return false
    return true
  })
}

const searchInput = ref('')

const priceModifierValue = ref(0)
const priceModifierVisible = ref(false)
const priceModifier = ref<PriceModifierTypeEnum | undefined>()
const totalAmount = computed(() => 0)

const getDefaultAttributeGroupVariant = (attributeGroupId: string) => {
  const attributeGroup = props.menuItemAttributeGroupsMap[attributeGroupId]
  return props.menuItemAttributesMap[attributeGroup.defaultVariantAttributeItemId
    ? attributeGroup.defaultVariantAttributeItemId
    : attributeGroup.attributeItemIds[0]]
}

onMounted(() => {
  if (!isMobile.value)
    selectedCategoryId.value = props.menu.categories[0].id
})

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
</script>
<template>
  <div class="flex w-full flex-col md:container">
    <Modal
      :title="[PriceModifierTypeEnum.SURCHARGE_AMOUNT, PriceModifierTypeEnum.SURCHARGE_PERCENTAGE].includes(priceModifier) ? 'surcharge' : 'discount'"
      :size="ModalSize.Medium" v-if="priceModifierVisible && priceModifier" @close="priceModifierVisible = false"
      :action-buttons="[{ text: 'delete', iconName: 'delete', colorClass: 'danger', action: () => { priceModifier = undefined; priceModifierVisible = false; priceModifierValue = 0 } }]">
      <template v-slot:content>
        <div class="flex flex-col">
          <div class="flex flex-col gap-2 uppercase font-bold">
            <NumericKeypad :unit-selector="[numberFormatter.currencySymbol, '%']" @update:active-unit="switchActiveUnit()"
              :active-unit="[PriceModifierTypeEnum.SURCHARGE_AMOUNT, PriceModifierTypeEnum.DISCOUNT_AMOUNT].includes(priceModifier) ? numberFormatter.currencySymbol : '%'"
              :label="$tc(`PriceModifierEnum.${PriceModifierTypeEnum[priceModifier]}`)" :allow-decimals="true"
              v-model="priceModifierValue"
              :confirm-disabled="priceModifierValue === 0 || (priceModifier === PriceModifierTypeEnum.DISCOUNT_AMOUNT && priceModifierValue > totalAmount)"
            @clear="priceModifierValue = 0" @confirm="priceModifierVisible = false">
          </NumericKeypad>
        </div>
      </div>
    </template>
  </Modal>
  <template v-if="!selectedItemId && !orderItem">
    <div class="flex flex-col w-full">
      <div :class="{ 'hidden': selectedCategoryId }"
          class="relative mx-2 md:flex mb-2 mr-3 flex gap-2 card cursor-pointer p-2 uppercase text-base font-semibold transition-colors duration-150 mt-0">
          <span class="mdi mdi-magnify text-gray-body"></span>
          <input v-model="searchInput" type="text" class="outline-none w-full" :placeholder="$tc('search')" />
          <div class="absolute right-2 my-auto top-0 bottom-0 flex items-center justify-center" v-if="searchInput"
            @click="searchInput = ''">
            <span class="mdi mdi-close text-primary"></span>
          </div>
        </div>
        <div class="flex w-full">
          <div class="w-full relative md:w-1/4 min-w-[190px]"
            :class="{ 'hidden md:block': selectedCategoryId || searchInput.length }">
            <ScrollableDiv outer-class="" class="border-r border-gray-300" :height="pageContentHeight - 100">
              <ul>
                <li @click="selectedCategoryId = FAVORITES_CATEGORY; searchInput = ''"
                  :class="{ 'text-red-pnp': selectedCategoryId === FAVORITES_CATEGORY, 'text-gray-600': selectedCategoryId !== FAVORITES_CATEGORY }"
                  class="relative truncate card cursor-pointer p-3 m-2 uppercase text-base font-semibold transition-colors duration-150 mt-0">
                  <span class="mdi mdi-star mr-1"></span>
                  <span>{{ $tc('favorites') }}</span>
                  <span v-if="selectedCategoryId === FAVORITES_CATEGORY"
                    class="absolute top-0 bottom-0 my-auto left-0 w-1 h-12 rounded-l bg-red-pnp"></span>
                </li>
                <li v-if="!!searchInput"
                  class="text-red-pnp relative card cursor-pointer p-3 m-2 uppercase text-base font-semibold transition-colors duration-150 mt-0">
                  <span class="mdi mdi-magnify mr-1"></span>
                  <span>{{ $tc('search') }}</span>
                  <span class="absolute top-0 bottom-0 my-auto left-0 w-1 h-12 rounded-l bg-red-pnp"></span>
                </li>
                <li @click="selectedCategoryId = category.id; searchInput = ''"
                  v-for="category of menu.categories.filter(c => (c.isVisible || showHiddenProducts))" :key="category.id"
                  :class="{ 'text-red-pnp': selectedCategoryId === category.id && !searchInput, 'text-gray-600': selectedCategoryId !== category.id || !!searchInput }"
                  class="relative card cursor-pointer p-3 m-2 uppercase text-base font-semibold transition-colors duration-150">
                  <div class="flex items-center truncate">
                    <div class="ml-1">
                      <span class="mdi mdi-eye-off mr-1" v-if="!category.isVisible"></span>
                      <span v-if="category.languageInfo[languageCode]?.name">{{
                        category.languageInfo[languageCode]?.name
                      }}</span>
                      <span v-else class="italic">{{ $tc('unnamed') }}</span>
                    </div>
                    <span v-if="selectedCategoryId === category.id && !searchInput"
                      class="absolute top-0 bottom-0 my-auto left-0 w-1 h-12 rounded-l bg-red-pnp"></span>
                  </div>
                </li>
              </ul>
            </ScrollableDiv>
          </div>
          <div class="flex-1 flex-col gap-2 " :class="{ 'hidden md:flex': !selectedCategoryId && !searchInput.length }">
            <div class="flex items-center justify-center w-full flex-wrap gap-1 pl-2 pr-3">
              <div class="card pl-3 pr-0 py-2 mb-2 w-full flex items-center justify-between"
                v-if="selectedCategoryId && !searchInput.length">
                <h3 class="font-semibold uppercase text-gray-600 text-base">
                  <template v-if="selectedCategoryId === FAVORITES_CATEGORY">
                    <span class="mdi mdi-star mr-1"></span>
                    <span>{{ $tc('favorites') }}</span>
                  </template>
                  <span v-else>
                    {{
                      categoriesMap[selectedCategoryId!].languageInfo[languageCode]?.name
                    }}
                  </span>
                </h3>
                <div class="flex px-2 gap-2">
                  <button class="btn-action-icon" :class="{
                    'success': categoriesMap[selectedCategoryId!].isVisible,
                    'gray': !categoriesMap[selectedCategoryId!].isVisible,
                  }"
                    v-if="selectedCategoryId !== FAVORITES_CATEGORY && (store.isUserAdmin() || (store.user.value?.role.permissions.indexOf(PlatformPermissionEnum.ManageCatalog) ?? -1) > -1)"
                    @click="toggleCategoryVisibility(selectedCategoryId!, !categoriesMap[selectedCategoryId!].isVisible)"
                    :disabled="isLoading">
                    <span class="mdi text-2xl" :class="{
                      'mdi-eye': categoriesMap[selectedCategoryId!].isVisible,
                      'mdi-eye-off': !categoriesMap[selectedCategoryId!].isVisible,
                    }"></span>
                  </button>
                  <button class="btn-action-icon py-1 md:hidden" @click="selectedCategoryId = undefined">
                    <span class="mdi mdi-close text-xl"></span>
                  </button>
                </div>
              </div>
            </div>
            <ScrollableDiv class="overflow-y-auto" :height="pageContentHeight - (isMobile ? 0 : 44) - 108"
              outer-class="w-full" :scroll-class="{ true: 'pr-2', false: 'pr-3' }"
              :class="{ 'items-center justify-center flex': menuItems.length === 0 }">
              <ul :class="{ 'grid grid-cols-2 gap-2 ml-2': showAsGrid }" v-if="menuItems.length > 0">
                <li v-for="(item, idx) of menuItems" :key="item.id"
                  :class="{ 'mt-0': idx === 0, 'm-2 mr-0': !showAsGrid }"
                  class="cursor-pointer transition-all duration-150 card gap-2 p-2 flex justify-between items-center "
                  @click="$emit('update:selectedItemId', item.id)">
                  <div class="flex items-center gap-x-2">
                    <div class="w-16 h-16 rounded border flex items-center justify-center shadow-default bg-gray-200">
                      <img :src="item.medias[0]?.mediaUrl" class="w-16 h-16 object-cover rounded"
                        v-if="item.medias.length > 0" />
                      <span v-else class="mdi mdi-file-image"></span>
                    </div>
                    <div class="flex-1">
                      <span class="mdi mdi-eye-off mr-1" v-if="!item.isVisible"></span>
                      <span v-if="item.languageInfo[languageCode]?.name" class="font-semibold">{{
                        item.languageInfo[languageCode]?.name
                      }}</span>
                      <span v-else class="font-semibold italic">{{ $tc('unnamed') }}</span>
                    </div>
                  </div>
                  <span class="font-semibold text-red-pnp mr-2" v-if="!item.variantAttributeGroupId">{{
                    numberFormatter.currency(item.price)
                  }}</span>
                  <span class="font-semibold text-red-pnp mr-2" v-else>{{
                    numberFormatter.currency(getDefaultAttributeGroupVariant(item.variantAttributeGroupId).price)
                  }}</span>
                </li>
              </ul>
              <h2 v-else class="font-semibold text-2xl text-gray-400">{{ $tc('noItemsInCategory') }}</h2>
            </ScrollableDiv>
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="flex flex-col gap-4 card mx-3 relative">
        <div class="absolute top-2 gap-2 right-2 flex items-center justify-end">
          <button class="btn-action-icon" :class="{
            'success': selectedItem.isVisible,
            'gray': !selectedItem.isVisible,
          }"
            v-if="store.isUserAdmin() || (store.user.value?.role.permissions.indexOf(PlatformPermissionEnum.ManageCatalog) ?? -1) > -1"
            @click="toggleItemVisibility(selectedItem.id!, !selectedItem.isVisible)" :disabled="isLoading">
            <span class="mdi text-2xl" :class="{
              'mdi-eye': selectedItem.isVisible,
              'mdi-eye-off': !selectedItem.isVisible,
            }"></span>
          </button>
          <button class="btn-action-icon" @click="toggleFavorite(selectedItem.id!)">
            <span class="mdi text-2xl" :class="{
              'mdi-star text-yellow-300 hover:text-yellow-300': orderSettings.favoriteItems.includes(selectedItem.id!),
              'mdi-star-outline text-gray-body hover:text-yellow-300': !orderSettings.favoriteItems.includes(selectedItem.id!),
            }"></span>
          </button>
          <button class="btn-action-icon " @click="notes = ''; count = 1; $emit('close')">
            <span class="mdi mdi-close text-red-pnp text-2xl"></span>
          </button>
        </div>
        <div class="flex gap-4 items-center">
          <div class="w-40 h-40 rounded border flex items-center justify-center shadow-default bg-gray-200">
            <img v-if="selectedItem!.medias.length > 0" :src="selectedItem!.medias[0]?.mediaUrl"
              class="w-40 h-40 object-cover rounded" />
            <span v-else class="mdi mdi-file-image"></span>
          </div>
          <div>
            <span class="font-bold" v-if="selectedItem!.languageInfo[languageCode]?.name">{{
              selectedItem!.languageInfo[languageCode]?.name
            }}</span>
            <span v-else class="italic font-bold">{{ $tc('unnamed') }}</span>
            <p>
              {{ selectedItem!.languageInfo[languageCode]?.description }}
            </p>
            <span class="text-red-pnp font-bold" v-if="!selectedItem.variantAttributeGroupId">{{
              numberFormatter.currency(selectedItem!.price)
            }}</span>
            <div class="flex">
              <div v-if="priceModifier && priceModifierValue > 0"
                class="rounded cursor-pointer p-1 text-white font-semibold text-sm gap-1 flex"
                @click="priceModifierVisible = true" :class="{
                  'bg-teal-400': [PriceModifierTypeEnum.DISCOUNT_AMOUNT, PriceModifierTypeEnum.DISCOUNT_PERCENTAGE].includes(priceModifier),
                  'bg-orange-500': [PriceModifierTypeEnum.SURCHARGE_AMOUNT, PriceModifierTypeEnum.SURCHARGE_PERCENTAGE].includes(priceModifier)
                }">
                <template
                  v-if="[PriceModifierTypeEnum.SURCHARGE_AMOUNT, PriceModifierTypeEnum.SURCHARGE_PERCENTAGE].includes(priceModifier)">
                  <span>{{ $tc('surcharge') }}</span>
                </template>
                <template v-else>
                  <span>{{ $tc('discount') }}</span>
                </template>
                <span
                  v-if="[PriceModifierTypeEnum.DISCOUNT_AMOUNT, PriceModifierTypeEnum.SURCHARGE_AMOUNT].includes(priceModifier)">
                  {{ numberFormatter.currency(priceModifierValue) }}
                </span>
                <span
                  v-if="[PriceModifierTypeEnum.DISCOUNT_PERCENTAGE, PriceModifierTypeEnum.SURCHARGE_PERCENTAGE].includes(priceModifier)">
                  {{ priceModifierValue }}%
                </span>
                <span class="mdi mdi-pencil"></span>
              </div>
            </div>
          </div>
        </div>
        <ScrollableDiv :height="pageContentHeight - 322" outer-class="-mx-2"
          :scroll-class="{ true: 'px-3', false: 'px-3' }">
          <div>
            <div v-for="group of attributeGroups" :key="group.id">
              <div class="justify-between flex py-2">
                <span class="text-black font-semibold">{{ group.languageInfo[languageCode]?.name }}:</span>
                <div class="flex gap-2" v-if="group.id !== selectedItem.variantAttributeGroupId">
                  <span class="bg-gradient text-white rounded p-1 text-sm font-semibold">{{ $tc('required') }}:&nbsp;{{
                    group.minSelections
                  }}</span>
                  <span class="bg-gradient text-white rounded p-1 text-sm font-semibold">{{ $tc('max') }}:&nbsp;{{
                    group.maxSelections
                  }}</span>
                </div>
                <div v-else>
                  <span class="bg-gradient text-white rounded p-1 text-sm font-semibold">{{ $tc('variant') }}</span>
                </div>
              </div>
              <ul>
                <li @click="toggleAttribute(group, menuItemAttributesMap[attributeId])"
                  v-for="attributeId of group.attributeItemIds" :key="attributeId" class="flex mb-2 justify-between">
                  <label class="form-label flex flex-row space-x-2 cursor-pointer font-semibold row"
                    @click="$event.stopPropagation()">
                    <input type="radio" :name="group.id" class="form-radio text-red-pnp" v-if="group.maxSelections === 1"
                      @click="toggleAttribute(group, menuItemAttributesMap[attributeId])"
                      :checked="selectedAttributeGroups[group.id!]?.indexOf(attributeId!) > -1" />
                    <input type="checkbox" class="form-checkbox text-red-pnp"
                      @click="toggleAttribute(group, menuItemAttributesMap[attributeId])"
                      :checked="selectedAttributeGroups[group.id!]?.indexOf(attributeId!) > -1" v-else />
                    <span v-if="menuItemAttributesMap[attributeId].languageInfo[languageCode]?.name">{{
                      menuItemAttributesMap[attributeId].languageInfo[languageCode]?.name
                    }}</span>
                    <span v-else class="italic">{{ $tc('unnamed') }}</span>
                  </label>
                  <span class="font-semibold">{{
                    numberFormatter.currency(menuItemAttributesMap[attributeId].price)
                  }}</span>
                </li>
              </ul>
            </div>
          </div>
          <div class="">
            <label class="form-label w-full">
              <span>{{ $tc('notes') }}</span>
              <textarea v-model="notes"></textarea>
            </label>
          </div>
        </ScrollableDiv>
        <div class="flex justify-between">
          <div class="flex items-center justify-center gap-2">
            <!-- <button class="btn-action light-teal p-4 font-bold uppercase"
                                                                                                                                                                                              @click="priceModifier = PriceModifierTypeEnum.DISCOUNT_PERCENTAGE; priceModifierVisible = true">
                                                                                                                                                                                              <span class="mdi mdi-brightness-percent"></span>
                                                                                                                                                                                              <span>{{ $tc('discount') }}</span>
                                                                                                                                                                                            </button>
                                                                                                                                                                                            <button class="btn-action orange p-4 font-bold uppercase"
                                                                                                                                                                                              @click="priceModifier = PriceModifierTypeEnum.SURCHARGE_PERCENTAGE; priceModifierVisible = true">
                                                                                                                                                                                              <span class="mdi mdi-cart-percent"></span>
                                                                                                                                                                                              <span>{{ $tc('surcharge') }}</span>
                                                                                                                                                                                            </button> -->
          </div>
          <div class="flex justify-end gap-4">
            <div class="flex items-center gap-4 justify-between">
              <button class="btn-action danger p-3 md:p-4 font-bold uppercase" v-if="orderItem"
                @click="emits('delete', orderItem!.id)">
                <span class="mdi mdi-delete"></span>
                <span>{{ $tc('delete') }}</span>
              </button>
              <button class="btn-action-icon border border-gray-100" @click="count--" :disabled="count === 1">
                <span class="mdi mdi-minus text-red-pnp text-2xl"></span>
              </button>
              <span class="font-semibold">{{ count }}</span>
              <button class="btn-action-icon border border-gray-100" @click="count++" :disabled="count === 10">
                <span class="mdi mdi-plus text-red-pnp text-2xl"></span>
              </button>
            </div>
            <div class="flex space-x-2 justify-end">
              <button class="btn-action primary-fill font-bold uppercase p-3 px-4 md:px-6 md:p-4" @click="saveItem"
                :disabled="!isValidRequest()">
                <template v-if="orderItem">
                  <span class="mdi mdi-content-save"></span>
                  <span>{{ $tc('save') }}</span>
                </template>
                <template v-else>
                  <span class="mdi mdi-plus"></span>
                  <span>{{ $tc('add') }}</span>
                </template>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
