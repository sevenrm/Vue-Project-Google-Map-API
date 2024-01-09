<script lang="ts" setup>
import { nameof } from 'ts-simple-nameof'
import { onMounted, Ref, ref } from 'vue'
import { apiClient } from '../services/api'
import { BaseSearchRequest, InventoryProductCategoryViewModel, InventoryProductViewModel, ProductMeasureUnitTypeEnum, PaginatedResultOfInventoryProductStockRecordViewModel, InventoryProductStockRecordViewModel, InventoryProductStockRecordTypeEnum } from '../services/api.client'
import InventoryProductModal from '../components/inventory/InventoryProductModal.vue'
import InventoryProductStockRecordModal from '../components/inventory/InventoryProductStockRecordModal.vue'
import FormBuilder from '../components/ui/FormBuilder.vue'
import TableBuilder from '../components/ui/TableBuilder.vue'
import { notifier } from '../services/notification'
import { FormBuilderFieldGroupDefinition, TableBuilderFieldDefinition } from '../components/ui/types'
import { clone, getVariableName, pageContentHeight, pageContentHeightPx } from '../services/utils'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  restaurantId: {
    type: String,
    required: true
  }
})

const newRecordModalVisible = ref(false)
const isLoading = ref(false)
const product: Ref<InventoryProductViewModel | undefined> = ref(undefined)
const historyResponse: Ref<PaginatedResultOfInventoryProductStockRecordViewModel | undefined> = ref(undefined)
const historySearchRequest = ref(new BaseSearchRequest())
const categoriesMap: Ref<Record<string, InventoryProductCategoryViewModel>> = ref({})
const editInventoryProduct: Ref<InventoryProductViewModel | undefined> = ref(undefined)

const loadProduct = async () => {
  isLoading.value = true
  try {
    product.value = await apiClient.inventoryProductGet(props.restaurantId, props.id)
  } catch (error) {
    notifier.notifyError('loading', error, 'product')
  }
  isLoading.value = false
}

const loadProductHistory = async (pageIdx = 0, pageSize = 10) => {
  isLoading.value = true
  try {
    historySearchRequest.value.pageIdx = pageIdx
    historySearchRequest.value.pageSize = pageSize
    historyResponse.value = await apiClient.inventoryProductHistory(props.restaurantId, props.id, historySearchRequest.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'productHistory')
  }
  isLoading.value = false
}

const loadCategories = async () => {
  try {
    const categories = await apiClient.inventoryCategoriesGet(props.restaurantId)
    categoriesMap.value = categories.reduce((map, category) => ({ ...map, [category.id!]: category }), {})
  } catch (error) {
    notifier.notifyError('loading', error, 'inventoryCategories')
  }
}

const editProduct = () => {
  editInventoryProduct.value = clone(product.value)
}

onMounted(() => {
  loadProduct()
  loadProductHistory()
  loadCategories()
})

const columnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<InventoryProductStockRecordViewModel>(m => m.convertedQuantity)]: {
    type: 'string',
    name: '@'
  },
  [nameof<InventoryProductStockRecordViewModel>(m => m.deliveredAt)]: {
    type: 'date',
    name: '@'
  },
  [nameof<InventoryProductStockRecordViewModel>(m => m.quantity)]: {
    type: 'string',
    name: '@'
  },
  [nameof<InventoryProductStockRecordViewModel>(m => m.errorPercentage)]: {
    type: 'string',
    name: '@'
  },
  [nameof<InventoryProductStockRecordViewModel>(m => m.inventoryProductStockRecordTypeId)]: {
    type: 'enum',
    enumValue: InventoryProductStockRecordTypeEnum,
    enumName: 'InventoryProductStockRecordTypeEnum',
    name: 'recordType'
  },
  [nameof<InventoryProductStockRecordViewModel>(m => m.createdAt)]: {
    type: 'date',
    name: '@'
  }
})

const productFieldsGroup = ref<FormBuilderFieldGroupDefinition[]>([
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
      enumValue: ProductMeasureUnitTypeEnum,
      enumName: 'ProductMeasureUnitTypeEnum',
      name: 'measure'
    },
    [nameof<InventoryProductViewModel>(m => m.wastePercentage)]: {
      type: 'text',
      name: '@'
    },
    [nameof<InventoryProductViewModel>(m => m.currentQuantity)]: {
      type: 'text',
      name: '@'
    },
    [nameof<InventoryProductViewModel>(m => m.referencePrice)]: {
      type: 'currency',
      name: '@'
    },
    [nameof<InventoryProductViewModel>(m => m.categoryId)]: {
      type: 'slot',
      name: 'category'
    }
  }
])

</script>
<template>
  <InventoryProductStockRecordModal :restaurant-id="restaurantId" @closed="newRecordModalVisible = false"
    @saved="loadProductHistory()" :product-id="id" :measure-id="product?.product?.productMeasureUnitTypeId"
    v-if="newRecordModalVisible">
  </InventoryProductStockRecordModal>
  <InventoryProductModal :restaurant-id="restaurantId" :categories-map="categoriesMap" :product="editInventoryProduct"
    v-if="editInventoryProduct" @closed="editInventoryProduct = undefined"
    @deleted="editInventoryProduct = undefined; loadProduct()" @saved="editInventoryProduct = undefined; loadProduct()">
  </InventoryProductModal>
  <ScrollableDiv class="page-content flex flex-col gap-2" :height="pageContentHeight">
    <div class="card p-6 relative">
      <button class="absolute top-3 right-4" @click="editProduct()">
        <span class="mdi mdi-pencil"></span>
      </button>
      <FormBuilder :fields-groups="productFieldsGroup" :is-loading="false" :model-value="product" :readonly="true">
        <template v-slot:categoryId="{ item } : { item: any }">
          <div>
            <span class="p-1 rounded-lg text-sm font-semibold px-2 custom-label" v-if="item"
              :class="{ 'text-white': categoriesMap[item.categoryId]?.lightText }"
              :style="{ 'background': categoriesMap[item.categoryId]?.colorCode }">{{
                categoriesMap[item.categoryId]?.name
              }}</span>
          </div>
        </template>
      </FormBuilder>
    </div>
    <TableBuilder :items="historyResponse?.items ?? []" :total-pages="historyResponse?.totalPages"
      :total-records="historyResponse?.totalRecords" :is-loading="isLoading" :change-page-callback="loadProductHistory"
      :show-pages="true" :columns="columnDefinition">
      <template v-slot:action-buttons-left>
        <div class="flex items-center flex-1 w-full">
          <button class="btn-action primary-fill" @click="newRecordModalVisible = true">
            <span class="mdi mdi-plus"></span>
            <span>{{ $tc('newRecord') }}</span>
          </button>
        </div>
      </template>
    </TableBuilder>
  </ScrollableDiv>
</template>
