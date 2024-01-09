<script lang="ts" setup>
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import SimpleSpinner from '../components/ui/SimpleSpinner.vue'

const props = defineProps({
  providerId: {
    type: String,
    required: true
  }
})

const route = useRoute()
onMounted(async () => {
  try {
    const authCode = route.query['cko-session-id'] as string
    if (!authCode)
      throw new Error('TRANSACTION_FAILED')
    parent.postMessage(`action:handleCheckout;authCode:${authCode}`, '*')
  } catch (error) {
    let message
    try {
      const response = JSON.parse(error.response)
      message = response?.message ?? error.message
    } catch (subError) {
      message = error.message
    }
    parent.postMessage(`action:handleCheckoutError;error:${message}`, '*')
  }
})
</script>
<template>
  <div class="h-full">
    <div class="flex flex-col items-center justify-center gap-2 h-full">
      <SimpleSpinner></SimpleSpinner>
    </div>
  </div>
</template>
