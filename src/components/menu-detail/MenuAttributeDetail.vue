<script lang="ts" setup>
import { onMounted, PropType, ref, watch } from 'vue'
import { InventoryProductListItemViewModel, ItemInventoryProductViewModel, LabelTypeEnum, MenuAttributeGroupViewModel, MenuAttributeItemViewModel, ProductMeasureUnitTypeEnum } from '../../services/api.client'
import { FormBuilderFieldGroupDefinition, TableBuilderFieldDefinition } from '../../components/ui/types'
import { enumToArray, getVariableName } from '../../services/utils'
import { numberFormatter } from '../../services/number.formatter'
import { useForm } from 'vee-validate'
import { string, number } from 'yup'
import TableBuilder from '../ui/TableBuilder.vue'
import Collapse from '../ui/Collapse.vue'
import FormBuilder from '../ui/FormBuilder.vue'
import { nameof } from 'ts-simple-nameof'
import { useShowConfirm } from '../../services/injections'
import { notifier } from '../../services/notification'
import ProductMarginVisualizer from './ProductMarginVisualizer.vue'

const emits = defineEmits([
  'add:inventoryProduct',
  'reload:inventoryProducts',
  'update:menuAttributeItem:validity',
  'update:menuAttributeItem',
  'remove:menuAttributeItem'
])

const props = defineProps({
  menuAttributeItem: {
    type: Object as PropType<MenuAttributeItemViewModel>,
    required: true
  },
  menuAttributeGroupsMap: {
    type: Object as PropType<Record<string, MenuAttributeGroupViewModel>>,
    required: true
  },
  attributeItemBoundGroups: {
    type: Object as PropType<{ [attributeGroupId: string]: string[] }>,
    required: true
  },
  inventoryProductsMap: {
    type: Object as PropType<Record<string, InventoryProductListItemViewModel>>,
    required: true
  },
  isLoading: {
    type: Boolean,
    required: true
  },
  languages: {
    type: Array as PropType<string[]>,
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
  maxSelections: {
    type: Number as PropType<number>
  }
})

const menuAttributeItemLocal = ref(props.menuAttributeItem)
watch(() => props.menuAttributeItem, () => menuAttributeItemLocal.value = props.menuAttributeItem)

const form = useForm()

const labelLookup = ref(enumToArray(LabelTypeEnum).map((x, i) => i + 1).sort((a, b) => LabelTypeEnum[a].localeCompare(LabelTypeEnum[b])))

const updateMenuAttributeDetailValidity = async () => {
  const { valid } = await form.validate()
  emits('update:menuAttributeItem:validity', { attribute: menuAttributeItemLocal.value, valid })
}

onMounted(() => {
  updateMenuAttributeDetailValidity()
})
const showConfirm = useShowConfirm()
const onRemoveInventoryProduct = (inventoryProductId: string) => {
  showConfirm('proceedQuestion', () => {
    const index = menuAttributeItemLocal.value.inventoryProducts.findIndex(c => c.id === inventoryProductId)
    if (index === -1) return
    menuAttributeItemLocal.value.inventoryProducts?.splice(index, 1)
    emits('update:menuAttributeItem', menuAttributeItemLocal.value)
    notifier.notifySuccess('removed', 'inventoryProduct')
  })
}

const labelsColumnDefinition = ref<TableBuilderFieldDefinition>({
  selector: {
    type: 'selector',
    isChecked: (item: any) => menuAttributeItemLocal.value.labels.includes(item),
    changeEvt: (item: any, val: boolean) => {
      const idx = menuAttributeItemLocal.value.labels.indexOf(item)
      if (idx > -1)
        menuAttributeItemLocal.value.labels.splice(idx, 1)
      else
        menuAttributeItemLocal.value.labels.push(item as LabelTypeEnum)
      emits('update:menuAttributeItem', menuAttributeItemLocal.value)
    }
  },
  name: {
    type: 'slot',
    name: '@'
  }
})

const attributeItemFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    '[class]': 'flex gap-2',
    'languageInfo[currentLanguage].name': {
      rules: string().required().min(3),
      type: 'text',
      class: 'flex-1',
      name: '@',
      inputEvt: () => updateMenuAttributeDetailValidity(),
      placeholder: (model: MenuAttributeItemViewModel) => model.languageInfo[props.defaultLanguage].name,
      propsObject: () => ({ currentLanguage: props.currentLanguage })
    },
    [nameof<MenuAttributeItemViewModel>(m => m.price)]: {
      type: 'currency',
      rules: number().required().min(0),
      class: 'w-32',
      name: '@'
    },
    [nameof<MenuAttributeItemViewModel>(m => m.maxSelections)]: {
      type: 'number',
      name: '@'
    },
    [nameof<MenuAttributeItemViewModel>(m => m.isVisible)]: {
      type: 'toggle',
      name: '@'
    }
  } as FormBuilderFieldGroupDefinition
])

