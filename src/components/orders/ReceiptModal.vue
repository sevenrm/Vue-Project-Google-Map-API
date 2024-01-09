<script lang="ts" setup>
import { computed, PropType, ref } from 'vue'
import { apiClient } from '../../services/api'
import { PaymentProviderEnum, ReceiptViewModel } from '../../services/api.client'
import { dateFormatter } from '../../services/date.formatter'
import { notifier } from '../../services/notification'
import { numberFormatter } from '../../services/number.formatter'
import { printReceipt } from '../../services/printer'
import { store } from '../../services/store'
import CustomerModal from '../customers/CustomerModal.vue'
import CustomerSelectorModal from '../customers/CustomerSelectorModal.vue'
import Modal from '../ui/Modal.vue'
import { ModalSize } from '../ui/types'
import NumericKeypad from './NumericKeypad.vue'

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  },
  receipt: Object as PropType<ReceiptViewModel>,
  isLoading: Boolean
})

const refundReceipt = async (amount: number) => {
  emits('update:isLoading', true)
  try {
    const updatedReceipt = await apiClient.receiptRefund(props.restaurantId, props.receipt!.id!, amount)
    isRefundMode.value = false
    notifier.notifySuccess('refunded', 'receipt')
    emits('update:receipt', updatedReceipt)
  } catch (error) {
    notifier.notifyError('refunding', error, 'receipt')
  }
  emits('update:isLoading', false)
}

const changeReceiptPaymentType = async () => {
  emits('update:isLoading', true)
  try {
    const updatedReceipt = await apiClient.receiptPaymentprovider(props.restaurantId, props.receipt!.id!, selectedPaymentMethodId.value!)
    notifier.notifySuccess('updated', 'receipt')
    isEditMode.value = false
    emits('update:receipt', updatedReceipt)
  } catch (error) {
    notifier.notifyError('updating', error, 'receipt')
  }
  emits('update:isLoading', false)
}

const changeReceiptCustomer = async (customerId: string) => {
  customerSelectorModalVisible.value = false
  emits('update:isLoading', true)
  try {
    const updatedReceipt = await apiClient.receiptCustomer(props.restaurantId, props.receipt!.id!, customerId)
    notifier.notifySuccess('updated', 'receipt')
    isEditMode.value = false
    emits('update:receipt', updatedReceipt)
  } catch (error) {
    notifier.notifyError('updating', error, 'receipt')
  }
  emits('update:isLoading', false)
}

const isRefundMode = ref(false)
const isEditMode = ref(false)
const emits = defineEmits(['close', 'update:receipt', 'update:isLoading'])
const customerSelectorModalVisible = ref(false)
const customerModalVisible = ref(false)
const changeablePaymentMethods = [PaymentProviderEnum.Cash, PaymentProviderEnum.PhysicalCard]
const selectedPaymentMethodId = ref<PaymentProviderEnum>()
</script>
<template>
  <CustomerSelectorModal @close="customerSelectorModalVisible = false" :restaurant-id="restaurantId"
    @new="customerModalVisible = true; receipt!.customerId = undefined" @selected="changeReceiptCustomer"
    v-if="customerSelectorModalVisible && !customerModalVisible">
  </CustomerSelectorModal>
  <CustomerModal :show-change="true" :restaurant-id="restaurantId" v-if="customerModalVisible"
    @change="customerSelectorModalVisible = true; customerModalVisible = false" @close="customerModalVisible = false"
    @saved="changeReceiptCustomer($event)" :customer-id="receipt?.customerId">
  </CustomerModal>
  <Modal :size="ModalSize.Medium" @close="isRefundMode = false"
    v-if="receipt && isRefundMode && !customerSelectorModalVisible && !customerModalVisible">
    <template v-slot:content>
      <NumericKeypad :max-value="receipt.amount" :is-loading="isLoading" @confirm="refundReceipt">
      </NumericKeypad>
    </template>
  </Modal>
  <Modal v-if="receipt && !isRefundMode && !customerSelectorModalVisible && !customerModalVisible"
    @close="isEditMode = false; $emit('close')" :size="ModalSize.Medium" :is-loading="isLoading" :action-buttons="[
      ...(changeablePaymentMethods.includes(receipt.paymentProviderId) ?
        [...(isEditMode
          ? [
            { text: 'cancel', iconName: 'cancel', action: () => isEditMode = false, colorClass: 'gray' },
            { text: 'save', iconName: 'content-save', action: () => changeReceiptPaymentType(), colorClass: 'success' }]
          : [
            { text: 'refund', action: () => isRefundMode = true, iconName: 'cash-refund', colorClass: 'yellow' },
            {
              text: 'edit', iconName: 'pencil', action: () => {
                isEditMode = true;
                selectedPaymentMethodId = receipt?.paymentProviderId;
              }, colorClass: 'blue'
            },
            {
              text: 'customer', iconName: 'account', colorClass: 'lime', action: () => receipt?.customerId ? customerModalVisible = true : customerSelectorModalVisible = true
            }
          ]
        )]
        : [])]">
    <template v-slot:content>
      <div class="flex flex-col">
        <div class="w-full flex flex-col gap-2 items-center justify-center">
          <span class="text-gray-body font-semibold">{{ $tc('receipt') }}:</span>
          <span class="font-semibold text-lg text-center">{{ receipt.id }}</span>
          <span>{{ dateFormatter.datetime(receipt.createdAt) }}</span>
        </div>
        <div class="flex flex-col items-center justify-center py-4">
          <span>{{ $tc('amount') }}</span>
          <span class="font-bold text-primary text-xl">{{ numberFormatter.currency(receipt.amount) }}</span>
        </div>
        <div class="flex flex-col items-center justify-center py-4" v-if="receipt.refundedAmount">
          <span>{{ $tc('refundedAmount') }}</span>
          <span class="font-bold text-primary text-xl">{{ numberFormatter.currency(receipt.refundedAmount) }}</span>
        </div>
        <div class="flex flex-col items-center justify-center py-4">
          <span>{{ $tc('paymentType') }}</span>
          <div class="flex gap-2 items-center justify-center">
            <span v-if="!isEditMode" class="font-bold text-primary text-xl">{{
              $tc(`PaymentProviderEnum.${PaymentProviderEnum[receipt.paymentProviderId]
                }`) }}</span>
            <template v-else>
              <label class="form-label row" v-for="paymentMethod of changeablePaymentMethods" :key="paymentMethod">
                <input name="paymentMethodGroup" v-model="selectedPaymentMethodId" type="radio" :value="paymentMethod" />
                <span>
                  {{ $tc(`PaymentProviderEnum.${PaymentProviderEnum[paymentMethod]}`) }}
                </span>
              </label>
            </template>
          </div>
        </div>
        <div class="flex flex-col items-center justify-center py-4" v-if="receipt.customerName">
          <span>{{ $tc('customer') }}</span>
          <div class="flex gap-2 items-center justify-center">
            <span class="font-medium">
              {{ receipt.customerName }}
            </span>
          </div>
        </div>
        <div class="flex items-center justify-center">
          <button class="btn-action indigo" v-if="store.device.value"
            @click="printReceipt(restaurantId, store.device.value!.id!, receipt!.id)">
            <span class="mdi mdi-printer"></span>
            {{ $tc('print') }}
          </button>
        </div>
      </div>
    </template>
  </Modal>
</template>
