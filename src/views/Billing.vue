<script lang="ts" setup>
import { Ref, computed, onMounted, ref } from 'vue'
import Collapse from '../components/ui/Collapse.vue'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'
import { numberFormatter } from '../services/number.formatter'
import { pageContentHeight } from '../services/utils'
import { notifier } from '../services/notification'
import { apiClient } from '../services/api'
import CardModal from '../components/billing/CardModal.vue'
import { BaseSearchRequest, BillingPaymentMethodViewModel, InvoiceViewModel, PaginatedResultOfInvoiceViewModel, PlatformFeatureTypeEnum, StorePlatformFeatureViewModel } from '../services/api.client'
import TableBuilder from '../components/ui/TableBuilder.vue'
import { TableBuilderFieldDefinition } from '../components/ui/types'
import { nameof } from 'ts-simple-nameof'
import LoadingButton from '../components/ui/LoadingButton.vue'
import { useShowConfirm } from '../services/injections'
import { store } from '../services/store'
import InvoiceBuilderModal from '../components/documents/InvoiceBuilderModal.vue'
import PdfViewerModal from '../components/documents/PdfViewerModal.vue'

const confirm = useShowConfirm()
const showCardModal = ref(false)
const showInvoiceBuilder = ref(false)
const expandedHistoryRow = ref<string | undefined>()
const expandedBillingRow = ref<string | undefined>()
const currentBilling = ref<InvoiceViewModel[]>([])
const paymentMethods = ref<BillingPaymentMethodViewModel[]>([])
const historyResponse: Ref<PaginatedResultOfInvoiceViewModel | undefined> = ref(undefined)
const searchRequest = ref(new BaseSearchRequest())
const currentInvoiceId = ref<string | undefined>()
const isLoading = ref(false)
const features = ref<StorePlatformFeatureViewModel[]>([])
const pdfContent = ref()
const totalDue = computed(() => currentBilling.value.reduce((total, i) => total + i.amount, 0))
const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const featuresColumnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<StorePlatformFeatureViewModel>(m => m.platformFeatureTypeId)]: {
    type: 'enum',
    enumValue: PlatformFeatureTypeEnum,
    enumName: 'PlatformFeatureTypeEnum'
  },
  [nameof<StorePlatformFeatureViewModel>(m => m.startAt)]: {
    type: 'date',
    name: '@'
  },
  [nameof<StorePlatformFeatureViewModel>(m => m.expireAt)]: {
    type: 'date',
    name: '@'
  },
  [nameof<StorePlatformFeatureViewModel>(m => m.price)]: {
    type: 'currency',
    name: '@'
  },
  [nameof<StorePlatformFeatureViewModel>(m => m.renewalPrice)]: {
    type: 'currency',
    name: '@',
    if: (item: StorePlatformFeatureViewModel) => !!item.expireAt && !!item.renewalPrice && item.renewalPrice !== item.price
  },
  subscribe: {
    type: 'slot'
  }
})

const billingColumnDefinition = ref<TableBuilderFieldDefinition>({
  expander: {
    type: 'expander'
  },
  [nameof<InvoiceViewModel>(m => m.date)]: {
    type: 'date',
    name: '@'
  },
  [nameof<InvoiceViewModel>(m => m.amount)]: {
    type: 'currency',
    name: '@'
  },
  open: {
    type: 'icon',
    iconName: 'open-in-new',
    name: '@',
    clicked: (item: InvoiceViewModel) => loadDocument(item.documentId!)
  },
  delete: {
    type: 'icon',
    iconName: 'delete',
    name: '@',
    if: () => store.isUserAdmin(),
    clicked: (invoice: InvoiceViewModel) => deleteInvoice(invoice.id!)
  },
  pay: {
    type: 'icon',
    iconName: 'cash-check',
    name: '@',
    if: () => store.isUserAdmin(),
    clicked: (item: BillingPaymentMethodViewModel) => markInvoiceAsPaid(item.id!)
  }
})

const historyColumnDefinition = ref<TableBuilderFieldDefinition>({
  expander: {
    type: 'expander'
  },
  [nameof<InvoiceViewModel>(m => m.id)]: {
    type: 'id',
    name: '@'
  },
  [nameof<InvoiceViewModel>(m => m.date)]: {
    type: 'date',
    name: '@'
  },
  [nameof<InvoiceViewModel>(m => m.amount)]: {
    type: 'currency',
    name: '@'
  },
  open: {
    type: 'icon',
    name: '@',
    iconName: 'open-in-new',
    clicked: (item: InvoiceViewModel) => loadDocument(item.documentId!)
  }
})

