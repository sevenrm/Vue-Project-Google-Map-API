<script lang="ts" setup>
import { nameof } from 'ts-simple-nameof'
import { onMounted, Ref, ref } from 'vue'
import { apiClient } from '../../services/api'
import { OrdersAccountSessionViewModel } from '../../services/api.client'
import { notifier } from '../../services/notification'
import { pageContentHeight, pageContentHeightPx } from '../../services/utils'
import Modal from '../ui/Modal.vue'
import ScrollableDiv from '../ui/ScrollableDiv.vue'
import TableBuilder from '../ui/TableBuilder.vue'
import { TableBuilderFieldDefinition, TableBuilderSupportedTypes } from '../ui/types'

const props = defineProps({
  ordersAccountId: {
    type: String,
    required: true
  },
  restaurantId: {
    type: String,
    required: true
  }
})

const isLoading = ref(false)
const sessions: Ref<OrdersAccountSessionViewModel[]> = ref([])

const loadSessions = async () => {
  isLoading.value = true
  try {
    sessions.value = await apiClient.ordersAccountSessions(props.restaurantId, props.ordersAccountId)
  } catch (error) {
    notifier.notifyError('loading', error, 'sessions')
  }
  isLoading.value = false
}

const acceptSession = async (sessionId: string) => {
  isLoading.value = true
  try {
    await apiClient.ordersAccountAccept(props.restaurantId, props.ordersAccountId, sessionId)
    notifier.notifySuccess('approved', 'user')
    await loadSessions()
  } catch (error) {
    notifier.notifyError('updating', error, 'sessions')
  }
  isLoading.value = false
}

const rejectSession = async (sessionId: string) => {
  isLoading.value = true
  try {
    await apiClient.ordersAccountReject(props.restaurantId, props.ordersAccountId, sessionId)
    notifier.notifySuccess('rejected', 'user')
    await loadSessions()
  } catch (error) {
    notifier.notifyError('updating', error, 'sessions')
  }
  isLoading.value = false
}

const sessionColumnsDef = ref<TableBuilderFieldDefinition>({
  [nameof<OrdersAccountSessionViewModel>(m => m.nickName)]: {
    type: 'string',
    name: '@'
  },
  status: {
    type: 'slot',
    name: 'status'
  },
  accept: {
    type: 'icon',
    iconName: 'check',
    if: (item: OrdersAccountSessionViewModel) => item.isPending,
    clicked: (item: OrdersAccountSessionViewModel) => acceptSession(item.sessionId!)
  },
  reject: {
    type: 'icon',
    name: '',
    iconName: 'cancel',
    if: (item: OrdersAccountSessionViewModel) => item.isPending,
    clicked: (item: OrdersAccountSessionViewModel) => rejectSession(item.sessionId!)
  }
})

onMounted(() => {
  loadSessions()
})

</script>
<template>
  <Modal :is-loading="isLoading" v-if="ordersAccountId" @close="$emit('close')">
    <template v-slot:content>
      <div class="bg-white -m-3 rounded">
        <TableBuilder :show-search-button="false" :columns="sessionColumnsDef" :carded="false" :items="sessions"
          :is-loading="isLoading" :change-page-callback="loadSessions">
          <template v-slot:status="{ item } : { item: any }">
            <span class="bg-green-500 text-white px-2 py-1 rounded text-sm font-semibold" v-if="item.isApproved">{{
              $tc('approved')
            }}</span>
            <span class="bg-yellow-400 text-white px-2 py-1 rounded text-sm font-semibold" v-else-if="item.isPending">{{
              $tc('pending')
            }}</span>
            <span class="bg-red-600 text-white px-2 py-1 rounded text-sm font-semibold" v-else>{{
              $tc('rejected')
            }}</span>
          </template>
        </TableBuilder>
      </div>
    </template>
  </Modal>
</template>
