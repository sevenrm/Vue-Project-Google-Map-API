<script lang="ts" setup>
import { onMounted, Ref, ref } from 'vue'
import { apiClient } from '../services/api'
import TableBuilder from '../components/ui/TableBuilder.vue'
import { notifier } from '../services/notification'
import { clone, getVariableName, pageContentHeight, pageContentHeightPx } from '../services/utils'
import { nameof } from 'ts-simple-nameof'
import { useRouter } from 'vue-router'
import { AddressViewModel, CompanyViewModel, PaginatedResultOfSupplierViewModel, SupplierCategoryTypeEnum, SupplierSearchRequest, SupplierViewModel } from '../services/api.client'
import SupplierModal from '../components/suppliers/SupplierModal.vue'
import { TableBuilderFieldDefinition } from '../components/ui/types'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const router = useRouter()
const isLoading = ref(false)
const supplierResponse: Ref<PaginatedResultOfSupplierViewModel | undefined> = ref(undefined)
const supplierSearchRequest = ref(new SupplierSearchRequest())
const selectedSupplierModal: Ref<SupplierViewModel | undefined> = ref(undefined)

const loadSuppliers = async (pageIdx = 0, pageSize = 10) => {
  isLoading.value = true
  supplierSearchRequest.value.pageIdx = pageIdx
  supplierSearchRequest.value.pageSize = pageSize
  try {
    supplierResponse.value = await apiClient.restaurantsupplierSearch(props.restaurantId, supplierSearchRequest.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'suppliers')
  }
  isLoading.value = false
}

onMounted(() => {
  loadSuppliers()
})

const addNewSupplier = () => {
  selectedSupplierModal.value = SupplierViewModel.fromJS({ company: CompanyViewModel.fromJS({ registeredAddress: new AddressViewModel(), contacts: [] }) })!
}

const suppliersColumnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<SupplierViewModel>(m => m.id)]: {
    type: 'id',
    name: '@'
  },
  [nameof<SupplierViewModel>(m => m.name)]: {
    type: 'string',
    name: '@'
  },
  [nameof<SupplierViewModel>(m => m.labels)]: {
    type: 'string',
    name: '@'
  },
  [nameof<SupplierViewModel>(m => m.supplierCategoryId)]: {
    type: 'enum',
    enumValue: SupplierCategoryTypeEnum,
    enumName: 'SupplierCategoryTypeEnum',
    name: '@'
  },

  edit: {
    type: 'slot'
  }
})

</script>
<template>
  <div class="w-full">
    <SupplierModal @close="selectedSupplierModal = undefined" :restaurant-id="restaurantId"
      :supplier="selectedSupplierModal!" @saved="loadSuppliers">
    </SupplierModal>
    <ScrollableDiv class="page-content flex flex-col gap-2" :height="pageContentHeight">
      <div>
        <TableBuilder :items="supplierResponse?.items ?? []" :total-pages="supplierResponse?.totalPages"
          :total-records="supplierResponse?.totalRecords" :is-loading="isLoading" :change-page-callback="loadSuppliers"
          :show-pages="true" :columns="suppliersColumnDefinition"
          @clicked="router.push({ name: 'supplier-details', params: { id: $event.id } })">
          <template v-slot:action-buttons-left>
            <div class="flex items-center flex-1 w-full">
              <button class="btn-action primary-fill" @click="addNewSupplier()">
                <span class="mdi mdi-plus"></span>
                <span>{{ $tc('add') }}</span>
              </button>
            </div>
          </template>
          <template v-slot:edit="{ item } : { item: any }">
            <button @click="selectedSupplierModal = clone(item)"><span class="mdi mdi-pencil"></span></button>
          </template>
        </TableBuilder>
      </div>
    </ScrollableDiv>
  </div>
</template>
