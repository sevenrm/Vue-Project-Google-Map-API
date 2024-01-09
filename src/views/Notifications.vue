<script lang="ts" setup>
import { nameof } from 'ts-simple-nameof'
import { Ref, onMounted, ref } from 'vue'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'
import TableBuilder from '../components/ui/TableBuilder.vue'
import { TableBuilderFieldDefinition } from '../components/ui/types'
import { apiClient } from '../services/api'
import { BaseSearchRequest, NotificationMediumTypeEnum, NotificationViewModel, PaginatedResultOfNotificationViewModel, PlatformNotificationTypeEnum } from '../services/api.client'
import { notifier } from '../services/notification'
import { pageContentHeight, pageContentHeightPx } from '../services/utils'
import { FeNotificationViewModel } from '../types'
import OrdersAccountSessionsModal from '../components/orders/OrdersAccountSessionsModal.vue'

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const isLoading = ref(false)
const historyResponse: Ref<PaginatedResultOfNotificationViewModel | undefined> = ref(undefined)
const searchRequest = ref(new BaseSearchRequest())

const loadNotifications = async () => {
  isLoading.value = true
  try {
    const response = await apiClient.restaurantNotificationsPost(props.restaurantId, searchRequest.value)
    response.items = response.items.map(n => new FeNotificationViewModel(n))
    historyResponse.value = response
  } catch (error) {
    notifier.notifyError('loading', error, 'notifications')
  }
  isLoading.value = false
}

onMounted(() => {
  loadNotifications()
})

const notificationsColumnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<NotificationViewModel>(m => m.id)]: {
    type: 'id',
    name: '@'
  },
  [nameof<NotificationViewModel>(m => m.createdAt)]: {
    type: 'date',
    name: '@'
  },
  [nameof<NotificationViewModel>(m => m.notificationTypeId)]: {
    type: 'enum',
    enumValue: PlatformNotificationTypeEnum,
    enumName: 'PlatformNotificationTypeEnum'
  },
  [nameof<NotificationViewModel>(m => m.data)]: {
    type: 'slot',
    name: 'details'
  }
})

const selectedNotification = ref<FeNotificationViewModel | undefined>()

</script>
<template>
  <div class="w-full">
    <OrdersAccountSessionsModal @close="selectedNotification = undefined"
      :orders-account-id="selectedNotification.data.ordersAccountId"
      v-if="selectedNotification && selectedNotification.notificationTypeId === PlatformNotificationTypeEnum.TABLE_JOIN_REQUESTED"
      :restaurant-id="restaurantId"></OrdersAccountSessionsModal>
    <ScrollableDiv class="page-content" :height="pageContentHeight">
      <TableBuilder :items="historyResponse?.items ?? []" :total-pages="historyResponse?.totalPages"
        :total-records="historyResponse?.totalRecords" :is-loading="isLoading" :show-pages="true"
        :columns="notificationsColumnDefinition" :change-page-callback="loadNotifications"
        @clicked="selectedNotification = $event">
      </TableBuilder>
    </ScrollableDiv>
  </div>
</template>
