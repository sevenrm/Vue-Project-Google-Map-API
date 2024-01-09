<script setup lang="ts">
import { Ref, ref, watch, onMounted } from 'vue'
import { apiClient } from '../services/api'
import { OrderViewModel, CustomerViewModel, CustomerSearchRequest, PaginatedResultOfCustomerViewModel, CompanyViewModel, AddressViewModel, PersonViewModel } from '../services/api.client'
import { pageContentHeight } from '../services/utils'
import { store } from '../services/store'
import { useRouter } from 'vue-router'
import TableBuilder from '../components/ui/TableBuilder.vue'
import { notifier } from '../services/notification'
import { nameof } from 'ts-simple-nameof'
import { FormBuilderFieldGroupDefinition, TableBuilderFieldDefinition } from '../components/ui/types'
import FormBuilder from '../components/ui/FormBuilder.vue'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'
import CustomerModal from '../components/customers/CustomerModal.vue'

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const customerModalVisible = ref(false)
const selectedCustomerId = ref<string | undefined>()
const isLoading = ref(false)
const customersResponse: Ref<PaginatedResultOfCustomerViewModel | undefined> = ref(undefined)
const customerSearchRequest = ref(new CustomerSearchRequest())

const loadCustomers = async (pageIdx = 0, pageSize = 10) => {
  isLoading.value = true
  customerSearchRequest.value.pageIdx = pageIdx
  customerSearchRequest.value.pageSize = pageSize
  try {
    customersResponse.value = await apiClient.customerSearch(props.restaurantId, customerSearchRequest.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'history')
  }
  isLoading.value = false
}

const router = useRouter()

watch(store.selectedRestaurant, () => {
  if (!store.selectedRestaurant.value) return
  loadCustomers()
})

onMounted(() => {
  loadCustomers()
})

const columnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<CustomerViewModel>(m => m.id)]: {
    type: 'id',
    name: '@'
  },
  [nameof<CustomerViewModel>(m => m.person!.firstName)]: {
    type: 'string',
    name: '@'
  },
  [nameof<CustomerViewModel>(m => m.person!.lastName)]: {
    type: 'string',
    name: '@'
  },
  [nameof<CustomerViewModel>(m => m.person!.email)]: {
    type: 'string',
    name: '@'
  },
  [nameof<CustomerViewModel>(m => m.person!.mobilePhoneNumber)]: {
    type: 'string',
    name: '@'
  },
  edit: {
    type: 'icon',
    iconName: 'pencil',
    clicked: (model: CustomerViewModel) => {
      selectedCustomerId.value = model.id!
      customerModalVisible.value = true
    }
  }
})

const searchFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    '[class]': 'grid grid-cols-3 gap-2',
    [nameof<CustomerSearchRequest>(m => m.fullName)]: {
      type: 'text',
      name: '@'
    },
    [nameof<CustomerSearchRequest>(m => m.email)]: {
      type: 'text',
      name: '@'
    },
    [nameof<CustomerSearchRequest>(m => m.phoneNumber)]: {
      type: 'text',
      name: '@'
    }
  }
])


</script>
<template>
  <div class="w-full">
    <CustomerModal v-if="customerModalVisible" :restaurant-id="restaurantId" :customer-id="selectedCustomerId"
      @saved="loadCustomers(customerSearchRequest.pageIdx, customerSearchRequest.pageSize)"
      @close="customerModalVisible = false; selectedCustomerId = undefined">
    </CustomerModal>
    <ScrollableDiv class="page-content" :height="pageContentHeight">
      <TableBuilder :items="customersResponse?.items ?? []" :total-pages="customersResponse?.totalPages"
        :total-records="customersResponse?.totalRecords" :is-loading="isLoading" :change-page-callback="loadCustomers"
        :show-pages="true" :columns="columnDefinition"
        @clicked="selectedCustomerId = $event.id; customerModalVisible = true">
        <template v-slot:action-buttons-left>
          <div class="flex items-center flex-1 w-full">
            <button class="btn-action primary-fill" @click="customerModalVisible = true">
              <span class="mdi mdi-plus"></span>
              <span>{{ $tc('add') }}</span>
            </button>
          </div>
        </template>
        <template v-slot:head>
          <FormBuilder :is-loading="isLoading" :fields-groups="searchFieldsGroups" v-model="customerSearchRequest">
          </FormBuilder>
        </template>
      </TableBuilder>
    </ScrollableDiv>
  </div>
</template>
