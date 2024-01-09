<script lang="ts" setup>
import { onMounted, PropType, ref, watch } from 'vue'
import { InventoryProductListItemViewModel, ItemInventoryProductViewModel, LabelTypeEnum, LanguageInfoViewModel, MenuAttributeGroupViewModel, MenuAttributeItemViewModel, MenuItemViewModel, ProductMeasureUnitTypeEnum, VisibilityScheduleViewModel } from '../../services/api.client'
import { enumToArray } from '../../services/utils'
import { useShowConfirm } from '../../services/injections'
import { useForm } from 'vee-validate'
import { string, number } from 'yup'
import { notifier } from '../../services/notification'
import FormBuilder from '../ui/FormBuilder.vue'
import Collapse from '../ui/Collapse.vue'
import TableBuilder from '../ui/TableBuilder.vue'
import DraggableTable from '../ui/DraggableTable.vue'
import { nameof } from 'ts-simple-nameof'
import { DropdownItem, FormBuilderFieldGroupDefinition, TableBuilderFieldDefinition } from '../../components/ui/types'
import { FeMenuAttributeGroup } from '../../types'
import ProductMarginVisualizer from './ProductMarginVisualizer.vue'
import { numberFormatter } from '../../services/number.formatter'
import MenuAttributeGroupDetail from './MenuAttributeGroupDetail.vue'
import Toggle from '../ui/Toggle.vue'
import { i18nInstance } from '../../services/i18n'
import Dropdown from '../ui/Dropdown.vue'

const emits = defineEmits([
  'edit:attributeGroup',
  'show:mediaManager',
  'add:inventoryProduct',
  'reload:inventoryProducts',
  'edit:visibilitySchedule',
  'remove:menuItem',
  'update:menuAttributeGroup:validity',
  'created:attributeGroup',
  'update:menuAttributeGroup',
  'update:attributeItem',
  'edit:attributeItem',
  'update:menuItem',
  'update:menuItem:validity',
  'toggle:collapse'
])

const props = defineProps({
  isLoading: {
    type: Boolean,
    required: true
  },
  attributeGroupBoundItems: {
    type: Object as PropType<{ [attributeGroupId: string]: string[] }>,
    required: true
  },
  attributeItemBoundGroups: {
    type: Object as PropType<{ [attributeGroupId: string]: string[] }>,
    required: true
  },
  isModal: Boolean,
  menuItem: {
    type: Object as PropType<MenuItemViewModel>,
    required: true
  },
  inventoryProductsMap: {
    type: Object as PropType<Record<string, InventoryProductListItemViewModel>>,
    required: true
  },
  menuAttributeGroupsMap: {
    type: Object as PropType<Record<string, MenuAttributeGroupViewModel>>,
    required: true
  },
  languages: {
    type: Array as PropType<string[]>,
    required: true
  },
  menuAttributeItemsMap: {
    type: Object as PropType<Record<string, MenuAttributeItemViewModel>>,
    required: true
  },
  defaultLanguage: {
    type: String,
    required: true
  },
  currentLanguage: {
    type: String,
    required: true
  },
  hideOptions: Boolean,
  collapsed: Boolean,
  menuItemsMap: {
    type: Object as PropType<Record<string, MenuItemViewModel>>,
    required: true
  }
})

const showVariantSelector = ref(false)
const hasVariants = ref(!!props.menuItem.variantAttributeGroupId)
const menuItemLocal = ref(props.menuItem)
watch(() => props.menuItem, () => menuItemLocal.value = props.menuItem)

const form = useForm()

const showConfirm = useShowConfirm()
const labelLookup = ref(enumToArray(LabelTypeEnum).map((x, i) => i + 1).sort((a, b) => LabelTypeEnum[a].localeCompare(LabelTypeEnum[b])))

const updateMenuItemDetailValidity = async () => {
  const { valid } = await form.validate()
  emits('update:menuItem:validity', { menuItem: menuItemLocal.value, valid })
}

