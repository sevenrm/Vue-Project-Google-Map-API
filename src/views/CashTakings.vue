<script setup lang="ts">
import { Ref, ref, onMounted } from 'vue'
import { CashTakingSearchRequest, CashTakingViewModel, PaginatedResultOfCashTakingViewModel, StoreTransactionTypeEnum, RestaurantTransactionSearchRequest, PaginatedResultOfRestaurantTransactionViewModel, PaymentProviderEnum, ReceiptSearchRequest, ReceiptViewModel, RestaurantTransactionViewModel } from '../services/api.client'
import { apiClient } from '../services/api'
import { pageContentHeight } from '../services/utils'
import TableBuilder from '../components/ui/TableBuilder.vue'
import { notifier } from '../services/notification'
import { nameof } from 'ts-simple-nameof'
import { FormBuilderFieldGroupDefinition, ModalSize, TableBuilderFieldDefinition } from '../components/ui/types'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'
import FormBuilder from '../components/ui/FormBuilder.vue'
import ReceiptModal from '../components/orders/ReceiptModal.vue'
import Modal from '../components/ui/Modal.vue'
import Collapse from '../components/ui/Collapse.vue'
import NumericKeypad from '../components/orders/NumericKeypad.vue'
import { store } from '../services/store'
import { printCashTaking } from '../services/printer'
import { numberFormatter } from '../services/number.formatter'
import { useShowConfirm } from '../services/injections'

const showConfirm = useShowConfirm()

const isLoading = ref(false)
const cashTakingResponse: Ref<PaginatedResultOfCashTakingViewModel | undefined> = ref(undefined)
const internalTransactions: Ref<PaginatedResultOfRestaurantTransactionViewModel | undefined> = ref(undefined)
const cashTakingSearchRequest = ref(new CashTakingSearchRequest())
const internalTransactionsSearchRequest = ref(new RestaurantTransactionSearchRequest())
const currentCashTaking = ref<CashTakingViewModel | undefined>()
const cashTakingModal = ref(false)
const selectedCashTaking = ref()
const selectedInternalTransaction = ref()
const currentKeypadValue = ref(0)

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const saveInternalTransaction = async (value: number) => {
  isLoading.value = true
  try {
    await apiClient.internaltransaction(props.restaurantId, selectedInternalTransaction.value)
    selectedInternalTransaction.value = false
    await loadInternalTransactions()
  } catch (error) {
    notifier.notifyError('loading', error, 'history')
  }
  isLoading.value = false
}

const openCashTaking = async (value: number) => {
  isLoading.value = true
  try {
    await apiClient.cashtakingOpen(props.restaurantId, value)
    cashTakingModal.value = false
    currentKeypadValue.value = 0
    await loadOpenCashTakings()
    await loadCashTakings()
  } catch (error) {
    notifier.notifyError('opening', error, 'cashtaking')
  }
  isLoading.value = false
}

const closeCashTaking = (value: number) => {
  showConfirm('proceedQuestion', async () => {
    isLoading.value = true
    try {
      await apiClient.cashtakingClose(props.restaurantId, CashTakingViewModel.fromJS({ cashDrawerAmount: value })!)
      cashTakingModal.value = false
      currentKeypadValue.value = 0
      await loadOpenCashTakings()
      await loadCashTakings()
    } catch (error) {
      notifier.notifyError('closing', error, 'cashtaking')
    }
    isLoading.value = false
  })
}

const loadInternalTransactions = async (pageIdx = 0, pageSize = 10) => {
  isLoading.value = true
  internalTransactionsSearchRequest.value.pageIdx = pageIdx
  internalTransactionsSearchRequest.value.pageSize = pageSize
  internalTransactionsSearchRequest.value.manualOnly = true
  try {
    internalTransactions.value = await apiClient.internaltransactions(props.restaurantId, internalTransactionsSearchRequest.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'history')
  }
  isLoading.value = false
}

const loadCashTakings = async (pageIdx = 0, pageSize = 10) => {
  isLoading.value = true
  cashTakingSearchRequest.value.pageIdx = pageIdx
  cashTakingSearchRequest.value.pageSize = pageSize
  try {
    cashTakingResponse.value = await apiClient.cashtakingsPost(props.restaurantId, cashTakingSearchRequest.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'history')
  }
  isLoading.value = false
}

const loadOpenCashTakings = async () => {
  isLoading.value = true
  try {
    currentCashTaking.value = await apiClient.cashtakingsGet(props.restaurantId)
  } catch (error) {
    notifier.notifyError('loading', error, 'history')
  }
  isLoading.value = false
}

