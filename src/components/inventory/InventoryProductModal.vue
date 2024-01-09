<script lang="ts" setup>
import { nameof } from 'ts-simple-nameof'
import { useForm } from 'vee-validate'
import { PropType, Ref, ref, watch } from 'vue'
import { apiClient } from '../../services/api'
import { AddressViewModel, CompanyViewModel, InventoryProductCategoryViewModel, InventoryProductViewModel, ProductMeasureUnitTypeEnum, SelectOptionViewModel, SupplierViewModel } from '../../services/api.client'
import { notifier } from '../../services/notification'
import { FormBuilderFieldGroupDefinition } from '../../components/ui/types'
import SupplierModal from '../suppliers/SupplierModal.vue'
import FormBuilder from '../ui/FormBuilder.vue'
import Modal from '../ui/Modal.vue'

useForm()
const isLoading = ref(false)
const props = defineProps({
  categoriesMap: {
    type: Object as PropType<Record<string, InventoryProductCategoryViewModel>>,
    required: true
  },
  product: {
    type: Object as PropType<InventoryProductViewModel>,
    default: new InventoryProductViewModel()
  },
  restaurantId: {
    type: String,
    required: true
  },
  supplierId: String
})

const emits = defineEmits(['saved', 'deleted', 'closed', 'update:product'])
const selectedSupplierModal: Ref<SupplierViewModel | undefined> = ref(undefined)
const localSupplierId = ref(props.supplierId)

watch(() => props.supplierId, () => localSupplierId.value = props.supplierId)

const fetchSuppliers = async (query: string) => {
  let options: SelectOptionViewModel[] = []

  try {
    options = await apiClient.restaurantsupplierAutocomplete(props.restaurantId, query)
  } catch (error) {
    notifier.notifyError('loading', error, 'products')
  }
  return options
}

const inventoryProductFieldGroup = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<InventoryProductViewModel>(m => m.product!.name)]: {
      type: 'text',
      name: '@'
    },
    [nameof<InventoryProductViewModel>(m => m.product!.sku)]: {
      type: 'text',
      name: '@'
    },
    [nameof<InventoryProductViewModel>(m => m.product!.productMeasureUnitTypeId)]: {
      type: 'enum',
      name: 'measure',
      enumValue: ProductMeasureUnitTypeEnum,
      enumName: 'ProductMeasureUnitTypeEnum'
    },
    [nameof<InventoryProductViewModel>(m => m.categoryId)]: {
      type: 'select',
      name: 'category',
      optionLabel: 'label',
      optionValue: 'value',
      options: () => [{ label: '' }, ...Object.keys(props.categoriesMap).map(k => ({ value: k, label: props.categoriesMap[k].name }))]
    },
    [nameof<InventoryProductViewModel>(m => m.wastePercentage)]: {
      type: 'percentage',
      name: '@'
    },
    [nameof<InventoryProductViewModel>(m => m.referencePrice)]: {
      type: 'currency',
      name: '@'
    },
    [nameof<InventoryProductViewModel>(m => m.product!.supplierId)]: {
      type: 'autocomplete',
      options: (query: string) => fetchSuppliers(query),
      name: 'supplier',
      if: () => !localSupplierId.value && !props.product?.id
    }
  } as FormBuilderFieldGroupDefinition
])

const deleteProduct = async () => {
  isLoading.value = true
  try {
    await apiClient.inventoryProductDelete(props.restaurantId, props.product.id!)
    emits('deleted')
    notifier.notifySuccess('deleted', 'inventoryProduct')
  } catch (error) {
    notifier.notifyError('deleting', error, 'inventoryProduct')
  }
  isLoading.value = false
}

const saveProduct = async () => {
  isLoading.value = true
  try {
    await apiClient.inventoryProductPut(props.restaurantId, props.product)
    emits('saved')
    notifier.notifySuccess('saved', 'inventoryProduct')
  } catch (error) {
    notifier.notifyError('saving', error, 'inventoryProduct')
  }
  isLoading.value = false
}

const addNewSupplier = () => {
  selectedSupplierModal.value = SupplierViewModel.fromJS({ company: CompanyViewModel.fromJS({ registeredAddress: new AddressViewModel(), contacts: [] }) })!
}

</script>
<template>
  <SupplierModal :restaurant-id="restaurantId" @close="selectedSupplierModal = undefined"
    :supplier="selectedSupplierModal!">
  </SupplierModal>
  <Modal v-if="product && !selectedSupplierModal" @close="$emit('closed')" :is-loading="isLoading"
    :title="!!product.id ? 'updateProduct' : 'createProduct'" :action-buttons="[
      { text: 'confirm', colorClass: 'success-fill', iconName: 'content-save', action: () => saveProduct() },
      ...(supplierId || product.id ? [] : [{ text: 'createSupplier', iconName: 'plus', colorClass: 'teal', action: () => addNewSupplier() }]),
      ...(product.id ? [{ text: 'delete', iconName: 'delete', colorClass: 'danger', action: () => deleteProduct() }] : [])
    ]">
    <template v-slot:content>
      <div>
        <FormBuilder :is-loading="isLoading" @update:model-value="$emit('update:product', $event)" :model-value="product"
          :fields-groups="inventoryProductFieldGroup">
        </FormBuilder>
      </div>
    </template>
  </Modal>
</template>