const onRemoveAttributeGroup = (attributeGroupId: string) => {
  showConfirm('proceedQuestion', () => {
    const index = menuItemLocal.value.attributeGroupIds.findIndex(c => c === attributeGroupId)
    if (index === -1) return
    menuItemLocal.value.attributeGroupIds?.splice(index, 1)
    emits('update:menuItem', menuItemLocal.value)
    notifier.notifySuccess('removed', 'attributeGroup')
  })
}

const onRemoveInventoryProduct = (inventoryProductId: string) => {
  showConfirm('proceedQuestion', () => {
    const index = menuItemLocal.value.inventoryProducts.findIndex(c => c.id === inventoryProductId)
    if (index === -1) return
    menuItemLocal.value.inventoryProducts?.splice(index, 1)
    emits('update:menuItem', menuItemLocal.value)
    notifier.notifySuccess('removed', 'inventoryProduct')
  })
}

const onRemoveRecommendedItem = (menuItemId: string) => {
  showConfirm('proceedQuestion', () => {
    const index = menuItemLocal.value.recommended!.findIndex(id => id === menuItemId)
    if (index === -1) return
    menuItemLocal.value.recommended?.splice(index, 1)
    emits('update:menuItem', menuItemLocal.value)
    notifier.notifySuccess('removed', 'recommendedItem')
  })
}

onMounted(() => {
  updateMenuItemDetailValidity()
})

const addAttributeGroup = (attributeGroupId?: string) => {
  const newAttributeGroup = new FeMenuAttributeGroup({
    languageInfo: props.languages.reduce((map, lang) => ({ ...map, [lang]: new LanguageInfoViewModel() }), {})
  })
  attributeGroupId = newAttributeGroup.id!

  emits('edit:attributeGroup', newAttributeGroup, () => {
    menuItemLocal.value.attributeGroupIds!.unshift(attributeGroupId!)
    emits('update:menuItem', menuItemLocal.value)
  })
}

const menuItemBaseFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    '[class]': 'flex flex-col gap-1 flex-1',
    'languageInfo[currentLanguage].name': {
      type: 'text',
      rules: string().required().min(3),
      name: '@',
      inputEvt: () => updateMenuItemDetailValidity(),
      placeholder: (model: MenuItemViewModel) => model.languageInfo[props.defaultLanguage].name,
      propsObject: () => ({ currentLanguage: props.currentLanguage })
    },
    'languageInfo[currentLanguage].description': {
      type: 'textarea',
      class: 'resize-none',
      name: '@',
      placeholder: (model: MenuItemViewModel) => model.languageInfo[props.defaultLanguage].description,
      propsObject: () => ({ currentLanguage: props.currentLanguage })
    }
  } as FormBuilderFieldGroupDefinition
])

const menuItemAdditionalFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    '[class]': 'flex gap-1 w-32 items-center',
    [nameof<MenuItemViewModel>(m => m.price)]: {
      type: 'currency',
      rules: number().required().min(0.5),
      class: 'w-32',
      name: '@',
      if: (item: MenuItemViewModel) => !item.variantAttributeGroupId,
      inputEvt: () => updateMenuItemDetailValidity()
    }
  }, {
    '[class]': 'flex gap-1 w-32 items-center',
    [nameof<MenuItemViewModel>(m => m.isVisible)]: {
      type: 'toggle',
      name: '@'
    },
    variants: {
      type: 'slot',
      name: '@'
    }
  } as FormBuilderFieldGroupDefinition
])

const menuItemExtraFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    '[class]': 'grid grid-cols-3 gap-1',
    [nameof<MenuItemViewModel>(m => m.preparationTime)]: {
      type: 'number',
      name: '@'
    },
    [nameof<MenuItemViewModel>(m => m.kiloCalories)]: {
      type: 'number',
      name: '@'
    },
    [nameof<MenuItemViewModel>(m => m.taxPercentage)]: {
      type: 'percentage',
      name: '@'
    }
  } as FormBuilderFieldGroupDefinition,
  {
    '[class]': 'flex flex-col gap-1',
    [nameof<MenuItemViewModel>(m => m.notes)]: {
      type: 'textarea',
      name: '@'
    },
    [nameof<MenuItemViewModel>(m => m.recipe)]: {
      type: 'textarea',
      name: '@'
    }
  } as FormBuilderFieldGroupDefinition
])

