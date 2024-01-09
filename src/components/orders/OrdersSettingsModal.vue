<script lang="ts" setup>
import { computed, ComputedRef, PropType, Ref, ref, watch } from 'vue'
import { MenuCategoryViewModel, OrderStatusEnum, OrderTypeEnum, PrinterViewModel, TableGroupViewModel } from '../../services/api.client'
import { store } from '../../services/store'
import { Option } from '../../types'
import { enumToArray } from '../../services/utils'
import FormBuilder from '../ui/FormBuilder.vue'
import Modal from '../ui/Modal.vue'
import { apiClient } from '../../services/api'
import { notifier } from '../../services/notification'
import CheckedList from '../ui/CheckedList.vue'
import Collapse from '../ui/Collapse.vue'
import { nameof } from 'ts-simple-nameof'
import { FormBuilderFieldGroupDefinition } from '../ui/types'
import { AudioSource, OrdersSettings } from './orders-settings'

const emits = defineEmits(['update:isOpen', 'update:orderSettings'])
const props = defineProps({
  isOpen: Boolean,
  menuId: {
    type: String,
    required: true
  },
  orderSettings: {
    type: Object as PropType<OrdersSettings>,
    required: true
  },
  categories: {
    type: Array as PropType<MenuCategoryViewModel[]>,
    required: true
  },
  tableGroupsMap: {
    type: Object as PropType<{ [tableGroupId: string]: TableGroupViewModel }>,
    required: true
  },
  printersMap: {
    type: Object as PropType<{ [printerId: string]: PrinterViewModel }>,
    required: true
  },
  restaurantId: {
    type: String,
    required: true
  }
})

const orderSettingsLocal = ref(props.orderSettings)
watch(() => props.orderSettings, () => orderSettingsLocal.value = props.orderSettings)
const isLoading = ref<boolean>(false)
const statusOptions = ref(enumToArray(OrderStatusEnum).map(v => ({ value: OrderStatusEnum[v as any], label: v })))
const categoriesOptions: ComputedRef<Option[]> = computed(() => props.categories.map(category => ({ value: category.id, label: category.languageInfo[store.selectedRestaurant.value!.defaultLangCode].name } as Option)))
const tableGroupOptions: ComputedRef<Option[]> = computed(() => Object.values(props.tableGroupsMap).map(({ id, name }) => ({ value: id!, label: name })))
const printersOptions: ComputedRef<Option[]> = computed(() => Object.values(props.printersMap).map(p => ({ label: p.name, value: p.id }) as Option))

const updateOrderTypeStatus = async (orderTypeId: OrderTypeEnum, isOpen: boolean) => {
  try {
    await apiClient.restaurantOrderstatus(props.restaurantId, orderTypeId, isOpen)
    store.selectedRestaurant.value!.orderChannels!.find(x => x.orderTypeId === orderTypeId)!.isOpen = isOpen
    notifier.notifySuccess('updated', 'orderStatus')
  } catch (error) {
    notifier.notifyError('updating', error, 'orderStatus')
  }
}

const updateTableAutoJoinLock = async (val: boolean) => {
  try {
    await apiClient.restaurantTableautojoin(props.restaurantId, val)
    store.selectedRestaurant.value!.disableRequireApprovalToJoinTable = val
    notifier.notifySuccess('updated', 'settings')
  } catch (error) {
    notifier.notifyError('updating', error, 'settings')
  }
}

const settingsFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<OrdersSettings>(m => m.audioSource)]: {
      type: 'enum',
      enumValue: AudioSource,
      name: 'notificationSound',
      skipTranslation: true
    },
    [nameof<OrdersSettings>(m => m.notificationIntervalSeconds)]: {
      type: 'number',
      name: '@'
    },
    [nameof<OrdersSettings>(m => m.printReceiptOnSettle)]: {
      type: 'toggle',
      name: '@'
    },
    [nameof<OrdersSettings>(m => m.showSelectorAsGrid)]: {
      type: 'toggle',
      name: '@'
    }
  }
])

