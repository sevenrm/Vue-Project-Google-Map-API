<script setup lang="ts">
import { Ref, ref, onMounted } from 'vue'
import { apiClient } from '../services/api'
import { pageContentHeight } from '../services/utils'
import TableBuilder from '../components/ui/TableBuilder.vue'
import { notifier } from '../services/notification'
import { nameof } from 'ts-simple-nameof'
import { DocumentSearchRequest, DocumentTypeEnum, InvoiceViewModel, PaginatedResultOfRestaurantDocumentViewModel, RestaurantDocumentViewModel, StoreFullViewModel } from '../services/api.client'
import { TableBuilderFieldDefinition } from '../components/ui/types'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'
import InvoiceBuilderModal from '../components/documents/InvoiceBuilderModal.vue'
import PdfViewerModal from '../components/documents/PdfViewerModal.vue'
import { store } from '../services/store'

const invoiceResponse: Ref<PaginatedResultOfRestaurantDocumentViewModel | undefined> = ref(undefined)
const documentSearchRequest = ref(new DocumentSearchRequest())
const isLoading = ref(false)

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const loadInvoices = async (pageIdx = 0, pageSize = 10) => {
  isLoading.value = true
  documentSearchRequest.value.pageIdx = pageIdx
  documentSearchRequest.value.pageSize = pageSize
  try {
    invoiceResponse.value = await apiClient.documentSearch(props.restaurantId, documentSearchRequest.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'documents')
  }
  isLoading.value = false
}

const openInvoice = async (restaurantDocumentId: string) => {
  try {
    isLoading.value = true
    const file = await apiClient.documentDownload(props.restaurantId, restaurantDocumentId!)
    pdfContent.value = file.data
  } catch (error) {
    notifier.notifyError('downloading', error, 'file')
  }
  isLoading.value = false
}

const restaurant = ref<StoreFullViewModel | undefined>()
const loadRestaurant = async () => {
  try {
    restaurant.value = await apiClient.restaurantFull(props.restaurantId)
  } catch (error) {
    notifier.notifyError('loading', error, 'restaurant')
  }
}

const createInvoice = () => {
  newInvoiceModalVisible.value = true
  if (!restaurant.value)
    loadRestaurant()
}

onMounted(() => {
  loadInvoices()
})

const columnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<RestaurantDocumentViewModel>(m => m.id)]: {
    type: 'id',
    name: '@'
  },
  [nameof<RestaurantDocumentViewModel>(m => m.document!.documentTypeId)]: {
    type: 'enum',
    enumValue: DocumentTypeEnum,
    enumName: 'DocumentTypeEnum',
    name: 'documentType'
  },
  [nameof<RestaurantDocumentViewModel>(m => m.amount)]: {
    type: 'currency',
    name: '@'
  },
  [nameof<RestaurantDocumentViewModel>(m => m.document!.documentDate)]: {
    type: 'date',
    name: '@'
  },
  action: {
    type: 'slot',
    name: ''
  }
})
const saveInvoice = async (invoice: InvoiceViewModel) => {
  isLoading.value = true
  try {
    const file = await apiClient.documentInvoice(props.restaurantId!, invoice)
    newInvoiceModalVisible.value = false
    pdfContent.value = file.data
  } catch (error) {
    notifier.notifyError('creating', error, 'invoice')
  }
  isLoading.value = false
}

const newInvoiceModalVisible = ref(false)
const pdfContent = ref()

</script>
<template>
  <div class="w-full">
    <PdfViewerModal :data="pdfContent" @close="pdfContent = undefined"></PdfViewerModal>
    <InvoiceBuilderModal :is-loading="isLoading" v-if="newInvoiceModalVisible && restaurant" :restaurant="restaurant"
      @close="newInvoiceModalVisible = false" @save="saveInvoice"></InvoiceBuilderModal>
    <ScrollableDiv class="page-content" :height="pageContentHeight">
      <TableBuilder :columns="columnDefinition" :items="invoiceResponse?.items ?? []"
        :total-pages="invoiceResponse?.totalPages" :total-records="invoiceResponse?.totalRecords"
        :is-loading="!!isLoading" :change-page-callback="loadInvoices" :show-pages="true">
        <template v-slot:action-buttons-left>
          <div class="flex items-center flex-1 w-full" v-if="store.isUserAdmin()">
            <button class="btn-action primary-fill" @click="createInvoice">
              <span class="mdi mdi-plus"></span>
              <span>{{ $tc('add') }}</span>
            </button>
          </div>
        </template>
        <template v-slot:action="{ item } : { item: any }">
          <button class="btn-primary" @click="openInvoice(item.id)">PDF</button>
        </template>
      </TableBuilder>
    </ScrollableDiv>
  </div>
</template>