const showNewRecommended = ref(false)
const recommendedColumnDefinition = ref<TableBuilderFieldDefinition>({
  selector: {
    type: 'selector',
    isChecked: (item: any) => menuItemLocal.value.recommended!.includes(item.id),
    changeEvt: (item: any, val: boolean) => {
      const idx = menuItemLocal.value.recommended!.indexOf(item.id)
      if (idx > -1)
        menuItemLocal.value.recommended!.splice(idx, 1)
      else
        menuItemLocal.value.recommended!.push(item.id)
      emits('update:menuItem', menuItemLocal.value)
    }
  },
  name: {
    type: 'slot',
    name: '@'
  }
})

const labelsColumnDefinition = ref<TableBuilderFieldDefinition>({
  selector: {
    type: 'selector',
    isChecked: (item: any) => menuItemLocal.value.labels.includes(item),
    changeEvt: (item: any, val: boolean) => {
      const idx = menuItemLocal.value.labels.indexOf(item)
      if (idx > -1)
        menuItemLocal.value.labels.splice(idx, 1)
      else
        menuItemLocal.value.labels.push(item as LabelTypeEnum)
      emits('update:menuItem', menuItemLocal.value)
    }
  },
  name: {
    type: 'slot',
    name: '@'
  }
})

const showNewAttributes = ref(false)
const attributeGroupsColumnDefinition = ref<TableBuilderFieldDefinition>({
  selector: {
    type: 'selector',
    isChecked: (item: any) => menuItemLocal.value.attributeGroupIds.includes(item.id),
    changeEvt: (item: any) => {
      const idx = menuItemLocal.value.attributeGroupIds.indexOf(item.id)
      if (idx > -1)
        menuItemLocal.value.attributeGroupIds.splice(idx, 1)
      else
        menuItemLocal.value.attributeGroupIds.push(item.id)
      emits('update:menuItem', menuItemLocal.value)
    },
    if: (item: MenuAttributeItemViewModel) => item.id !== menuItemLocal.value.variantAttributeGroupId
  },
  name: {
    type: 'slot',
    name: '@'
  },
  boundItems: {
    type: 'slot'
  },
  variant: {
    type: 'slot'
  }
})
const variantsAttributeGroupsColumnDefinition = ref<TableBuilderFieldDefinition>({
  name: {
    type: 'slot',
    name: '@'
  },
  boundItems: {
    type: 'slot'
  },
  variant: {
    type: 'slot'
  }
})

const showNewIngredients = ref(false)

const menuItemIngredientsColumnDefinition = ref<TableBuilderFieldDefinition>({
  name: {
    type: 'slot',
    name: '@'
  },
  [nameof<ItemInventoryProductViewModel>(m => m.quantity)]: {
    type: 'number',
    class: 'w-32',
    name: '@'
  },
  lastPrice: {
    type: 'slot',
    name: '@'
  },
  measure: {
    type: 'slot',
    name: 'measure'
  },
  delete: {
    type: 'slot',
    name: ''
  }
})

const newIngredientsColumnDefinition = ref<TableBuilderFieldDefinition>({
  selector: {
    type: 'selector',
    name: '',
    isChecked: (item: any) => !!menuItemLocal.value.inventoryProducts!.find(p => item.id === p.id),
    changeEvt: (item: any, val: boolean) => {
      const idx = menuItemLocal.value.inventoryProducts!.findIndex(p => item.id === p.id)
      if (idx > -1)
        menuItemLocal.value.inventoryProducts!.splice(idx, 1)
      else
        menuItemLocal.value.inventoryProducts!.push(ItemInventoryProductViewModel.fromJS({ id: item.id, quantity: 0 })!)
      emits('update:menuItem', menuItemLocal.value)
    }
  },
  [nameof<InventoryProductListItemViewModel>(m => m.product!.name)]: {
    type: 'string',
    name: 'name'
  },
  [nameof<InventoryProductListItemViewModel>(m => m.product!.productMeasureUnitTypeId)]: {
    type: 'enum',
    name: 'measure',
    enumValue: ProductMeasureUnitTypeEnum,
    enumName: 'ProductMeasureUnitTypeEnum'
  }
})

