<script lang="ts" setup>
import { nameof } from 'ts-simple-nameof'
import { useForm } from 'vee-validate'
import { onMounted, PropType, ref } from 'vue'
import { string } from 'yup'
import { apiClient } from '../../services/api'
import { AddressViewModel, BookingStatusEnum, BookingViewModel, CompanyViewModel, CustomerViewModel, NotificationMediumTypeEnum, PersonViewModel } from '../../services/api.client'
import { notifier } from '../../services/notification'
import { FormBuilderFieldGroupDefinition } from '../../components/ui/types'
import FormBuilder from '../ui/FormBuilder.vue'
import Modal from '../ui/Modal.vue'
import Person from '../shared/Person.vue'
import Company from '../shared/Company.vue'
import Collapse from '../ui/Collapse.vue'

const isLoading = ref(false)
const customer = ref<CustomerViewModel>(CustomerViewModel.fromJS({ person: PersonViewModel.fromJS({ address: new AddressViewModel() }), company: CompanyViewModel.fromJS({ registeredAddress: new AddressViewModel() }) })!)

const props = defineProps({
  customerId: String,
  showChange: Boolean,
  restaurantId: {
    type: String,
    required: true
  }
})

const emits = defineEmits(['saved', 'deleted', 'close', 'change'])

const customerFieldGroup = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<CustomerViewModel>(m => m.notes)]: {
      type: 'textarea',
      name: '@'
    }
  } as FormBuilderFieldGroupDefinition
])

const form = useForm()
const validateForm = async () => {
  await form.validate()
}

const loadCustomer = async () => {
  if (!props.customerId) return
  isLoading.value = true
  try {
    customer.value = await apiClient.customerGet(props.restaurantId, props.customerId!)
  } catch (error) {
    notifier.notifyError('loading', error, 'customer')
  }
  isLoading.value = false
}

const saveCustomer = async () => {
  isLoading.value = true
  try {
    const customerId = await apiClient.customerPut(props.restaurantId, customer.value!)
    emits('saved', customerId)
    emits('close')
    notifier.notifySuccess('saved', 'customer')
  } catch (error) {
    notifier.notifyError('saving', error, 'customer')
  }
  isLoading.value = false
}

const deleteCustomer = async () => {
  isLoading.value = true
  try {
    await apiClient.customerDelete(props.restaurantId, customer.value!.id!)
    emits('deleted')
    emits('close')
    notifier.notifySuccess('deleted', 'customer')
  } catch (error) {
    notifier.notifyError('deleting', error, 'customer')
  }
  isLoading.value = false
}

onMounted(() => loadCustomer())

</script>
<template>
  <Modal v-if="customer" @close="$emit('close')" :is-loading="isLoading"
    :title="customer.id ? 'updateCustomer' : 'createCustomer'" :action-buttons="[
      { text: 'confirm', colorClass: 'success-fill', iconName: 'content-save', action: () => saveCustomer() },
      ...(customer.id ? [{ text: 'delete', iconName: 'delete', colorClass: 'danger', action: () => deleteCustomer() }] : []),
      ...(showChange && customer.id ? [{ text: 'change', iconName: 'sync', colorClass: 'lime', action: () => $emit('change') }] : [])
    ]">
    <template v-slot:content>
      <Collapse title="details" :is-open="true" class="-mx-4">
        <Person :is-loading="isLoading" v-model="customer.person"></Person>
        <div class="p-3 border-t">
          <FormBuilder :is-loading="isLoading" :model-value="customer" :fields-groups="customerFieldGroup"
            @changed="validateForm">
          </FormBuilder>
        </div>
      </Collapse>
      <Collapse title="company" class="-mx-4 -mb-4 border-b">
        <Company :is-loading="isLoading" v-model="customer.company"></Company>
      </Collapse>
    </template>
  </Modal>
</template>
