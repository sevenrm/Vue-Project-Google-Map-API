<script lang="ts" setup>
import { nameof } from 'ts-simple-nameof'
import { computed, PropType, Ref, ref } from 'vue'
import { apiClient } from '../../services/api'
import { InventoryProductSelectOptionViewModel, InventoryProductStockRecordTypeEnum, InventoryProductStockRecordViewModel, ProductMeasureUnitTypeEnum } from '../../services/api.client'
import { notifier } from '../../services/notification'
import FormBuilder from '../ui/FormBuilder.vue'
import Modal from '../ui/Modal.vue'

const emits = defineEmits(['closed', 'saved'])
const props = defineProps({
  productId: String,
  measureId: Number as PropType<ProductMeasureUnitTypeEnum>,
  restaurantId: {
    type: String,
    required: true
  }
})

const isLoading = ref(false)
const newRecordModal: Ref<InventoryProductStockRecordViewModel> = ref(InventoryProductStockRecordViewModel.fromJS({ productMeasureUnitTypeId: props.measureId })!)

const saveRecord = async () => {
  isLoading.value = true
  try {
    if (props.productId)
      newRecordModal.value.inventoryProductId = props.productId
    await apiClient.inventoryStock(props.restaurantId, newRecordModal.value)
    emits('saved')
    emits('closed')
    notifier.notifySuccess('saving', 'record')
  } catch (error) {
    notifier.notifyError('saving', error, 'record')
  }
  isLoading.value = false
}

const productsMap: Ref<Record<string, InventoryProductSelectOptionViewModel>> = ref({})

const fetchProducts = async (query: string) => {
  let options: InventoryProductSelectOptionViewModel[] = []

  try {
    options = await apiClient.inventoryAutocomplete(props.restaurantId, query)
    productsMap.value = Object.assign(options.reduce((map, o) => ({ ...map, [o.value!]: o }), {}), productsMap.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'products')
  }
  return options
}

const currentProductMeasureId = computed(() => props.productId ? props.measureId : productsMap.value[newRecordModal.value.inventoryProductId ?? '']?.productMeasureUnitTypeId)

const inventoryRecordFieldGroups = ref([
  {
    [nameof<InventoryProductStockRecordViewModel>(m => m.quantity)]: {
      name: '@',
      type: 'number'
    },
    [nameof<InventoryProductStockRecordViewModel>(m => m.productMeasureUnitTypeId)]: {
      name: 'measureType',
      enumValue: ProductMeasureUnitTypeEnum,
      enumName: 'ProductMeasureUnitTypeEnum',
      type: 'enum'
    },
    [nameof<InventoryProductStockRecordViewModel>(m => m.convertedQuantity)]: {
      name: '@',
      type: 'number',
      prefix: (model: InventoryProductStockRecordViewModel) => ProductMeasureUnitTypeEnum[currentProductMeasureId.value!],
      if: (model: InventoryProductStockRecordViewModel) => model.productMeasureUnitTypeId !== currentProductMeasureId.value
    },
    [nameof<InventoryProductStockRecordViewModel>(m => m.deliveredAt)]: {
      name: '@',
      type: 'date'
    },
    [nameof<InventoryProductStockRecordViewModel>(m => m.errorPercentage)]: {
      name: '@',
      type: 'percentage'
    },
    [nameof<InventoryProductStockRecordViewModel>(m => m.notes)]: {
      name: '@',
      type: 'text'
    },
    [nameof<InventoryProductStockRecordViewModel>(m => m.inventoryProductStockRecordTypeId)]: {
      name: 'recordType',
      enumValue: InventoryProductStockRecordTypeEnum,
      enumName: 'InventoryProductStockRecordTypeEnum',
      type: 'enum'
    },
    [nameof<InventoryProductStockRecordViewModel>(m => m.inventoryProductId)]: {
      type: 'autocomplete',
      options: (query: string) => fetchProducts(query),
      name: 'product',
      if: () => !props.productId
    }
  }
])
</script>
<template>
  <Modal v-if="newRecordModal" @close="emits('closed')" :is-loading="isLoading" title="newRecord"
    :action-buttons="[{ text: 'confirm', colorClass: 'success-fill', iconName: 'content-save', action: () => saveRecord() }]">
    <template v-slot:content>
      <div>
        <FormBuilder :is-loading="isLoading" v-model="newRecordModal" :fields-groups="inventoryRecordFieldGroups">
        </FormBuilder>
      </div>
    </template>
  </Modal>
</template>
