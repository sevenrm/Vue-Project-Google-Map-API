<script lang="ts" setup>
import { Ref, onMounted, ref } from 'vue'
import { environment } from '../../environment'
import { notifier } from '../../services/notification'
import { apiClient } from '../../services/api'
import { useScriptTag } from '@vueuse/core'
import Modal from '../ui/Modal.vue'
import SimpleSpinner from '../ui/SimpleSpinner.vue'
import { ModalSize } from '../ui/types'

type AcceptedCard = 'Visa' | 'Mastercard' | 'Maestro'
interface CheckoutPaymentEvent {
  isPaymentMethodAccepted: boolean
  isValid: boolean
  paymentMethod?: AcceptedCard
}
const isFormValid: Ref<boolean> = ref(false)
const isLoading = ref(false)
const paymentMethodIcon = ref<string | undefined>()
const cardConfirmUrl = ref<string | undefined>()
const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const emits = defineEmits(['cardProcessed', 'close'])

const makePayment = async () => {
  isLoading.value = true
  try {
    await new Promise<void>(async (resolve, reject) => {
      try {
        const data = await window.Frames.submitCard()
        notifier.notifyInfo('payment', 'processing')
        const response = await apiClient.billingPaymentmethodPut(props.restaurantId, data.token)
        if (response) {
          bindIFrameListener(resolve, reject, response.transactionId!)
          cardConfirmUrl.value = response.challengeUrl
          return
        }
        emits('cardProcessed')
        resolve()
      } catch (error) {
        reject(error)
      }
    })
    notifier.notifySuccess('added', 'card')
  } catch (error) {
    notifier.notifyError('processing', error, 'card')
  }
  isLoading.value = false
}

const bindIFrameListener = (accept: () => void, reject: (err: string) => void, transactionId: string) => {
  const iframeMsgHandler = async (evt: any) => {
    if (typeof (evt.data) !== 'string') return
    if (evt.data.split(':')[0] !== 'action') return
    const msgType = evt.data.split(':')[1].split(';')[0]
    const eventData = evt.data.indexOf(';') > -1 ? evt.data.substring(evt.data.indexOf(';') + 1) : ''
    const dataObj = eventData.split(';').reduce((map: any, v: string) => ({ ...map, [v.split(':')[0]]: v.split(':')[1] }), {} as any)
    switch (msgType) {
      case 'handleCheckout':
        cardConfirmUrl.value = undefined
        window.removeEventListener('onmessage', iframeMsgHandler)
        try {
          await apiClient.billingConfirm(props.restaurantId, transactionId)
        } catch (error) {
          reject(error)
        }
        emits('cardProcessed')
        accept()
        return
      case 'handleCheckoutError':
        reject(dataObj.error)
    }
  }
  window.onmessage = iframeMsgHandler
}

const { scriptTag, load, unload } = useScriptTag(
  'https://cdn.checkout.com/js/framesv2.min.js',
  () => {
    // do something
  },
  { manual: true }
)

const loadCheckout = async () => {
  isLoading.value = true
  await load()

  const showPaymentMethodIcon = (paymentMethod?: AcceptedCard) => {
    const iconName = paymentMethod?.toLowerCase() ?? 'card'
    paymentMethodIcon.value = `https://js.checkout.com/framesv2/img/${iconName}.svg`
  }

  const paymentMethodChanged = (event: CheckoutPaymentEvent) => {
    const pm = event.paymentMethod
    if (!pm) {
      showPaymentMethodIcon(undefined)
    } else {
      showPaymentMethodIcon(pm)
    }
  }

  setTimeout(() => {
    window.Frames.init({
      publicKey: environment.isProduction ? environment.checkoutProdKey : environment.checkoutTestKey,
      acceptedPaymentMethods: ['Visa', 'Maestro', 'Mastercard']
    })
    // todo check if need reinit after fail
    window.Frames.addEventHandler(window.Frames.Events.CARD_VALIDATION_CHANGED, (evt) => {
      isFormValid.value = evt.isValid
    })
    window.Frames.addEventHandler(window.Frames.Events.READY, () => isLoading.value = false)
    window.Frames.addEventHandler(
      window.Frames.Events.PAYMENT_METHOD_CHANGED,
      paymentMethodChanged
    )
    showPaymentMethodIcon()
  }, 0)
}

onMounted(() => {
  loadCheckout()
})
</script>
<style lang="scss">
form {
  width: 100%;
}

.card-number-frame,
.expiry-date-frame,
.cvv-frame {
  border-bottom: 1px solid #eee;
  border-radius: 5px;
  padding: 0px 10px;
  height: 40px;
  margin: 0 4px;
}

.card-number-frame {
  padding-left: 30px;
  padding-right: 0;
  flex: 1;
}

.card-frames-container {
  margin-top: 5px;
  position: relative;
}

.payment-icon {
  position: absolute;
  top: 10px;
  left: 10px;

  img {
    width: 16px;
    max-width: 16px;
    height: 19px;
  }
}
</style>
<template>
  <Modal @close="emits('close')" :size="ModalSize.Small" :action-buttons="[
    ...(!cardConfirmUrl ? [{ text: 'confirm', iconName: 'check', action: () => makePayment(), colorClass: 'success', disabled: () => !isFormValid || isLoading }] : [])
  ]">
    <template v-slot:content>
      <div v-show="!cardConfirmUrl && !isLoading">
        <div :class="{ 'hidden': isLoading }" class="flex flex-col card-frames-container">
          <div class="card-number-row">
            <div class="payment-icon">
              <img :src="paymentMethodIcon" />
            </div>
            <div class="card-number-frame">
              <!-- card number will be added here -->
            </div>
          </div>
          <div class="flex card-extra-row">
            <div class="expiry-date-frame">
              <!-- expiry date will be added here -->
            </div>
            <div class="cvv-frame">
              <!-- cvv frame will be added here -->
            </div>
          </div>
          <div>
            <span class="error-message"></span>
            <span class="success-payment-message"></span>
          </div>
        </div>
      </div>
      <div v-show="cardConfirmUrl" class="h-[450px]">
        <iframe :src="cardConfirmUrl" frameborder="0" scrolling="no" width="100%" height="100%"></iframe>
      </div>
      <div class="p-6 flex items-center justify-center" v-if="isLoading && !cardConfirmUrl">
        <SimpleSpinner></SimpleSpinner>
      </div>
    </template>
  </Modal>
</template>