const printerCategorySelected = (printerId: string, categoriesIds: string[]) => {
  if (!orderSettingsLocal.value.automaticPrintDevices[props.menuId])
    orderSettingsLocal.value.automaticPrintDevices[props.menuId] = {}
  orderSettingsLocal.value.automaticPrintDevices[props.menuId][printerId] = categoriesIds
  emits('update:orderSettings', orderSettingsLocal.value)
}
</script>
<template>
  <Modal v-if="isOpen" @close="$emit('update:isOpen', false)" :is-loading="isLoading" title="orderSettings">
    <template v-slot:content>
      <div class="-mx-4 -mb-4">
        <Collapse icon="cog" title="settings">
          <div class=" py-2 px-3">
            <FormBuilder :is-loading="false" v-model="orderSettingsLocal" :fields-groups="settingsFieldsGroups">
            </FormBuilder>
          </div>
        </Collapse>
        <Collapse title="ordersFilter" icon="filter">
          <CheckedList v-model="orderSettingsLocal.statusFilters"
            @update:model-value="$emit('update:orderSettings', orderSettingsLocal)" :items="statusOptions"
            labelProp="label" :exclusive="true" valueProp="value">
          </CheckedList>
        </Collapse>
        <Collapse title="tablesFilter" icon="table-chair">
          <CheckedList v-model="orderSettingsLocal.tableGroupsFilters"
            @update:model-value="$emit('update:orderSettings', orderSettingsLocal)" :items="tableGroupOptions"
            labelProp="label" :exclusive="true" :skip-translation="true" valueProp="value">
          </CheckedList>
        </Collapse>
        <Collapse title="categoriesFilter" icon="filter">
          <CheckedList v-model="orderSettingsLocal.categoryFilters"
            @update:model-value="$emit('update:orderSettings', orderSettingsLocal)" :items="categoriesOptions"
            labelProp="label" :exclusive="true" :skip-translation="true" valueProp="value">
          </CheckedList>
        </Collapse>
        <Collapse title="printers" icon="printer">
          <div class="flex flex-col">
            <Collapse :skip-translation="true" :title="printer.label" v-for="printer of printersOptions"
              :key="printer.value">
              <CheckedList :model-value="orderSettingsLocal.automaticPrintDevices?.[menuId]?.[printer.value] ?? []"
                :skip-translation="true" @update:model-value="printerCategorySelected((printer.value as string), $event)"
                :items="categoriesOptions" labelProp="label" valueProp="value">
              </CheckedList>
            </Collapse>
          </div>
        </Collapse>
        <Collapse title="opening" icon="lock-open">
          <ul class="py-1" aria-labelledby="dropdownButton">
            <li v-for="orderChannel of store.selectedRestaurant.value?.orderChannels ?? []"
              :key="orderChannel.orderTypeId"
              class="flex cursor-pointer px-2 py-1 text-base hover:text-red-pnp font-medium hover:bg-gray-100 transition-colors duration-150">
              <label class="form-label row items-center cursor-pointer">
                <input type="checkbox"
                  @change="updateOrderTypeStatus(orderChannel.orderTypeId, ($event.target as any).checked)"
                  class="form-checkbox" :checked="store.selectedRestaurant.value?.orderChannels" />
                <span class="ml-2">{{ $tc(`${OrderTypeEnum[orderChannel.orderTypeId]}OrderOpen`) }}</span>
              </label>
            </li>
          </ul>
        </Collapse>
        <Collapse title="tableSettings" icon="table-chair" :is-last="true">
          <div class="p-2">
            <label class="form-label row items-center cursor-pointer">
              <input type="checkbox" @change="updateTableAutoJoinLock(($event.target as any).checked)"
                class="form-checkbox" :checked="store.selectedRestaurant.value!.disableRequireApprovalToJoinTable" />
              <span class="ml-2">{{ $tc(`disableRequireApprovalToJoinTable`) }}</span>
            </label>
          </div>
        </Collapse>
      </div>
    </template>
  </Modal>
</template>