const showNewIngredients = ref(false)

const menuItemIngredientsColumnDefinition = ref<TableBuilderFieldDefinition>({
  name: {
    type: 'slot',
    name: '@'
  },
  [nameof<ItemInventoryProductViewModel>(m => m.quantity)]: {
    type: 'number',
    name: '@',
    class: 'w-32'
  },
  lastPrice: {
    type: 'slot',
    name: '@'
  },
  measure: {
    type: 'slot',
    name: '@'
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
    isChecked: (item: any) => !!menuAttributeItemLocal.value.inventoryProducts!.find(p => item.id === p.id),
    changeEvt: (item: any, val: boolean) => {
      const idx = menuAttributeItemLocal.value.inventoryProducts!.findIndex(p => item.id === p.id)
      if (idx > -1)
        menuAttributeItemLocal.value.inventoryProducts!.splice(idx, 1)
      else
        menuAttributeItemLocal.value.inventoryProducts!.push(ItemInventoryProductViewModel.fromJS({ id: item.id, quantity: 0 })!)
      emits('update:menuAttributeItem', menuAttributeItemLocal.value)
    }
  },
  [nameof<InventoryProductListItemViewModel>(m => m.product!.name)]: {
    type: 'string',
    name: '@'
  },
  [nameof<InventoryProductListItemViewModel>(m => m.product!.productMeasureUnitTypeId)]: {
    type: 'enum',
    name: 'measure',
    enumValue: ProductMeasureUnitTypeEnum,
    enumName: 'ProductMeasureUnitTypeEnum'
  }
})
</script>
<template>
  <div class="card flex-col flex items-stretch">
    <div class="flex gap-2" v-if="attributeItemBoundGroups[menuAttributeItem.id!]">
      <span class="text-xs rounded-xl py-0.5 px-2 bg-gray-body text-white"
        v-for="attributeGroupId of attributeItemBoundGroups[menuAttributeItem.id!]" :key="attributeGroupId">{{
          menuAttributeGroupsMap[attributeGroupId].languageInfo[props.defaultLanguage].name }}</span>
    </div>
    <div class="w-full flex flex-1 items-center gap-2 mb-2">
      <Popper hover arrow closeDelay="100">
        <button class="text-gray-body btn-action gray p-1" @click="$event.stopPropagation()">
          <span class="mdi mdi-dots-vertical text-xl"></span>
        </button>
        <template #content>
          <div
            class="border-gray-200 z-90 w-44 -mt-2 text-base list-none rounded-default divide-y border divide-gray-100 shadow-default bg-white dark:bg-gray-800 dark:border-gray-800">
            <ul class="py-1" aria-labelledby="dropdownButton">
              <li
                class="cursor-pointer px-3 py-2 text-base hover:text-red-pnp font-semibold text-gray-500 hover:bg-gray-100 transition-colors duration-150">
                <button class="py-1 px-3" @click="emits('remove:menuAttributeItem', menuAttributeItemLocal)">
                  <span class="mdi mdi-delete mr-2"></span>
                  <span>{{ $tc('delete') }}</span>
                </button>
              </li>
            </ul>
          </div>
        </template>
      </Popper>
      <FormBuilder :is-loading="isLoading" v-model="menuAttributeItemLocal"
        @update:model-value="$emit('update:menuAttributeItem', menuAttributeItemLocal)"
        :fields-groups="attributeItemFieldsGroups">
      </FormBuilder>
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
                  :filter-fn="(item, query) => LabelTypeEnum[item].toString().toLowerCase().includes(query.toLowerCase())">
                  <template v-slot:name="{ item } : { item: any }">
                    {{ $tc(`LabelTypeEnum.${LabelTypeEnum[item]}`) }}
                  </template>
                </TableBuilder>
              </div>
            </label>
          </div>
        </div>
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
          :items="menuAttributeItemLocal.inventoryProducts" :columns="menuItemIngredientsColumnDefinition">
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
            {{ $tc(
              ProductMeasureUnitTypeEnum[inventoryProductsMap[item.id].product!.productMeasureUnitTypeId])
            }}
          </template>
          <template v-slot:delete="{ item } : { item: any }">
            <span class="mdi mdi-delete" @click="onRemoveInventoryProduct(item.id)"></span>
          </template>
        </TableBuilder>
      </Collapse>
      <Collapse title="margins" :is-last="true">
        <ProductMarginVisualizer :products-allocation="menuAttributeItemLocal.inventoryProducts"
          :inventory-products-map="inventoryProductsMap" :price="menuAttributeItemLocal.price"
          :tax-percentage="menuAttributeItemLocal.taxPercentage" />
      </Collapse>
    </div>
  </div>
</template>