const paymentMethodColumnDef = ref<TableBuilderFieldDefinition>({
  cardImage: {
    type: 'slot'
  },
  [nameof<BillingPaymentMethodViewModel>(m => m.scheme)]: {
    type: 'string',
    name: '@'
  },
  [nameof<BillingPaymentMethodViewModel>(m => m.expiryMonth)]: {
    type: 'string',
    name: '@'
  },
  [nameof<BillingPaymentMethodViewModel>(m => m.expiryYear)]: {
    type: 'string',
    name: '@'
  },
  [nameof<BillingPaymentMethodViewModel>(m => m.last4)]: {
    type: 'string',
    name: '@'
  },
  delete: {
    type: 'icon',
    iconName: 'delete',
    clicked: (item: BillingPaymentMethodViewModel) => deletePaymentMethod(item.id!)
  }
})

const deleteInvoice = (invoiceId: string) => {
  confirm('proceedQuestion', async () => {
    isLoading.value = true
    try {
      await apiClient.billingDelete(props.restaurantId, invoiceId)
      notifier.notifySuccess('deleted', 'invoice')
      await loadBilling()
    } catch (error) {
      notifier.notifyError('deleting', error, 'invoice')
    }
    isLoading.value = false
  })
}

const markInvoiceAsPaid = (invoiceId: string) => {
  confirm('proceedQuestion', async () => {
    isLoading.value = true
    try {
      await apiClient.billingPaymentManual(props.restaurantId, invoiceId)
      notifier.notifySuccess('paid', 'invoice')
      loadBilling()
      loadHistory()
    } catch (error) {
      notifier.notifyError('paying', error, 'invoice')
    }
    isLoading.value = false
  })
}

const deletePaymentMethod = (paymentMethodId: string) => {
  confirm('proceedQuestion', async () => {
    isLoading.value = true
    try {
      await apiClient.billingPaymentmethodDelete(props.restaurantId, paymentMethodId)
      notifier.notifySuccess('deleted', 'paymentMethod')
      await loadPaymentMethods()
    } catch (error) {
      notifier.notifyError('deleting', error, 'paymentMethod')
    }
    isLoading.value = false
  })
}

const loadDocument = async (documentId: string) => {
  try {
    isLoading.value = true
    const file = await apiClient.documentDownload(props.restaurantId, documentId)
    currentInvoiceId.value = documentId
    pdfContent.value = file.data
  } catch (error) {
    notifier.notifyError('downloading', error, 'file')
  }
  isLoading.value = false
}

const loadBilling = async () => {
  try {
    currentBilling.value = await apiClient.billingGet(props.restaurantId)
  } catch (error) {
    notifier.notifyError('loading', error, 'billing')
  }
}

const loadPaymentMethods = async () => {
  try {
    paymentMethods.value = await apiClient.billingPaymentmethods(props.restaurantId)
  } catch (error) {
    notifier.notifyError('loading', error, 'paymentMethods')
  }
}

const makePayment = async () => {
  isLoading.value = true
  try {
    await apiClient.billingPayment(props.restaurantId)
    notifier.notifySuccess('executed', 'payment')
    await loadBilling()
    await loadHistory()
  } catch (error) {
    notifier.notifyError('loading', error, 'paymentMethods')
  }
  isLoading.value = false
}

const loadHistory = async (pageIdx = 0, pageSize = 10) => {
  try {
    searchRequest.value.pageIdx = pageIdx
    searchRequest.value.pageSize = pageSize
    historyResponse.value = await apiClient.billingHistory(props.restaurantId, searchRequest.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'paymentMethods')
  }
}

const loadFeatures = async () => {
  try {
    features.value = await apiClient.billingFeatures(props.restaurantId)
  } catch (error) {
    notifier.notifyError('loading', error, 'features')
  }
}

const toggleFeature = async (feature: PlatformFeatureTypeEnum) => {
  isLoading.value = true
  try {
    await apiClient.billingFeatureToggle(props.restaurantId, false, feature)
    notifier.notifySuccess('toggled', 'subscription')
    await loadFeatures()
  } catch (error) {
    notifier.notifyError('toggling', error, 'subscription')
  }
  isLoading.value = false
}

const createManualInvoice = async (invoice: InvoiceViewModel) => {
  confirm('proceedQuestion', async () => {
    isLoading.value = true
    try {
      await apiClient.billingManual(props.restaurantId, invoice)
      notifier.notifySuccess('created', 'invoice')
      showInvoiceBuilder.value = false
      loadBilling()
    } catch (error) {
      notifier.notifyError('creating', error, 'invoice')
    }
    isLoading.value = false
  })
}

onMounted(() => {
  loadFeatures()
  loadBilling()
  loadHistory()
  loadPaymentMethods()
})