const makeVariant = (attributeGroupId: string) => {
  menuItemLocal.value.variantAttributeGroupId = attributeGroupId
  menuItemLocal.value.attributeGroupIds = menuItemLocal.value.attributeGroupIds.filter(groupId => groupId !== attributeGroupId)
  emits('update:menuItem', menuItemLocal.value)
  showVariantSelector.value = false
}

const toggleVariants = () => {
  hasVariants.value = !hasVariants.value
  const menuItem = props.menuItem
  if (menuItem.variantAttributeGroupId)
    menuItem.variantAttributeGroupId = undefined
  emits('update:menuItem', menuItem)
}

const createVariant = () => {
  const menuItem = props.menuItem

  const newAttributeGroup = new FeMenuAttributeGroup({
    languageInfo: props.languages.reduce((map, lang) => ({ ...map, [lang]: new LanguageInfoViewModel({ name: `${props.menuItem.languageInfo[lang].name}-${i18nInstance.global.t('variants')}`, description: '' }) }), {}),
    minSelections: 1,
    maxSelections: 1
  })
  menuItem.variantAttributeGroupId = newAttributeGroup.id
  showVariantSelector.value = false
  emits('created:attributeGroup', newAttributeGroup)
  emits('update:menuItem', menuItem)
}

const dropdownItems = ref<DropdownItem[]>([
  // {
  //   text: 'delete',
  //   icon: 'delete',
  //   action: () => emits('remove:category', categoryLocal.value.id)
  // },
  {
    text: 'visibilitySchedule',
    icon: 'clock',
    action: () => emits('edit:visibilitySchedule', (schedules: VisibilityScheduleViewModel[]) => {
      menuItemLocal.value.schedules = schedules
      emits('update:menuItem', menuItemLocal.value)
    }, menuItemLocal.value.schedules)
  }
])
</script>
<template>
  <div v-if="menuItemLocal" class="card flex flex-col" @click="emits('toggle:collapse', false)">
    <div class="flex gap-2 mb-2">
      <div class="flex items-center justify-center">
        <Dropdown :items="dropdownItems">
          <button class="text-gray-body btn-action gray p-1">
            <span class="mdi mdi-dots-vertical text-xl"></span>
          </button>
        </Dropdown>
      </div>
      <label class="form-label">
        <span>{{ $tc('image') }}</span>

        <div @click="$emit('show:mediaManager', menuItemLocal)"
          class="w-32 h-32 transition-colors my-1 border-gray-input border duration-150 dark:hover:border-red-pnp hover:border-red-pnp hover:border-2 bg-white cursor-pointer dark:bg-gray-800 rounded flex items-center justify-center">
          <span class="mdi mdi-image-outline text-3xl text-gray-300"
            v-if="(menuItemLocal.medias?.length ?? 0) === 0"></span>
          <div class="w-full h-full relative" v-else>
            <img :src="menuItemLocal.medias[0].mediaUrl" class="object-cover w-full h-full rounded" />
            <div class="absolute bottom-0 right-0">
              <span class="mdi mdi-delete text-white"></span>
            </div>
          </div>
        </div>
      </label>
      <FormBuilder :is-loading="isLoading" v-model="menuItemLocal"
        @update:model-value="$emit('update:menuItem', menuItemLocal)" :fields-groups="menuItemBaseFieldsGroups"
        :display-as-column="true">
      </FormBuilder>
      <div class="flex flex-col">
        <FormBuilder :is-loading="isLoading" v-model="menuItemLocal"
          @update:model-value="$emit('update:menuItem', menuItemLocal)" :fields-groups="menuItemAdditionalFieldsGroups"
          :display-as-column="true">
          <template v-slot:variants>
            <Toggle :model-value="hasVariants" @update:model-value="toggleVariants()"></Toggle>
          </template>
        </FormBuilder>
      </div>
    </div>
    <div class="-mx-2">
      <Collapse title="variants" v-if="hasVariants || !!menuItem.variantAttributeGroupId" :is-open="true">
        <TableBuilder class="pt-1" :carded="false" v-if="showVariantSelector || !menuItem.variantAttributeGroupId"
          :fixed-page-size="10" :show-search-input="true" :is-loading="isLoading" :show-search-button="false"
          :show-pages="true"
          :items="Object.values(menuAttributeGroupsMap).filter(item => item.maxSelections === 1 && item.minSelections === 1)"
          :columns="variantsAttributeGroupsColumnDefinition"
          :filter-fn="(item, query) => (item.languageInfo[defaultLanguage].name ?? '').toLowerCase().indexOf(query.toLowerCase()) > -1">
          <template v-slot:action-buttons-right>
            <div class="flex py-0.5 gap-2 items-end">
              <button class="btn-action gray" @click="showVariantSelector = false"
                v-if="menuItem.variantAttributeGroupId">
                <span class="mdi mdi-close"></span>
                <span>{{ $tc('close') }}</span>
              </button>
              <button class="btn-action primary-fill" @click="createVariant()">
                <span class="mdi mdi-plus"></span>
                <span>{{ $tc('new') }}</span>
              </button>
            </div>
          </template>
          <template v-slot:name="{ item } : { item: any }">
            <span>{{ menuAttributeGroupsMap[item.id]?.languageInfo?.[defaultLanguage]?.name }}</span>
          </template>
          <template v-slot:boundItems="{ item } : { item: any }">
            <div class="flex gap-2">
              <span class="text-xs rounded-xl py-0.5 px-2 bg-gray-body text-white"
                v-for="menuItemId of attributeGroupBoundItems[item.id!]" :key="menuItemId">{{
                  menuItemsMap[menuItemId].languageInfo[props.defaultLanguage].name }}</span>
            </div>
          </template>
          <template v-slot:variant="{ item } : { item: any }">
            <button class="btn-action primary p-1" @click="makeVariant(item.id)"
              v-if="item.id !== menuItemLocal.variantAttributeGroupId">
              {{ $tc('makeVariant') }}
            </button>
            <span v-else-if="item.id === menuItemLocal.variantAttributeGroupId"
              class="bg-primary rounded-lg text-white font-sm font-semibold p-1">{{ $tc('variant') }}</span>
          </template>
        </TableBuilder>
        <div class="mx-0" v-else>
          <MenuAttributeGroupDetail :attribute-item-bound-groups="attributeItemBoundGroups"
            :menu-attribute-groups-map="menuAttributeGroupsMap" :menu-items-map="menuItemsMap"
            :attribute-group-bound-items="attributeGroupBoundItems" :is-variant-mode="true" :is-loading="isLoading"
            @change:variant="showVariantSelector = true" :menu-attribute-items-map="menuAttributeItemsMap"
            @update:menu-attribute-group:validity="$emit('update:menuAttributeGroup:validity', $event)"
            :languages="languages" :current-language="currentLanguage" :default-language="defaultLanguage"
            @edit:attribute-item="(attributeItemId, callback) => $emit('edit:attributeItem', attributeItemId, callback)"
            @remove:menu-attribute-group="onRemoveAttributeGroup($event.id)"
            :menu-attribute-group="menuAttributeGroupsMap[menuItem.variantAttributeGroupId!]"
            @update:menu-attribute-group="$emit('update:menuAttributeGroup', $event)" />
        </div>
      </Collapse>
    </div>
    <div class="-mx-2">
      <Collapse title="details">
        <div class="flex py-2">
          <div class="w-1/2 px-2">
            <label class="form-label">
              <span>{{ $tc('labels') }}</span>
              <div class="border border-gray-200 rounded my-1">
                <TableBuilder :carded="false" :fixed-page-size="5" :is-loading="isLoading" :show-search-button="false"
                  :items="labelLookup" :show-search-input="true" :columns="labelsColumnDefinition"
                  :filter-fn="(item, query) => $tc(`LabelTypeEnum.${LabelTypeEnum[item]}`).toLowerCase().includes(query.toLowerCase())">
                  <template v-slot:name="{ item } : { item: any }">
                    {{ $tc(`LabelTypeEnum.${LabelTypeEnum[item]}`) }}
                  </template>
                </TableBuilder>
              </div>
            </label>
          </div>
          <div class="px-2 w-1/2">
            <FormBuilder :is-loading="isLoading" v-model="menuItemLocal"
              @update:model-value="$emit('update:menuItem', menuItemLocal)" :fields-groups="menuItemExtraFieldsGroups">
            </FormBuilder>
          </div>
        </div>
      </Collapse>
    </div>
    <div class="-mx-2">
      <Collapse title="recommendedItems">
        <TableBuilder v-if="showNewRecommended" :carded="false" :fixed-page-size="5" :show-search-input="true"
          :is-loading="isLoading" :show-search-button="false"
          :items="Object.values(menuItemsMap).filter(k => k.id !== menuItemLocal.id)"
          :columns="recommendedColumnDefinition"
          :filter-fn="(item, query) => (item.languageInfo[defaultLanguage].name ?? '').toLowerCase().indexOf(query.toLowerCase()) > -1">
          <template v-slot:action-buttons-right>
            <button class="btn-action gray" @click="showNewRecommended = false">
              <span class="mdi mdi-close"></span>
              <span>{{ $tc('close') }}</span>
            </button>
          </template>
          <template v-slot:name="{ item } : { item: any }">
            {{ item.languageInfo[defaultLanguage].name }}
          </template>
          <template v-slot:delete="{ item } : { item: any }">
            <span class="mdi mdi-delete" @click="onRemoveRecommendedItem(item)"></span>
          </template>
        </TableBuilder>
        <DraggableTable v-else
          @update:model-value="menuItemLocal.recommended = $event; $emit('update:menuItem', menuItemLocal)"
          :model-value="(menuItemLocal.recommended as any[])"
          :columns="{ name: { name: '@' }, delete: { class: 'w-10' } }">
          <template v-slot:action-buttons>
            <button class="btn-action primary-fill" @click="showNewRecommended = true">
              <span class="mdi mdi-plus"></span>
              <span>{{ $tc('add') }}</span>
            </button>
          </template>
          <template v-slot:name="{ item } : { item: any }">
            {{ menuItemsMap[item].languageInfo[defaultLanguage].name }}
          </template>
          <template v-slot:delete="{ item } : { item: any }">
            <span class="mdi mdi-delete" @click="onRemoveRecommendedItem(item)"></span>
          </template>
        </DraggableTable>
      </Collapse>
    </div>
    <div class="-mx-2">
      <Collapse title="attributeGroups">
        <TableBuilder class="pt-1" :carded="false" v-if="showNewAttributes" :fixed-page-size="10"
          :show-search-input="true" :is-loading="isLoading" :show-search-button="false"
          :items="Object.values(menuAttributeGroupsMap)" :columns="attributeGroupsColumnDefinition"
          :filter-fn="(item, query) => (item.languageInfo[defaultLanguage].name ?? '').toLowerCase().indexOf(query.toLowerCase()) > -1">
          <template v-slot:action-buttons-right>
            <div class="flex py-0.5 gap-2 items-end">
              <button class="btn-action gray" @click="showNewAttributes = false">
                <span class="mdi mdi-close"></span>
                <span>{{ $tc('close') }}</span>
              </button>
              <button class="btn-action primary-fill" @click="addAttributeGroup()">
                <span class="mdi mdi-plus"></span>
                <span>{{ $tc('new') }}</span>
              </button>
            </div>
          </template>
          <template v-slot:name="{ item } : { item: any }">
            <span>{{ menuAttributeGroupsMap[item.id]?.languageInfo?.[defaultLanguage]?.name }}</span>
          </template>
          <template v-slot:boundItems="{ item } : { item: any }">
            <div class="flex gap-2">
              <span class="text-xs rounded-xl py-0.5 px-2 bg-gray-body text-white"
                v-for="menuItemId of attributeGroupBoundItems[item.id!]" :key="menuItemId">{{
                  menuItemsMap[menuItemId].languageInfo[props.defaultLanguage].name }}</span>
            </div>
          </template>
          <template v-slot:variant="{ item } : { item: any }">
            <span v-if="item.id === menuItemLocal.variantAttributeGroupId"
              class="bg-primary rounded-lg text-white font-sm font-semibold p-1">{{ $tc('variant') }}</span>
          </template>
        </TableBuilder>

        <DraggableTable v-else v-model="menuItemLocal.attributeGroupIds"
          @update:model-value="$emit('update:menuItem', menuItemLocal)"
          :columns="{ name: { name: '@' }, variant: {}, edit: { class: 'w-10' }, delete: { class: 'w-10' } }">
          <template v-slot:action-buttons>
            <button class="btn-action primary-fill" @click="showNewAttributes = true">
              <span class="mdi mdi-plus"></span>
              <span>{{ $tc('add') }}</span>
            </button>
          </template>
          <template v-slot:name="{ item: itemId }">
            {{ menuAttributeGroupsMap[itemId]?.languageInfo?.[defaultLanguage]?.name }}
          </template>
          <template v-slot:variant="{ item: itemId }">
            <span v-if="itemId === menuItemLocal.variantAttributeGroupId"
              class="bg-primary rounded-lg text-white font-sm font-semibold p-1">{{ $tc('variant') }}</span>
          </template>
          <template v-slot:edit="{ item: itemId }">
            <span class="mdi mdi-pencil" @click="$emit('edit:attributeGroup', menuAttributeGroupsMap[itemId])"></span>
          </template>
          <template v-slot:delete="{ item: itemId }">
            <span class="mdi mdi-delete" @click="onRemoveAttributeGroup(itemId)"></span>
          </template>
        </DraggableTable>
      </Collapse>
    </div>
    <div class="-mx-2 -mb-2">
      <Collapse title="ingredients">
        <TableBuilder :carded="false" v-if="showNewIngredients" :fixed-page-size="10" :show-search-input="true"
          :is-loading="isLoading" :show-search-button="false" :items="Object.values(inventoryProductsMap)"
          :columns="newIngredientsColumnDefinition">
          <template v-slot:action-buttons-right>
            <div class="flex py-0.5 gap-2 items-end">
              <button class="btn-action gray" @click="showNewIngredients = false">
                <span class="mdi mdi-close"></span>
                <span>{{ $tc('close') }}</span>
              </button>
              <button class="btn-action primary-fill" @click="emits('add:inventoryProduct')">
                <span class="mdi mdi-plus"></span>
                <span>{{ $tc('new') }}</span>
              </button>
              <button class="btn-action primary-fill" @click="emits('reload:inventoryProducts')">
                <span class="mdi mdi-reload"></span>
                <span>{{ $tc('reload') }}</span>
              </button>
            </div>
          </template>
        </TableBuilder>
        <TableBuilder v-else :carded="false" :is-loading="isLoading" :show-search-input="true" :show-search-button="false"
          :items="menuItemLocal.inventoryProducts" :columns="menuItemIngredientsColumnDefinition">
          <template v-slot:action-buttons-right>
            <button class="btn-action primary-fill" @click="showNewIngredients = true">
              <span class="mdi mdi-plus"></span>
              <span>{{ $tc('add') }}</span>
            </button>
          </template>
          <template v-slot:name="{ item } : { item: any }">
            {{ inventoryProductsMap[item.id].product!.name }}
          </template>
          <template v-slot:lastPrice="{ item } : { item: any }">
            {{ numberFormatter.currency(inventoryProductsMap[item.id].lastPrice!) }}
          </template>
          <template v-slot:measure="{ item } : { item: any }">
            {{
              $tc(`ProductMeasureUnitTypeEnum.${ProductMeasureUnitTypeEnum[inventoryProductsMap[item.id].product!.productMeasureUnitTypeId]
                }`)
            }}
          </template>
          <template v-slot:delete="{ item } : { item: any }">
            <span class="mdi mdi-delete" @click="onRemoveInventoryProduct(item.id)"></span>
          </template>
        </TableBuilder>
      </Collapse>
      <Collapse title="margins" :is-last="true">
        <ProductMarginVisualizer :products-allocation="menuItemLocal.inventoryProducts"
          :inventory-products-map="inventoryProductsMap" :price="menuItemLocal.price"
          :tax-percentage="menuItemLocal.taxPercentage" />
      </Collapse>
    </div>
  </div>
</template>
