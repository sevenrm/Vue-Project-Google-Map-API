<script lang="ts" setup>
import { ref } from 'vue'
import { apiClient } from '../../services/api'
import { SelectOptionViewModel } from '../../services/api.client'
import { notifier } from '../../services/notification'
import Modal from '../ui/Modal.vue'
import ScrollableDiv from '../ui/ScrollableDiv.vue'

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

defineEmits(['close', 'new', 'selected'])

const searchInput = ref('')
const isLoading = ref(false)
const selectedCustomerId = ref()
const customers = ref<SelectOptionViewModel[]>([])
const loadOptions = async () => {
  isLoading.value = true
  try {
    if (searchInput.value)
      customers.value = await apiClient.customerAutocomplete(props.restaurantId, searchInput.value)
    else
      customers.value = []
  } catch (error) {
    notifier.notifyError('loading', error, 'customers')
  }
  isLoading.value = false
}
</script>
<template>
  <Modal @close="$emit('close')" :action-buttons="[
    { text: 'confirm', colorClass: 'success-fill', iconName: 'content-save', action: () => $emit('selected', selectedCustomerId), disabled: () => !selectedCustomerId },
    { text: 'new', colorClass: 'primary-fill', iconName: 'plus', action: () => $emit('new') },
  ]">
    <template v-slot:content>
      <div>
        <div class="card relative flex items-center gap-1 grow">
          <span class="mdi mdi-magnify text-gray-body"></span>
          <input v-model="searchInput" @input="loadOptions" type="text" class="outline-none w-full"
            :placeholder="$tc('search')" />
          <div class="absolute right-2 my-auto top-0 bottom-0 flex items-center justify-center" v-if="searchInput"
            @click="searchInput = ''; customers = []">
            <span class="mdi mdi-close text-primary"></span>
          </div>
        </div>
        <ul class="mt-2">
          <li class="relative cursor-pointer py-2 bg-white rounded-default shadow-default mb-2 pl-3 border-red-pnp"
            @click="selectedCustomerId = selectedCustomerId === customer.value ? undefined : customer.value"
            v-for="customer of customers" :key="customer.value">
            <span v-if="selectedCustomerId === customer.value"
              class="absolute top-0 bottom-0 my-auto left-0 w-1 h-10 rounded-l bg-red-pnp"></span>
            <span class="font-medium">
              {{
                customer.label
              }}
            </span>
          </li>
        </ul>
      </div>
    </template>
  </Modal>
</template>
