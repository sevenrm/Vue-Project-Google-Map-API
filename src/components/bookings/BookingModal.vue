<script lang="ts" setup>
import { nameof } from 'ts-simple-nameof'
import { useForm } from 'vee-validate'
import { PropType, ref } from 'vue'
import { string } from 'yup'
import { apiClient } from '../../services/api'
import { BookingStatusEnum, BookingViewModel, NotificationMediumTypeEnum } from '../../services/api.client'
import { notifier } from '../../services/notification'
import { FormBuilderFieldGroupDefinition } from '../../components/ui/types'
import FormBuilder from '../ui/FormBuilder.vue'
import Modal from '../ui/Modal.vue'

const isLoading = ref(false)
const isEditMode = ref(false)

const props = defineProps({
  booking: {
    type: Object as PropType<BookingViewModel>,
    default: new BookingViewModel()
  },
  restaurantId: {
    type: String,
    required: true
  }
})

const emits = defineEmits(['saved', 'deleted', 'closed', 'update:booking', 'select:table'])

const bookingFieldGroup = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<BookingViewModel>(m => m.name)]: {
      type: 'text',
      name: '@',
      disabled: (model: BookingViewModel) => !isEditMode.value && !!model.id
    },
    [nameof<BookingViewModel>(m => m.surname)]: {
      type: 'text',
      name: '@',
      disabled: (model: BookingViewModel) => !isEditMode.value && !!model.id
    },
    [nameof<BookingViewModel>(m => m.phoneNumber)]: {
      type: 'text',
      name: '@',
      disabled: (model: BookingViewModel) => !isEditMode.value && !!model.id
    },
    [nameof<BookingViewModel>(m => m.email)]: {
      type: 'email',
      name: '@',
      rules: string().email(),
      disabled: (model: BookingViewModel) => !isEditMode.value && !!model.id
    },
    [nameof<BookingViewModel>(m => m.startDate)]: {
      type: 'datetime',
      name: '@',
      disabled: (model: BookingViewModel) => !!model.id
    },
    [nameof<BookingViewModel>(m => m.endDate)]: {
      type: 'datetime',
      name: '@',
      disabled: (model: BookingViewModel) => !!model.id
    },
    [nameof<BookingViewModel>(m => m.guestNumber)]: {
      type: 'number',
      name: '@',
      disabled: (model: BookingViewModel) => !isEditMode.value && !!model.id
    },
    [nameof<BookingViewModel>(m => m.tableId)]: {
      type: 'text',
      name: 'table',
      click: () => emits('select:table'),
      disabled: (model: BookingViewModel) => !isEditMode.value && !!model.id
    },
    [nameof<BookingViewModel>(m => m.notifyBy)]: {
      type: 'enum-multi',
      enumValue: NotificationMediumTypeEnum,
      enumName: 'NotificationMediumTypeEnum',
      name: '@',
      if: (model: BookingViewModel) => !model.id
    }
  } as FormBuilderFieldGroupDefinition
])

const form = useForm()
const validateForm = async () => {
  await form.validate()
}

const updateBookingStatus = async (statusId: BookingStatusEnum) => {
  isLoading.value = true
  try {
    await apiClient.bookingStatus(props.restaurantId, props.booking.id!, statusId)
    notifier.notifySuccess('updated', 'booking')
    emits('saved')
  } catch (error) {
    notifier.notifyError('saving', error, 'booking')
  }
  isLoading.value = false
}

const saveBooking = async () => {
  isLoading.value = true
  try {
    await apiClient.bookingPut(props.restaurantId, props.booking)
    emits('saved')
    notifier.notifySuccess('saved', 'booking')
  } catch (error) {
    notifier.notifyError('saving', error, 'booking')
  }
  isLoading.value = false
}

const notifyBooking = async (notificationMediumTypeId: NotificationMediumTypeEnum) => {
  isLoading.value = true
  try {
    await apiClient.bookingNotify(props.restaurantId, props.booking.id!, notificationMediumTypeId)
    emits('saved')
    notifier.notifySuccess('notified', 'booking')
  } catch (error) {
    notifier.notifyError('notifying', error, 'booking')
  }
  isLoading.value = false
}
</script>
<template>
  <Modal v-if="booking" @close="$emit('closed')" :is-loading="isLoading"
    :title="booking.id ? 'updateBooking' : 'createBooking'" :action-buttons="[
      ...(isEditMode || !booking.id ? [{
        text: booking.id ? 'update' : 'create',
        colorClass: 'success-fill',
        iconName: 'content-save',
        action: () => saveBooking()
      }] : []),
      ...(booking.id ? [
        ...(booking.phoneNumber ? [{ text: 'notifySMS', iconName: 'phone', colorClass: 'success', action: () => notifyBooking(NotificationMediumTypeEnum.SMS) }] : []),
        ...(booking.email ? [{ text: 'notifyEmail', iconName: 'email', colorClass: 'success', action: () => notifyBooking(NotificationMediumTypeEnum.EMAIL) }] : []),
        ...(booking.bookingStatusId === BookingStatusEnum.Created && !isEditMode ? [
          { text: 'accept', iconName: 'check', colorClass: 'success', action: () => updateBookingStatus(BookingStatusEnum.Accepted) },
          { text: 'reject', iconName: 'delete', colorClass: 'danger', action: () => updateBookingStatus(BookingStatusEnum.Rejected) }
        ] : []),
        ...([BookingStatusEnum.Accepted, BookingStatusEnum.Rejected].includes(booking.bookingStatusId) ? [
          { text: 'cancel', iconName: 'cancel', colorClass: 'danger', action: () => updateBookingStatus(BookingStatusEnum.CancelledByRestaurant) }
        ] : [])
      ] : [])]">
    <template v-slot:content>
      <div>
        <FormBuilder :is-loading="isLoading" @update:model-value="$emit('update:booking', $event)" :model-value="booking"
          :fields-groups="bookingFieldGroup" @changed="validateForm">
        </FormBuilder>
      </div>
    </template>
  </Modal>
</template>
