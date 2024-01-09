<script lang="ts" setup>
import { computed, onUnmounted, Ref, ref, watch } from 'vue'
import { apiClient } from '../services/api'
import { notifier } from '../services/notification'
import { store } from '../services/store'
import notificationSound from '../assets/sounds/default.wav'
import { useToast } from 'vue-toastification'
import { i18nInstance } from '../services/i18n'
import { useRoute, useRouter } from 'vue-router'
import TimeCounter from './orders/TimeCounter.vue'
import { PlatformNotificationTypeEnum } from '../services/api.client'
// @ts-ignore
import VLazyImage from 'v-lazy-image'
import { FeNotificationViewModel } from '../types'
import OrdersAccountSessionsModal from './orders/OrdersAccountSessionsModal.vue'

let isInitialized = false
const notifications: Ref<FeNotificationViewModel[]> = ref([])
const audioNotification = new Audio(notificationSound)
const toast = useToast()
const route = useRoute()
const imageUrl = new URL('../assets/images/logo-color.png', import.meta.url).href

const emits = defineEmits(['theme-toggle', 'update:sidebarVisible'])
defineProps({
  isFullscreen: Boolean,
  isDark: {
    type: Boolean
  },
  sidebarVisible: Boolean
})

const markNotificationAsRead = async (notificationId: string) => {
  try {
    await apiClient.restaurantNotificationsPatch(store.selectedRestaurantId!, notificationId)
    notifications.value = notifications.value.filter(n => n.id !== notificationId)
  } catch (error) {
    notifier.notifyError('clearingNotification', error)
  }
}

store.connectionEmitter.on('reconnected', () => {
  console.log('Notification reconnects to WS')
  startWsConnection()
})

const connection = store.connection
const startWsConnection = async () => {
  if (!isInitialized && connection) {
    connection.on('NOTIFICATIONS', (newNotifications: any[]) => {
      notifications.value = Object.values([
        ...notifications.value,
        ...newNotifications.map(n => ({ ...n, data: JSON.parse(n.data), createdAt: new Date(n.createdAt) }))
      ].map((map, n: any) => ({ ...map, [n.id]: n }), {}))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      if (newNotifications.length === 1) {
        const newNotification = notifications.value[0]
        const toastTimeout = notificationTimeout(newNotification.notificationTypeId)
        toast.info(getNotificationMessage(newNotification), {
          timeout: toastTimeout,
          onClick: (closeToast) => {
            if (newNotification.notificationTypeId === PlatformNotificationTypeEnum.TABLE_JOIN_REQUESTED)
              selectedOrdersAccountId.value = newNotification.data.ordersAccountId
            closeToast()
          },
          onClose: ((notificationId, skip) => () => {
            if (skip) return
            markNotificationAsRead(notificationId)
          })(newNotification.id!, toastTimeout === undefined)
        })
      } else if (newNotifications.length > 1)
        notifier.notifyInfo('newNotifications', { count: newNotifications.length })
      if (newNotifications.length > 0)
        audioNotification.play()
    })
    isInitialized = true
  }
  await store.isStoreConnected()
  await connection?.invoke('Subscribe', 'NOTIFICATIONS', store.selectedRestaurantId)
}

const notificationTimeout = (notificationTypeId: number): number | false | undefined => {
  switch (notificationTypeId) {
    default:
      return route.name === 'orders-list' ? 10000 : undefined
  }
}

const getNotificationMessage = (notification: any) => {
  switch (notification.notificationTypeId) {
    case PlatformNotificationTypeEnum.WAITER_REQUESTED:
      return i18nInstance.global.t('waiterRequested', { tableNumber: notification.data.tableNumber, tableGroup: notification.data.tableGroup })
    case PlatformNotificationTypeEnum.CHECKOUT_REQUESTED:
      return i18nInstance.global.t('checkoutRequested', { tableNumber: notification.data.tableNumber, tableGroup: notification.data.tableGroup })
    case PlatformNotificationTypeEnum.TABLE_JOIN_REQUESTED:
      return i18nInstance.global.t('tableJoinRequested', { tableNumber: notification.data.tableNumber, tableGroup: notification.data.tableGroup })
    case PlatformNotificationTypeEnum.NEW_INVOICE:
      return i18nInstance.global.t('newInvoice')
  }
  return ''
}

const isOrderPage = computed(() => route.name === 'orders-list')

watch(store.selectedRestaurant, (newVal, oldVal) => {
  if (newVal && newVal.id !== oldVal?.id)
    startWsConnection()
}, { immediate: true })

onUnmounted(async () => {
  if (!store.isDeviceLocked)
    await connection?.invoke('Unsubscribe', 'NOTIFICATIONS', store.selectedRestaurantId)
})

const selectedOrdersAccountId = ref<string | undefined>()

const reloadPage = () => location.reload()

const router = useRouter()
const goTo = (routeName: string) => router.push({ name: routeName })