const newInternalTransaction = () => {
  selectedInternalTransaction.value = new RestaurantTransactionViewModel()
}

onMounted(() => {
  loadCashTakings()
  loadOpenCashTakings()
  loadInternalTransactions()
})

const cashTakingsColumnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<CashTakingViewModel>(m => m.id)]: {
    type: 'id',
    name: '@'
  },
  [nameof<CashTakingViewModel>(m => m.initialAmount)]: {
    type: 'currency',
    name: '@'
  },
  [nameof<CashTakingViewModel>(m => m.cashAmount)]: {
    type: 'currency',
    name: '@'
  },
  [nameof<CashTakingViewModel>(m => m.cardsAmount)]: {
    type: 'currency',
    name: '@'
  },
  [nameof<CashTakingViewModel>(m => m.refundedAmount)]: {
    type: 'currency',
    name: '@'
  },
  difference: {
    type: 'currency',
    name: '@',
    value: (item: CashTakingViewModel) => item.cashDrawerAmount - item.cashAmount - item.initialAmount + item.payoutsAmount
  },
  [nameof<CashTakingViewModel>(m => m.endDate)]: {
    type: 'date',
    name: '@'
  },
  print: {
    type: 'icon',
    iconButtonClass: 'indigo',
    iconName: 'printer',
    clicked: (cashTaking: CashTakingViewModel) => printCashTaking(props.restaurantId, cashTaking.id!, store.device.value!.id!),
    columnIf: () => !!store.device.value?.defaultPrinterId
  }
})

const internalTransactionsColumnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<RestaurantTransactionViewModel>(m => m.createdAt)]: {
    type: 'date',
    name: '@'
  },
  [nameof<RestaurantTransactionViewModel>(m => m.transactionTypeId)]: {
    type: 'enum',
    enumValue: StoreTransactionTypeEnum,
    enumName: 'StoreTransactionTypeEnum',
    name: 'transactionType'
  },
  [nameof<RestaurantTransactionViewModel>(m => m.amount)]: {
    type: 'currency',
    name: '@'
  },
  [nameof<RestaurantTransactionViewModel>(m => m.reference)]: {
    type: 'string',
    name: '@'
  }
})

const currentCashTakingFieldsGroups = ref([
  {
    [nameof<CashTakingViewModel>(m => m.createdAt)]: {
      type: 'string',
      name: '@'
    },
    [nameof<CashTakingViewModel>(m => m.initialAmount)]: {
      type: 'currency',
      name: '@'
    },
    [nameof<CashTakingViewModel>(m => m.cashAmount)]: {
      type: 'currency',
      name: '@'
    },
    [nameof<CashTakingViewModel>(m => m.cardsAmount)]: {
      type: 'currency',
      name: '@'
    },
    [nameof<CashTakingViewModel>(m => m.refundedAmount)]: {
      type: 'currency',
      name: '@'
    },
    [nameof<CashTakingViewModel>(m => m.payoutsAmount)]: {
      type: 'currency',
      name: '@'
    }
  }
])
const cashTakingFieldGroups = ref([
  {
    [nameof<CashTakingViewModel>(m => m.createdAt)]: {
      type: 'string',
      name: '@'
    },
    [nameof<CashTakingViewModel>(m => m.cashAmount)]: {
      type: 'currency',
      name: '@'
    }
  }
])

const internalTransactionsFieldsGroups = ref([
  {
    '[class]': 'flex flex-col',
    [nameof<RestaurantTransactionViewModel>(m => m.transactionTypeId)]: {
      type: 'enum',
      name: 'transactionType',
      enumValue: StoreTransactionTypeEnum,
      enumName: 'StoreTransactionTypeEnum',
      optionIf: (option: any) => [StoreTransactionTypeEnum.SUPPLIER_PAYOUT, StoreTransactionTypeEnum.SUPPLIER_REFUND, StoreTransactionTypeEnum.INVOICE_PAYOUT].map(v => StoreTransactionTypeEnum[v]).includes(option)
    },
    [nameof<RestaurantTransactionViewModel>(m => m.reference)]: {
      type: 'text',
      name: '@'
    },
    [nameof<RestaurantTransactionViewModel>(m => m.notes)]: {
      type: 'textarea',
      name: '@',
      class: 'h-24'
    }
  }
])

