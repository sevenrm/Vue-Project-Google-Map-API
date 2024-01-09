<script lang="ts" setup>
import { nameof } from 'ts-simple-nameof'
import { ref, PropType, watch } from 'vue'
import { apiClient } from '../../services/api'
import { CompanyViewModel, SupplierCategoryTypeEnum, SupplierViewModel } from '../../services/api.client'
import { notifier } from '../../services/notification'
import { FormBuilderFieldGroupDefinition } from '../../components/ui/types'
import Address from '../shared/Address.vue'
import Collapse from '../ui/Collapse.vue'
import FormBuilder from '../ui/FormBuilder.vue'
import Modal from '../ui/Modal.vue'

const props = defineProps({
  supplier: {
    type: Object as PropType<SupplierViewModel>,
    required: true
  },
  restaurantId: {
    type: String,
    required: true
  }
})
const supplierLocal = ref(props.supplier)
watch(() => props.supplier, () => supplierLocal.value = props.supplier)

const emits = defineEmits(['close', 'saved', 'deleted'])
const isLoading = ref(false)

const deleteSupplier = async () => {
  isLoading.value = true
  try {
    await apiClient.restaurantsupplierDelete(props.restaurantId, supplierLocal.value.id!)
    emits('deleted')
    notifier.notifySuccess('deleted', 'supplier')
  } catch (error) {
    notifier.notifyError('deleting', error, 'supplier')
  }
  isLoading.value = false
}

const saveSupplier = async () => {
  isLoading.value = true
  try {
    await apiClient.restaurantsupplierPost(props.restaurantId, supplierLocal.value)
    emits('saved')
    emits('close')
    notifier.notifySuccess('saved', 'supplier')
  } catch (error) {
    notifier.notifyError('saving', error, 'supplier')
  }
  isLoading.value = false
}

const supplierFieldGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<SupplierViewModel>(m => m.labels)]: {
      type: 'text',
      name: '@'
    },
    [nameof<SupplierViewModel>(m => m.notes)]: {
      type: 'textarea',
      name: '@'
    },
    [nameof<SupplierViewModel>(m => m.supplierCategoryId)]: {
      type: 'enum',
      enumValue: SupplierCategoryTypeEnum,
      enumName: 'SupplierCategoryTypeEnum',
      name: 'category'
    }
  }
])

const companyFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<CompanyViewModel>(m => m.tradingName)]: {
      type: 'text',
      name: '@'
    },
    [nameof<CompanyViewModel>(m => m.legalName)]: {
      type: 'text',
      name: '@'
    },
    [nameof<CompanyViewModel>(m => m.registrationNumber)]: {
      type: 'text',
      name: '@'
    }
  } as FormBuilderFieldGroupDefinition, {
    [nameof<CompanyViewModel>(m => m.phoneNumber)]: {
      type: 'text',
      name: '@'
    },
    [nameof<CompanyViewModel>(m => m.emailAddress)]: {
      type: 'text',
      name: '@'
    }
  } as FormBuilderFieldGroupDefinition
])

// const addContact = () => supp.value?.company?.owners?.push(PersonViewModel.fromJS({
//   address: new AddressViewModel(),
//   registrationDocument: new DocumentViewModel()
// })!)

</script>
<template>
  <Modal v-if="supplierLocal" :is-loading="isLoading" :title="!!supplierLocal.id ? 'updateSupplier' : 'createSupplier'"
    @close="$emit('close')"
    :action-buttons="[{ text: 'confirm', colorClass: 'success-fill', iconName: 'content-save', action: () => saveSupplier() }, ...(supplierLocal.id ? [{ text: 'delete', iconName: 'delete', colorClass: 'danger', action: () => deleteSupplier() }] : [])]">
    <template v-slot:content>
      <div class="flex flex-col">

        <FormBuilder :is-loading="isLoading" :fields-groups="companyFieldsGroups" v-model="supplierLocal.company">
        </FormBuilder>
        <div class="-mx-4 -mb-3">
          <Collapse title="address">
            <div class="px-4 py-2">
              <Address :is-loading="isLoading" v-model="supplierLocal.company!.registeredAddress" />
            </div>
          </Collapse>
          <Collapse title="extra" :is-open="true">
            <div class="px-4 py-2">
              <FormBuilder :is-loading="isLoading" v-model="supplierLocal" :fields-groups="supplierFieldGroups">
              </FormBuilder>
            </div>
          </Collapse>
          <!-- <Collapse title="contacts">
            <button class="btn-action primary-fill" @click="addContact()">
              <span class="mdi mdi-plus"></span>
              {{ $tc('add') }}
            </button>
            <ul>
              <li class="card relative px-0 pb-0" v-for="(contact, idx) of supplier.contacts!" :key="contact.id">
                <Person :is-loading="isLoading" v-model="supplier.contacts![idx]" @change="" />
                <div
                  class="bg-white absolute -top-2 shadow -right-2 rounded-full w-8 h-8 flex items-center justify-center">
                  <button class="btn-action-icon" @click="supplier.contacts.splice(idx, 1)">
                    <span class="mdi mdi-delete"></span>
                  </button>
                </div>
              </li>
            </ul>
          </Collapse> -->
        </div>
      </div>
    </template>
  </Modal>
</template>
