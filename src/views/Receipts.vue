<script setup lang="ts">
import { Ref, ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { OrderTypeEnum, PaginatedResultOfReceiptViewModel, PaginatedResultOfTransactionViewModel, PaymentProviderEnum, ReceiptSearchRequest, ReceiptViewModel, ReferenceTypeEnum, TransactionSearchRequest, TransactionTypeEnum, TransactionViewModel } from '../services/api.client'
import { apiClient } from '../services/api'
import { getVariableName, pageContentHeight, pageContentHeightPx } from '../services/utils'
import TableBuilder from '../components/ui/TableBuilder.vue'
import { numberFormatter } from '../services/number.formatter'
import { notifier } from '../services/notification'
import { nameof } from 'ts-simple-nameof'
import { FormBuilderFieldGroupDefinition, ModalSize, TableBuilderFieldDefinition } from '../components/ui/types'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'
import FormBuilder from '../components/ui/FormBuilder.vue'
import ReceiptModal from '../components/orders/ReceiptModal.vue'

const isLoading = ref(false)
const receiptResponse: Ref<PaginatedResultOfReceiptViewModel | undefined> = ref(undefined)
const receiptSearchRequest = ref(new ReceiptSearchRequest())
const currentReceipt = ref<ReceiptViewModel | undefined>()

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const loadReceipts = async (pageIdx = 0, pageSize = 10) => {
  isLoading.value = true
  receiptSearchRequest.value.pageIdx = pageIdx
  receiptSearchRequest.value.pageSize = pageSize
  try {
    if (!receiptSearchRequest.value.amountFrom)
      receiptSearchRequest.value.amountFrom = undefined
    if (!receiptSearchRequest.value.amountTo)
      receiptSearchRequest.value.amountTo = undefined
    receiptResponse.value = await apiClient.receipts(props.restaurantId, receiptSearchRequest.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'history')
  }
  isLoading.value = false
}

onMounted(() => {
  loadReceipts()
})

const columnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<ReceiptViewModel>(m => m.id)]: {
    type: 'id',
    name: '@'
  },
  [nameof<ReceiptViewModel>(m => m.amount)]: {
    type: 'currency',
    name: '@'
  },
  [nameof<ReceiptViewModel>(m => m.paymentProviderId)]: {
    type: 'enum',
    enumValue: PaymentProviderEnum,
    enumName: 'PaymentProviderEnum',
    name: 'paymentProvider'
  },
  [nameof<ReceiptViewModel>(m => m.createdAt)]: {
    type: 'date',
    name: '@'
  }
})

const searchFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    '[class]': 'grid grid-cols-3 gap-2',
    [nameof<ReceiptSearchRequest>(m => m.dateFrom)]: {
      type: 'date',
      name: '@'
    },
    [nameof<ReceiptSearchRequest>(m => m.dateTo)]: {
      type: 'date',
      name: '@'
    },
    [nameof<ReceiptSearchRequest>(m => m.id)]: {
      type: 'text',
      name: '@'
    },
    [nameof<ReceiptSearchRequest>(m => m.amountFrom)]: {
      type: 'number',
      name: '@'
    },
    [nameof<ReceiptSearchRequest>(m => m.amountTo)]: {
      type: 'number',
      name: '@'
    },
    [nameof<ReceiptSearchRequest>(m => m.paymentProviderId)]: {
      type: 'enum',
      name: 'paymentProvider',
      enumValue: PaymentProviderEnum,
      enumName: 'PaymentProviderEnum'
    }
  }
])

</script>
<template>
  <div class="w-full">
    <ReceiptModal :restaurant-id="restaurantId"
      @update:receipt="loadReceipts(receiptSearchRequest.pageIdx, receiptSearchRequest.pageSize)"
      v-model:receipt="currentReceipt" v-model:is-loading="isLoading" @close="currentReceipt = undefined">
    </ReceiptModal>
    <ScrollableDiv class="page-content" :height="pageContentHeight">
      <TableBuilder :columns="columnDefinition" :items="receiptResponse?.items ?? []" @clicked="currentReceipt = $event"
        :total-pages="receiptResponse?.totalPages" :total-records="receiptResponse?.totalRecords" :is-loading="isLoading"
        :change-page-callback="loadReceipts" :show-pages="true">
        <template v-slot:head>
          <FormBuilder :is-loading="isLoading" :fields-groups="searchFieldsGroups" v-model="receiptSearchRequest">
          </FormBuilder>
        </template>
      </TableBuilder>
    </ScrollableDiv>
  </div>
</template>