const orderedRestaurants = computed(() => {
  const stores = [...store.user.value?.restaurants ?? []]
  return stores.sort((a, b) => (a.displayName as any) - (b.displayName as any))
})
</script>
<template>
  <div class="relative">
    <OrdersAccountSessionsModal v-if="selectedOrdersAccountId" @close="selectedOrdersAccountId = undefined"
      :restaurant-id="store.selectedRestaurantId!" :orders-account-id="selectedOrdersAccountId!">
    </OrdersAccountSessionsModal>
    <div class="mx-3 mt-3" v-if="!isFullscreen">
      <header
        class="w-full rounded h-12 z-1 bg-white shadow-default flex items-center justify-between pr-5 pl-2  max-w-full overflow-x-auto overflow-y-hidden whitespace-nowrap">
        <div class="flex items-center">

          <div class="w-20 lg:w-32 border-r border-gray-200 pr-2 mr-4 h-8 flex justify-center items-center">
            <VLazyImage width="120" alt="logo" :src="imageUrl" />
          </div>
          <div class="2xl:hidden flex items-center justify-center cursor-pointer text-gray-heading mr-3"
            @click="emits('update:sidebarVisible', !sidebarVisible)">
            <span class="mdi text-xl" :class="{ 'mdi-menu': !sidebarVisible, 'mdi-close': sidebarVisible }"></span>
          </div>

          <h1 class="page-title hidden md:block">
            <span v-if="store.isLoadingPage.value">{{ $tc('loading') }}...</span>
            <span v-else-if="$route.meta.title">{{ $tc(`routes.${$route.meta.title}`) }}</span>
          </h1>
        </div>
        <div>
          <ul class="flex items-center justify-end md:justify-evenly">
            <li>
              <div class="flex items-center justify-center md:px-4 border-r md:mx-4 border-gray-200 cursor-pointer">
                <Popper click arrow closeDelay="100">
                  <div class="cursor-pointer relative flex items-center justify-center w-full transition-colors">
                    <span class="font-semibold mr-2 text-red-pnp text-sm md:text-base">{{
                      store.selectedRestaurant.value?.displayName
                    }}</span>
                    <span class="text-gray-body mdi mdi-chevron-down"></span>
                  </div>
                  <template #content>
                    <div
                      class="border-gray-200 text-base list-none rounded-default divide-y border divide-gray-100 shadow-default bg-white dark:bg-gray-720 dark:border-gray-720">
                      <ul class="py-1" aria-labelledby="dropdownButton">
                        <li v-for="restaurant in orderedRestaurants" :key="restaurant.id"
                          @click="store.setRestaurant(restaurant)"
                          :class="{ 'text-red-pnp': restaurant.id == store.selectedRestaurant.value?.id, 'text-gray-body': restaurant.id != store.selectedRestaurant.value?.id }"
                          class="cursor-pointer px-3 py-2 text-base hover:text-red-pnp font-medium hover:bg-gray-100 transition-colors duration-150">
                          {{ restaurant.displayName }}</li>
                      </ul>
                    </div>
                  </template>
                </Popper>
              </div>
            </li>
            <!-- Theme toggler -->
            <!-- <li class="hidden md:flex">
                                                                <button @click="emits('theme-toggle')" class="rounded-md focus:outline-none focus:shadow-outline-red"
                                                                  aria-label="Toggle color mode">
                                                                  <span class="mdi"
                                                                    :class="{ 'mdi-moon-waxing-crescent rotate-45': !isDark, 'mdi-white-balance-sunny': isDark }"></span>
                                                                </button>
                                                              </li> -->

            <li>
              <div class="gap-4 flex items-center border-r border-gray-200 pr-4 mr-4">
                <div class="flex items-center justify-center cursor-pointer">
                  <Popper arrow closeDelay="100">
                    <div class="cursor-pointer relative flex items-center justify-center w-full text-gray-body">
                      <span class="mdi mdi-bell text-xl"></span>
                      <span v-if="notifications.length" aria-hidden="true"
                        class="text-red-pnp font-bold text-xs hover:text-red-pnp flex items-center justify-center bg-white absolute top-0 right-0  w-4 h-4 transform translate-x-1 -translate-y-1 border-2 border-white rounded-full">
                        {{ notifications.length }}
                      </span>
                    </div>
                    <template #content>
                      <div
                        class="border-gray-200 z-10 text-base list-none rounded-default divide-y border divide-gray-100 shadow-default bg-white dark:bg-gray-720 dark:border-gray-720">
                        <div v-if="!notifications.length" class="p-3 text-gray-body text-sm">{{
                          $tc('noNotifications')
                        }}
                        </div>
                        <ul class="space-y-0.5 menu-container min-w-[200px]" v-if="notifications.length">
                          <li v-for="notification in notifications" :key="notification.id"
                            @click="markNotificationAsRead(notification.id!)"
                            class="cursor-pointer px-3 py-2 text-gray-body flex flex-col gap-2 relative text-base hover:text-red-pnp font-semibold carded transition-colors duration-150">
                            <div class="text-gray-900 w-full flex flex-wrap">
                              <div class="flex flex-col gap-1" v-if="notification.notificationTypeId === 1">
                                <span>{{ $tc('waiterRequest') }}</span>
                                <div>
                                  <div
                                    class="rounded-default bg-indigo-100 text-indigo-600 p-1 px-3 font-semibold text-sm">
                                    <span class="mdi mdi-table-chair"></span>
                                    <span>{{ $tc('table') }}&nbsp;{{ notification.data.tableNumber
                                    }}</span>&nbsp;|&nbsp;
                                    <span>{{
                                      notification.data.tableGroup
                                    }}</span>
                                  </div>
                                </div>
                              </div>
                              <div class="flex flex-col gap-1" v-if="notification.notificationTypeId === 2">
                                <span>{{ $tc('checkoutRequest') }}</span>
                                <div class="rounded-default bg-indigo-100 text-indigo-600 p-1 px-3 font-semibold text-sm">
                                  <span class="mdi mdi-table-chair"></span>
                                  <span>{{ $tc('table') }}&nbsp;{{ notification.data.tableNumber
                                  }}</span>&nbsp;|&nbsp;<span>{{
  notification.data.tableGroup
}}</span>
                                </div>
                              </div>
                              <div class="flex flex-col gap-1"
                                @click="selectedOrdersAccountId = notification.data.ordersAccountId"
                                v-else-if="notification.notificationTypeId === PlatformNotificationTypeEnum.TABLE_JOIN_REQUESTED">
                                <span>{{ $tc('checkoutRequest') }}</span>
                                <div class="rounded-default bg-indigo-100 text-indigo-600 p-1 px-3 font-semibold text-sm">
                                  <span class="mdi mdi-table-chair"></span>
                                  <span>{{ $tc('table') }}&nbsp;{{ notification.data.tableNumber
                                  }}</span>&nbsp;|&nbsp;<span>{{
  notification.data.tableGroup
}}</span>
                                </div>
                              </div>
                              <div class="flex gap-1" @click="goTo('billing')"
                                v-else-if="notification.notificationTypeId === PlatformNotificationTypeEnum.NEW_INVOICE">
                                <span>{{ $tc('newInvoice') }}</span>
                                <span class="mdi mdi-file-document"></span>
                              </div>
                            </div>
                            <span class="mdi mdi-close absolute right-2 my-auto text-red-pnp"></span>
                            <TimeCounter class="text-gray-body text-sm" :model="notification.createdAt" />
                          </li>
                        </ul>
                        <div v-if="store.selectedRestaurantId" class="flex items-center justify-center">
                          <RouterLink class="text-primary text-sm font-semibold p-2"
                            :to="{ name: 'notifications', params: { restaurantId: store.selectedRestaurantId } }">
                            {{
                              $tc('openAll')
                            }}</RouterLink>
                        </div>
                      </div>
                    </template>
                  </Popper>
                </div>
                <router-link class="text-gray-body hover:text-red-pnp" :to="{ name: 'settings' }">
                  <span class="mdi mdi-cog text-xl"></span>
                </router-link>
                <button class="text-gray-body hover:text-red-pnp" @click="reloadPage()">
                  <span class="mdi mdi-reload text-xl"></span>
                </button>
                <button v-if="isOrderPage" class="text-gray-body hover:text-red-pnp hidden md:block"
                  @click="$emit('update:isFullscreen', true)">
                  <span class="mdi mdi-arrow-expand-all text-xl"></span>
                </button>
                <button class="text-gray-body hover:text-red-pnp" @click="store.logout()">
                  <span class="mdi mdi-power text-xl"></span>
                </button>
              </div>
            </li>
            <li>
              <div class="cursor-pointer gap-2 relative flex items-center justify-center w-full transition-colors">
                <span class="text-lg text-gray-body font-medium overflow-hidden whitespace-nowrap text-ellipsis"
                  style="max-width:120px">{{ store.user.value?.username }}</span>
                <div
                  class="bg-indigo-600 font-bold text-sm rounded-full flex items-center justify-center text-white uppercase h-7 w-7">
                  {{ store.user.value?.username.slice(0, 2) }}
                </div>
              </div>
            </li>
            <li v-if="!!store.device.value" class="border-l border-gray-200 pl-4 ml-4">
              <span class="mdi mdi-cellphone-link text-gray-body"></span>
            </li>
          </ul>
        </div>
      </header>
    </div>
    <div v-else class="absolute left-3 top-3 rounded-b-full p-2">
      <button @click="$emit('update:isFullscreen', false)" class="flex items-center gap-2">
        <div class="text-white bg-gradient rounded-full w-5 h-5 flex items-center justify-center">
          <span class="mdi mdi-close"></span>
        </div>
        <span class="text-sm text-gray-body font-semibold">{{ $tc('exitFullscreen') }}</span>
      </button>
    </div>
  </div>
</template>
<style scoped lang="scss">
.router-link-exact-active {
  color: theme("colors.primary")
}
</style>
