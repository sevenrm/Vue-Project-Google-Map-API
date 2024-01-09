<script lang="ts" setup>
import { onMounted, Ref, ref } from 'vue'
import { apiClient } from '../services/api'
import { InventoryProductSearchRequest, PaginatedResultOfInventoryProductViewModel, InventoryProductViewModel, ProductMeasureUnitTypeEnum, InventoryProductCategoryViewModel, SupplierProductViewModel } from '../services/api.client'
import Collapse from '../components/ui/Collapse.vue'
import FormBuilder from '../components/ui/FormBuilder.vue'
import Modal from '../components/ui/Modal.vue'
import TableBuilder from '../components/ui/TableBuilder.vue'
import { notifier } from '../services/notification'
import { clone, getVariableName, pageContentHeight, pageContentHeightPx } from '../services/utils'
import { nameof } from 'ts-simple-nameof'
import InventoryProductModal from '../components/inventory/InventoryProductModal.vue'
import { useRouter } from 'vue-router'
import InventoryProductStockRecordModal from '../components/inventory/InventoryProductStockRecordModal.vue'
import { FormBuilderFieldGroupDefinition, TableBuilderFieldDefinition } from '../components/ui/types'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'

const router = useRouter()
const newRecordModalVisible = ref(false)
const isLoading = ref(false)
const inventoryResponse: Ref<PaginatedResultOfInventoryProductViewModel | undefined> = ref(undefined)
const inventorySearchRequest = ref(new InventoryProductSearchRequest())
const categoriesMap: Ref<Record<string, InventoryProductCategoryViewModel>> = ref({})
const selectedCategory: Ref<InventoryProductCategoryViewModel | undefined> = ref(undefined)
const selectedInventoryProduct: Ref<InventoryProductViewModel | undefined> = ref(undefined)

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const loadProducts = async (pageIdx = 0, pageSize = 10) => {
  isLoading.value = true
  inventorySearchRequest.value.pageIdx = pageIdx
  inventorySearchRequest.value.pageSize = pageSize
  try {
    inventoryResponse.value = await apiClient.inventorySearch(props.restaurantId, inventorySearchRequest.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'inventoryProducts')
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

const saveCategory = async () => {
  isLoading.value = true
  try {
    await apiClient.inventoryCategory(props.restaurantId, selectedCategory.value!)
    selectedCategory.value = undefined
    loadCategories()
  } catch (error) {
    notifier.notifyError('saving', error, 'inventoryCategory')
  }
  isLoading.value = false
}

const deleteCategory = async () => {

}

onMounted(() => {
  loadCategories()
  loadProducts()
})

const addNewProduct = () => {
  selectedInventoryProduct.value = InventoryProductViewModel.fromJS({ product: new SupplierProductViewModel() })!
}

const addNewCategory = () => {
  selectedCategory.value = new InventoryProductCategoryViewModel()
}

const productsColumnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<InventoryProductViewModel>(m => m.id)]: {
    type: 'id',
    name: '@'
  },
  [nameof<InventoryProductViewModel>(m => m.product!.name)]: {
    type: 'string',
    name: '@'
  },
  [nameof<InventoryProductViewModel>(m => m.currentQuantity)]: {
    type: 'string',
    name: '@'
  },
  [nameof<InventoryProductViewModel>(m => m.lastPrice)]: {
    type: 'string',
    name: '@'
  },
  [nameof<InventoryProductViewModel>(m => m.product!.productMeasureUnitTypeId)]: {
    type: 'enum',
    name: 'measure',
    enumValue: ProductMeasureUnitTypeEnum,
    enumName: 'ProductMeasureUnitTypeEnum'
  },
  [nameof<InventoryProductViewModel>(m => m.categoryId)]: {
    type: 'slot',
    name: 'category'
  },
  edit: {
    type: 'slot'
  }
})

const inventoryCategoryFieldGroup = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<InventoryProductCategoryViewModel>(m => m.name)]: {
      type: 'text',
      name: '@'
    },
    [nameof<InventoryProductCategoryViewModel>(m => m.colorCode)]: {
      type: 'color',
      name: '@'
    },
    [nameof<InventoryProductCategoryViewModel>(m => m.lightText)]: {
      type: 'toggle',
      name: '@'
    }
  } as FormBuilderFieldGroupDefinition
])

const categoriesColumnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<InventoryProductCategoryViewModel>(m => m.name)]: {
    type: 'string',
    name: '@'
  },
  [nameof<InventoryProductCategoryViewModel>(m => m.colorCode)]: {
    type: 'string',
    name: '@'
  },
  [nameof<InventoryProductCategoryViewModel>(m => m.lightText)]: {
    type: 'string',
    name: '@'
  },
  edit: {
    type: 'slot'
  }
})

</script>
<template>
  <div class="w-full">
    <InventoryProductStockRecordModal :restaurant-id="restaurantId" @closed="newRecordModalVisible = false"
      @saved="loadProducts()" v-if="newRecordModalVisible"></InventoryProductStockRecordModal>
    <InventoryProductModal :restaurant-id="restaurantId" :categories-map="categoriesMap"
      :product="selectedInventoryProduct" v-if="selectedInventoryProduct" @closed="selectedInventoryProduct = undefined"
      @deleted="selectedInventoryProduct = undefined; loadProducts()"
      @saved="selectedInventoryProduct = undefined; loadProducts()"></InventoryProductModal>
    <Modal v-if="selectedCategory" :is-loading="isLoading" @close="selectedCategory = undefined"
      :action-buttons="[{ text: 'confirm', colorClass: 'success-fill', iconName: 'content-save', action: () => saveCategory() },
      ...(selectedCategory.id ? [{ text: 'delete', iconName: 'delete', colorClass: 'danger', action: () => deleteCategory() }] : [])]">
      <template v-slot:content>
        <div>
          <FormBuilder :is-loading="isLoading" v-model="selectedCategory" :fields-groups="inventoryCategoryFieldGroup">
          </FormBuilder>
        </div>
      </template>
    </Modal>

    <ScrollableDiv class="page-content flex flex-col gap-2" :height="pageContentHeight">
      <div>
        <div class="card pt-0 pb-0">
          <Collapse title="categories" class="-mx-2" :is-first="true" :is-last="true">
            <TableBuilder :items="Object.values(categoriesMap)" :is-loading="isLoading" :fixed-page-size="10"
              :columns="categoriesColumnDefinition">
              <template v-slot:action-buttons-left>
                <div class="flex items-center flex-1 w-full">
                  <button class="btn-action primary-fill" @click="addNewCategory">
                    <span class="mdi mdi-plus"></span>
                    <span>{{ $tc('add') }}</span>
                  </button>
                </div>
              </template>
              <template v-slot:edit="{ item } : { item: any }">
                <button @click="$event.stopPropagation(); selectedCategory = clone(item)"><span
                    class="mdi mdi-pencil"></span></button>
              </template>
            </TableBuilder>
          </Collapse>
        </div>
      </div>
      <div>
        <h1 class="page-subtitle my-2">{{ $tc('products') }}</h1>
        <TableBuilder :items="inventoryResponse?.items ?? []" :total-pages="inventoryResponse?.totalPages"
          :total-records="inventoryResponse?.totalRecords" :is-loading="isLoading" :change-page-callback="loadProducts"
          :show-pages="true" :columns="productsColumnDefinition"
          @clicked="router.push({ name: 'inventory-details', params: { id: $event.id } })">
          <template v-slot:action-buttons-left>
            <div class="flex items-center flex-1 w-full">
              <button class="btn-action primary-fill" @click="addNewProduct">
                <span class="mdi mdi-plus"></span>
                <span>{{ $tc('add') }}</span>
              </button>
              <button class="btn-action primary-fill" @click="newRecordModalVisible = true">
                <span class="mdi mdi-plus"></span>
                <span>{{ $tc('newRecord') }}</span>
              </button>
            </div>
          </template>
          <template v-slot:categoryId="{ item } : { item: any }">
            <span class="p-1 rounded-lg text-sm font-semibold px-2"
              :class="{ 'text-white': categoriesMap[item.categoryId]?.lightText }"
              :style="{ 'background': categoriesMap[item.categoryId]?.colorCode }">{{
                categoriesMap[item.categoryId]?.name
              }}</span>
          </template>
          <template v-slot:edit="{ item } : { item: any }">
            <button @click="$event.stopPropagation(); selectedInventoryProduct = clone(item)"><span
                class="mdi mdi-pencil"></span></button>
          </template>
        </TableBuilder>
      </div>
    </ScrollableDiv>
  </div>
</template>