</script>
<template>
  <PdfViewerModal :data="pdfContent" :file-name="`${currentInvoiceId}.pdf`"
    @close="pdfContent = undefined; currentInvoiceId = undefined"></PdfViewerModal>
  <InvoiceBuilderModal :is-loading="isLoading" v-if="showInvoiceBuilder" @close="showInvoiceBuilder = false"
    @save="createManualInvoice">
  </InvoiceBuilderModal>
  <CardModal :restaurant-id="restaurantId" v-if="showCardModal" @close="showCardModal = false"
    @card-processed="showCardModal = false; loadPaymentMethods()"></CardModal>
  <div>
    <ScrollableDiv class="page-content flex flex-col gap-2" :height="pageContentHeight">
      <div class="card p-4 gap-2 flex flex-col">
        <div class="flex gap-4">
          <div class="flex flex-col gap-2">
            <span class="font-semibold text-gray-heading text-lg">{{ $tc('paymentDue') }}</span>
            <span class="font-semibold text-lg">{{ numberFormatter.currency(totalDue) }}</span>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <LoadingButton :is-loading="isLoading" :is-disabled="totalDue === 0 || !paymentMethods.length"
            class="btn-action success" @click="makePayment">
            <span class="mdi mdi-cash-fast"></span>
            <span>{{ $tc('makePayment') }}</span>
          </LoadingButton>
          <button class="btn-action blue" @click="showCardModal = true">
            <span class="mdi mdi-credit-card-outline"></span>
            <span>{{ $tc('addPaymentMethod') }}</span>
          </button>
          <button class="btn-action primary-fill" @click="showInvoiceBuilder = true" v-if="store.isUserAdmin()">{{
            $tc('createManual') }}</button>
        </div>
      </div>
      <div class="card p-0">
        <Collapse title="currentBilling" :is-first="true" :is-last="true" :is-open="true">
          <TableBuilder :items="currentBilling" :show-search-button="false" :is-loading="isLoading"
            :columns="billingColumnDefinition" :has-row-expanded="item => expandedBillingRow === item.date"
            @clicked="expandedBillingRow = expandedBillingRow === $event.date ? undefined : $event.date">
            <template v-slot:expandedRow="{ item }: { item: any }">
              <tr v-for="(subItem, idx) of item.items" :key="subItem.key"
                class="border-gray-50 hover:bg-gray-50 cursor-pointer" :class="{ 'border-t': idx > 0 }">
                <td class="p-1 px-2 font-semibold text-gray-body" colspan="2">
                  <span>{{ subItem.key }}</span>
                </td>
                <td colspan="2" class="p-1">
                  <span class="p-1 font-semibold">{{ numberFormatter.currency(subItem.value) }}</span>
                </td>
              </tr>
            </template>
          </TableBuilder>
        </Collapse>
      </div>
      <div class="card p-0">
        <Collapse title="features" :is-first="true" :is-last="true" :is-open="true">
          <TableBuilder :is-loading="isLoading" :items="features" :show-search-button="false"
            :columns="featuresColumnDefinition">
            <template v-slot:subscribe="{ item }: { item: any }">
              <button v-if="item.hasTrial" class="btn-action success"
                @click="toggleFeature(item.platformFeatureTypeId)">{{ $tc('startTrial') }}</button>
              <button v-else-if="!item.startAt || !item.renewAutomatically" class="btn-action blue"
                @click="toggleFeature(item.platformFeatureTypeId)">
                <span class="mdi mdi-play"></span>
                <span>{{ $tc('subscribe') }}</span>
              </button>
              <button v-else-if="item.renewAutomatically" class="btn-action danger"
                @click="toggleFeature(item.platformFeatureTypeId)">
                <span class="mdi mdi-stop"></span>
                <span>{{ $tc('unsubscribe') }}</span>
              </button>
            </template>
          </TableBuilder>
        </Collapse>
      </div>
      <div class="card p-0">
        <Collapse title="history" :is-first="true" :is-last="true" :is-open="true">
          <TableBuilder :items="historyResponse?.items ?? []" :total-pages="historyResponse?.totalPages"
            :show-search-button="false" :total-records="historyResponse?.totalRecords" :is-loading="isLoading"
            :change-page-callback="loadHistory" :show-pages="true" :columns="historyColumnDefinition"
            :has-row-expanded="item => expandedHistoryRow === item.id"
            @clicked="expandedHistoryRow = expandedHistoryRow === $event.id ? undefined : $event.id">
            <template v-slot:expandedRow="{ item }: { item: any }">
              <tr v-for="(subItem, idx) of item.items" :key="subItem.key"
                class="border-gray-50 hover:bg-gray-50 cursor-pointer" :class="{ 'border-t': idx > 0 }">
                <td class="p-1 px-2 font-semibold text-gray-body" colspan="3">
                  <span>{{ subItem.key }}</span>
                </td>
                <td colspan="2" class="p-1">
                  <span class="p-1 font-semibold">{{ numberFormatter.currency(subItem.value) }}</span>
                </td>
              </tr>
            </template>
          </TableBuilder>
        </Collapse>
      </div>
      <div class="card p-0">
        <Collapse title="paymentMethods" :is-first="true" :is-last="true" :is-open="true">
          <TableBuilder :columns="paymentMethodColumnDef" :is-loading="false" :show-search-button="false"
            :items="paymentMethods">
            <template v-slot:cardImage="{ item }: { item: any }">
              <img :src="`https://js.checkout.com/framesv2/img/${item.scheme.toLowerCase()}.svg`" v-if="item.scheme" />
            </template>
          </TableBuilder>
        </Collapse>
      </div>
    </ScrollableDiv>
  </div>
</template>
