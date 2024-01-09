<script setup lang="ts">
import { Ref, ref, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { PaginatedResultOfTransactionViewModel, PaymentProviderEnum, ReferenceTypeEnum, TransactionSearchRequest, TransactionTypeEnum, TransactionViewModel } from '../services/api.client'
import { apiClient } from '../services/api'
import { getVariableName, pageContentHeight, pageContentHeightPx } from '../services/utils'
import TableBuilder from '../components/ui/TableBuilder.vue'
import { numberFormatter } from '../services/number.formatter'
import { notifier } from '../services/notification'
import { nameof } from 'ts-simple-nameof'
import { TableBuilderFieldDefinition } from '../components/ui/types'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'

const isLoading = ref(false)
const transactionResponse: Ref<PaginatedResultOfTransactionViewModel | undefined> = ref(undefined)
const transactionSearchRequest = ref(new TransactionSearchRequest())
const toast = useToast()

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const loadTransactions = async (pageIdx = 0, pageSize = 10) => {
  isLoading.value = true
  transactionSearchRequest.value.pageIdx = pageIdx
  transactionSearchRequest.value.pageSize = pageSize
  try {
    transactionResponse.value = await apiClient.restaurantTransactions(props.restaurantId, transactionSearchRequest.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'history')
  }
  isLoading.value = false
}

onMounted(() => {
  loadTransactions()
})

const columnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<TransactionViewModel>(m => m.id)]: {
    type: 'id',
    name: '@'
  },
  [nameof<TransactionViewModel>(m => m.transactionTypeId)]: {
    type: 'enum',
    name: 'transactionType',
    enumValue: TransactionTypeEnum,
    enumName: 'TransactionTypeEnum'
  },
  [nameof<TransactionViewModel>(m => m.referenceTypeId)]: {
    type: 'enum',
    name: 'referenceType',
    enumValue: ReferenceTypeEnum,
    enumName: 'ReferenceTypeEnum'
  },
  [nameof<TransactionViewModel>(m => m.amount)]: {
    type: 'slot',
    name: '@'
  },
  [nameof<TransactionViewModel>(m => m.paymentProviderId)]: {
    type: 'enum',
    enumValue: PaymentProviderEnum,
    enumName: 'PaymentProviderEnum',
    name: 'paymentProvider'
  },
  [nameof<TransactionViewModel>(m => m.createdAt)]: {
    type: 'date',
    name: '@'
  }
})

</script>
<template>
  <div class="w-full">

    <ScrollableDiv class="page-content" :height="pageContentHeight">
      <TableBuilder :columns="columnDefinition" :items="transactionResponse?.items ?? []"
        :total-pages="transactionResponse?.totalPages" :total-records="transactionResponse?.totalRecords"
        :is-loading="isLoading" :change-page-callback="loadTransactions" :show-pages="true">
        <template v-slot:amount="{ item } : { item: any }">
          {{ numberFormatter.currency(item.amount, item.currency) }}
        </template>
        <template v-slot:feesAmount="{ item } : { item: any }">
          {{ numberFormatter.currency(item.feesAmount, item.currency) }}
        </template>
      </TableBuilder>
    </ScrollableDiv>
  </div>
</template>
