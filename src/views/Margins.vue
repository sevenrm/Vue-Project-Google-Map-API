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
const isLoading = ref(false)
const marginsResponse: Ref<PaginatedResultOfInventoryProductViewModel | undefined> = ref(undefined)
const marginsSearchRequest = ref(new InventoryProductSearchRequest())

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const loadProducts = async (pageIdx = 0, pageSize = 10) => {
  isLoading.value = true
  marginsSearchRequest.value.pageIdx = pageIdx
  marginsSearchRequest.value.pageSize = pageSize
  try {
    marginsResponse.value = await apiClient.inventorySearch(props.restaurantId, marginsSearchRequest.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'inventoryProducts')
  }
  isLoading.value = false
}

onMounted(() => {
  loadProducts()
})

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

</script>
<template>
  <div class="w-full">

    <ScrollableDiv class="page-content flex flex-col gap-2" :height="pageContentHeight">
      <div>
        <TableBuilder :items="marginsResponse?.items ?? []" :total-pages="marginsResponse?.totalPages"
          :total-records="marginsResponse?.totalRecords" :is-loading="isLoading" :change-page-callback="loadProducts"
          :show-pages="true" :columns="productsColumnDefinition"
          @clicked="router.push({ name: 'margins-details', params: { id: $event.id } })">
        </TableBuilder>
      </div>
    </ScrollableDiv>
  </div>
</template>