</script>
<template>
  <div class="w-full">
    <Modal :size="ModalSize.Large" title="newTransaction" :is-loading="isLoading"
      @close="selectedInternalTransaction = false" v-if="selectedInternalTransaction">
      <template v-slot:content>
        <div class="flex justify-center gap-3">
          <div class="w-1/2 flex flex-col gap-2">
            <FormBuilder v-model="selectedInternalTransaction" :is-loading="isLoading"
              :fields-groups="internalTransactionsFieldsGroups">
            </FormBuilder>
          </div>
          <div class="w-1/2">
            <NumericKeypad :allow-zero="true" :disable-keyboard="true"
              :confirm-disabled="selectedInternalTransaction.amount === 0 || !selectedInternalTransaction.reference || !selectedInternalTransaction.transactionTypeId"
              v-model="selectedInternalTransaction.amount" @confirm="saveInternalTransaction">
            </NumericKeypad>
          </div>
        </div>
      </template>
    </Modal>
    <Modal :size="ModalSize.Medium" :is-loading="isLoading" @close="cashTakingModal = false; currentKeypadValue = 0"
      v-if="cashTakingModal">
      <template v-slot:content>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-center">
            <span class="text-gray-body font-semibold" v-if="currentCashTaking">{{ $tc('cashDrawerAmount') }}</span>
            <span class="text-gray-body font-semibold" v-else>{{ $tc('initialAmount') }}</span>
          </div>
          <div class="flex justify-between my-1 text-xl" v-if="currentCashTaking">
            <span class="font-medium text-gray-body text-base">{{ $tc('difference') }}</span>&nbsp;
            <span class="font-bold">{{
              numberFormatter.currency(currentKeypadValue -
                currentCashTaking.cashAmount +
                currentCashTaking.payoutsAmount -
                currentCashTaking.initialAmount)
            }}</span>
          </div>
          <NumericKeypad :allow-zero="true" v-model="currentKeypadValue"
            @confirm="currentCashTaking ? closeCashTaking($event) : openCashTaking($event)">
          </NumericKeypad>
        </div>
      </template>
    </Modal>
    <!-- <Modal v-if="selectedCashTaking" @close="selectedCashTaking = undefined">
              <template v-slot:content>
                <div class="p-1">
                  <FormBuilder :is-loading="false" :readonly="true" :fields-groups="cashTakingFieldGroups" v-model="selectedCashTaking">
                  </FormBuilder>
                </div>
              </template>
            </Modal> -->
    <ScrollableDiv class="page-content flex flex-col gap-2" :height="pageContentHeight">
      <div class="card p-0">
        <Collapse title="currentCashTaking" class="shadow-default" :is-open="true" :is-first="true" :is-last="true">
          <div class="p-2 flex justify-between">
            <template v-if="currentCashTaking">
              <FormBuilder v-model="currentCashTaking" :is-loading="isLoading" :readonly="true"
                :fields-groups="currentCashTakingFieldsGroups"></FormBuilder>
              <div>
                <button class="btn-action blue" @click="cashTakingModal = true">
                  <span class="mdi mdi-lock-alert"></span>
                  <span>{{ $tc('close') }}</span>
                </button>
              </div>
            </template>
            <template v-else>
              <button class="btn-action primary-fill" @click="cashTakingModal = true">
                <span class="mdi mdi-lock-open-alert"></span>
                <span>{{ $tc('open') }}</span>
              </button>
            </template>
          </div>
        </Collapse>
      </div>
      <div class="card p-0">
        <Collapse title="history" :is-open="true" :is-first="true" :is-last="true">
          <TableBuilder :columns="cashTakingsColumnDefinition" :items="cashTakingResponse?.items ?? []"
            :show-search-button="false" @clicked="selectedCashTaking = $event"
            :total-pages="cashTakingResponse?.totalPages" :total-records="cashTakingResponse?.totalRecords"
            :is-loading="isLoading" :change-page-callback="loadCashTakings" :show-pages="true">
          </TableBuilder>
        </Collapse>
      </div>
      <div class="card p-0">
        <Collapse title="internalTransactions" :is-open="true" :is-first="true" :is-last="true">
          <TableBuilder :columns="internalTransactionsColumnDefinition" :items="internalTransactions?.items ?? []"
            :show-search-button="false" @clicked="selectedInternalTransaction = $event"
            :total-pages="internalTransactions?.totalPages" :total-records="internalTransactions?.totalRecords"
            :is-loading="isLoading" :change-page-callback="loadInternalTransactions" :show-pages="true">
            <template v-slot:action-buttons-right>
              <div class="flex py-0.5 gap-2 items-end">
                <button class="btn-action primary-fill" @click="newInternalTransaction()">
                  <span class="mdi mdi-plus"></span>
                  <span>{{ $tc('new') }}</span>
                </button>
              </div>
            </template>
          </TableBuilder>
        </Collapse>
      </div>
    </ScrollableDiv>
  </div>
</template>
