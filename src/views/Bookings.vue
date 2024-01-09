<script lang="ts" setup>
import { Ref, ref, watch, onMounted, computed, ComputedRef } from 'vue'
// @ts-ignore
import VueCal from 'vue-cal'
import { apiClient } from '../services/api'
import 'vue-cal/dist/vuecal.css'
import { BookingViewModel, TableGroupViewModel } from '../services/api.client'
import { clone, pageContentHeight } from '../services/utils'
import { notifier } from '../services/notification'

import BookingModal from '../components/bookings/BookingModal.vue'
import OrdersFloorView from '../components/orders/OrdersFloorView.vue'
import Modal from '../components/ui/Modal.vue'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const tableGroupsMap: Ref<{ [tableGroupId: string]: TableGroupViewModel }> = ref({})
const selectedBooking: Ref<BookingViewModel | undefined> = ref(undefined)
const selectedDate = ref(new Date())
const bookingsMap: ComputedRef<Record<string, BookingViewModel>> = computed(() => (bookingResponse.value ?? []).reduce((map, b) => ({ ...map, [b.id!]: b }), {}))
const tableSelectorVisible = ref(false)
const isLoading = ref(false)
const bookingResponse: Ref<BookingViewModel[] | undefined> = ref(undefined)

const loadBookings = async (pageIdx = 0, pageSize = 10) => {
  isLoading.value = true
  try {
    bookingResponse.value = await apiClient.bookingGet(props.restaurantId, null, null)
  } catch (error) {
    notifier.notifyError('loading', error, 'history')
  }
  isLoading.value = false
}

const loadTables = async () => {
  try {
    const availableTableGroups = await apiClient.restaurantTablegroupsGet(props.restaurantId)
    tableGroupsMap.value = availableTableGroups.reduce((map, tableGroup) => ({ ...map, [tableGroup.id!]: tableGroup }), {})
  } catch (error) {
    notifier.notifyError('loading', error, 'tables')
  }
}

const createNewBooking = (startDate?: Date, endDate?: Date) => {
  selectedBooking.value = new BookingViewModel()
  if (startDate)
    selectedBooking.value.startDate = startDate
  if (endDate)
    selectedBooking.value.endDate = endDate
}

const onEventClick = (model: any, $event: any) => {
  selectedBooking.value = new BookingViewModel(clone(bookingsMap.value[model.id]))
}

const getMinutesDuration = (dateStart: Date, dateEnd: Date) => Math.floor(Math.abs(dateStart.getTime() - dateEnd.getTime()) / 1000 / 60)

let eventDeleteFn: (() => void) | undefined
const onEventCreate = ($event: any, deleteFn: any) => {
  eventDeleteFn = deleteFn
  return $event
}

const eventDragCreate = ($event: { start: Date, end: Date }) => {
  createNewBooking($event.start, $event.end)
}

const closeDialog = () => {
  if (eventDeleteFn)
    eventDeleteFn()
  selectedBooking.value = undefined
}

onMounted(() => {
  loadBookings()
  loadTables()
})

const bookings = computed(() => bookingResponse.value?.map(i => ({
  id: i.id,
  start: i.startDate,
  end: i.endDate,
  title: i.name,
  content: '<i class="icon material-icons">Table Booked</i>'
})) ?? [])

</script>
<style lang="scss">
.vuecal__event {
  color: white;
  background: theme("colors.red.pnp");
}
</style>
<template>
  <div class="w-full">
    <BookingModal :restaurant-id="restaurantId" :booking="selectedBooking" v-if="selectedBooking" @close="closeDialog"
      @deleted="selectedBooking = undefined; loadBookings()" @saved="selectedBooking = undefined; loadBookings()"
      @select:table="tableSelectorVisible = true">
    </BookingModal>
    <Modal v-if="tableSelectorVisible">
      <template v-slot:content>
        <OrdersFloorView :table-groups-map="tableGroupsMap"
          @selected:table="selectedBooking!.tableId = $event; tableSelectorVisible = false"></OrdersFloorView>
      </template>
    </Modal>
    <div class="flex items-center justify-center w-full">
      <div
        class="bg-white -mb-1 justify-between w-full shadow-default flex h-10 m-2 mr-3 items-center overflow-y-hidden px-2 rounded overflow-x-auto max-w-full">
        <button class="btn-action flex h-8 primary-fill w-auto" @click="createNewBooking()">
          <span class="mdi mdi-plus"></span>
          <span>{{ $tc('new') }}</span>
        </button>
      </div>
    </div>

    <ScrollableDiv class="page-content" :height="pageContentHeight - 45">
      <VueCal active-view="week" :disable-views="['years', 'year', 'day']" v-model:selected-date="selectedDate"
        @cell-dblclick="createNewBooking($event)" show-time-in-cells small :on-event-click="onEventClick"
        :on-event-create="onEventCreate" @event-drag-create="eventDragCreate" :events="bookings ?? []"
        :snap-to-time="15" :drag-to-create-threshold="15"
        :editable-events="{ drag: false, resize: false, delete: false, create: true }">
      </VueCal>
    </ScrollableDiv>
  </div>
</template>
