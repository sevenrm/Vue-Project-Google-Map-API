<script lang="ts" setup>
import { onMounted, Ref, ref, watch } from 'vue'
import { apiClient } from '../services/api'
import { DeviceViewModel, PrinterConnectionTypeEnum, PrinterViewModel } from '../services/api.client'
import { store } from '../services/store'
import InputModal from '../components/ui/InputModal.vue'
import Toggle from '../components/ui/Toggle.vue'
import SimpleSpinner from '../components/ui/SimpleSpinner.vue'
import LoadingButton from '../components/ui/LoadingButton.vue'
import Modal from '../components/ui/Modal.vue'
import { FormBuilderFieldGroupDefinition, ModalSize, TableBuilderFieldDefinition } from '../components/ui/types'
import { clone, getVariableName, pageContentHeight, pageContentHeightPx } from '../services/utils'
import { useShowConfirm } from '../services/injections'
import { notifier } from '../services/notification'
import TableBuilder from '../components/ui/TableBuilder.vue'
import { nameof } from 'ts-simple-nameof'
import Collapse from '../components/ui/Collapse.vue'
import FormBuilder from '../components/ui/FormBuilder.vue'
import IpAddressInput from '../components/ui/IpAddressInput.vue'
import { openCashbox, testPrinter } from '../services/printer'
import { deviceApp } from '../services/deviceapp'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const isLoadingDetail = ref(false)
const isLoading = ref(false)
const printerDetailModal: Ref<PrinterViewModel | null> = ref(null)
const inputModalFn: Ref<((input: string) => void) | null> = ref(null)
const devicesMap: Ref<{ [deviceId: string]: DeviceViewModel }> = ref({})
const selectedDeviceId: Ref<string | undefined> = ref(undefined)
const printerMap: Ref<{ [printerId: string]: PrinterViewModel }> = ref({})
const inputModalInitialValue = ref('')
const showConfirm = useShowConfirm()

const loadDevices = async () => {
  isLoading.value = true
  try {
    const devices = await apiClient.devices(props.restaurantId, true)
    devicesMap.value = devices.reduce((map, device) => ({ ...map, [device.id!]: device }), {})
  } catch (error) {
    notifier.notifyError('loading', error, 'devices')
  }
  isLoading.value = false
}

const addDevice = async (name: string) => {
  try {
    isLoading.value = true
    const token = await apiClient.devicePut(props.restaurantId, DeviceViewModel.fromJS({
      deviceMachineId: store.deviceCredentials.value!.id,
      name
    })!)
    deviceApp.addDevice(token)
  } catch (error) {
    notifier.notifyError('adding', error, 'device')
  }
  isLoading.value = false
}

const bindDevice = async (deviceId: string) => {
  try {
    isLoading.value = true
    const deviceMachineId = store.deviceCredentials.value!.id
    if (store.deviceCredentials.value?.token)
      store.logoutDevice()
    const token = await apiClient.deviceBind(props.restaurantId, deviceId, deviceMachineId)
    deviceApp.addDevice(token)
  } catch (error) {
    notifier.notifyError('adding', error, 'device')
  }
  isLoading.value = false
}

const deleteDevice = async (deviceId: string) => {
  showConfirm('proceedQuestion', async () => {
    isLoading.value = true
    try {
      await apiClient.deviceDelete(props.restaurantId, deviceId)
      notifier.notifySuccess('removed', 'device')
      if (selectedDeviceId.value === deviceId)
        selectedDeviceId.value = undefined
      if (store.deviceCredentials.value?.id === devicesMap.value[deviceId].deviceMachineId) {
        deviceApp.logoutDevice()
        location.reload()
      }
      await loadDevices()
    } catch (error) {
      notifier.notifyError('removing', error, 'device')
    }
    isLoading.value = false
  })
}

const updateDevice = async (deviceId: string) => {
  isLoading.value = true
  try {
    const device = devicesMap.value[deviceId]
    await apiClient.devicePost(props.restaurantId, deviceId, device)
    notifier.notifySuccess('updated', 'device')
    await loadDevices()
  } catch (error) {
    notifier.notifyError('updating', error, 'device')
  }
  isLoading.value = false
}

const updatePrinter = async () => {
  isLoading.value = true
  try {
    await apiClient.devicePrinterPost(props.restaurantId, selectedDeviceId.value!, printerDetailModal.value!)
    printerDetailModal.value = null
    notifier.notifySuccess('updated', 'printer')
    await selectDevice(selectedDeviceId.value!)
  } catch (error) {
    notifier.notifyError('updating', error, 'printer')
  }
  isLoading.value = false
}

const selectDevice = async (deviceId: string) => {
  selectedDeviceId.value = deviceId
  try {
    isLoadingDetail.value = true
    const printers = await apiClient.restaurantPrinters(props.restaurantId, deviceId)
    printerMap.value = printers.reduce((map, printer) => ({ ...map, [printer.id!]: printer }), {})
  } catch (error) {
    notifier.notifyError('loading', error, 'device')
  }
  isLoadingDetail.value = false
}
const deletePrinter = async (deviceId: string, printerId: string) => {
  showConfirm('proceedQuestion', async () => {
    isLoading.value = true
    try {
      await apiClient.devicePrinterDelete(props.restaurantId, deviceId, printerId)
      notifier.notifySuccess('removed', 'printer')
      printerDetailModal.value = null
    } catch (error) {
      notifier.notifyError('removing', error, 'device')
    }
    isLoading.value = false
    await selectDevice(selectedDeviceId.value!)
  })
}

const updateDeviceNameGenerator = (deviceId: string) => (name: string) => {
  devicesMap.value[deviceId].name = name
  inputModalInitialValue.value = ''
  updateDevice(deviceId)
}

const createNewPrinter = () => printerDetailModal.value = new PrinterViewModel()

const removeCurrentDevice = () => showConfirm('proceedQuestion', () => {
  store.logoutDevice()
  location.reload()
})

const devicesColumnsDefinition = ref<TableBuilderFieldDefinition>({
  isCurrent: {
    type: 'slot',
    name: '',
    columnClass: 'w-10'
  },
  [nameof<DeviceViewModel>(m => m.id)]: {
    type: 'id',
    name: '@'
  },
  [nameof<DeviceViewModel>(m => m.name)]: {
    type: 'string',
    name: '@'
  },
  status: {
    type: 'slot',
    name: '@'
  },
  [nameof<DeviceViewModel>(m => m.isEnabled)]: {
    type: 'toggle',
    name: '@',
    toggleUpdated: (device: DeviceViewModel) => updateDevice(device.id!)
  },
  bind: {
    name: '',
    type: 'icon',
    iconName: 'connection',
    if: () => !!store.deviceCredentials.value,
    clicked: (device: DeviceViewModel) => bindDevice(device.id!)
  },
  edit: {
    name: '',
    type: 'icon',
    iconName: 'pencil',
    clicked: (device: DeviceViewModel) => {
      inputModalInitialValue.value = device.name!
      inputModalFn.value = updateDeviceNameGenerator(device.id!)
    }
  },
  delete: {
    name: '',
    type: 'icon',
    iconName: 'delete',
    clicked: (device: DeviceViewModel) => deleteDevice(device.id!)
  }
})

const printersColumnsDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<PrinterViewModel>(m => m.id)]: {
    type: 'id',
    name: '@'
  },
  [nameof<PrinterViewModel>(m => m.name)]: {
    type: 'string',
    name: '@'
  },
  [nameof<PrinterViewModel>(m => m.ipAddress)]: {
    type: 'string',
    name: '@'
  },
  [nameof<PrinterViewModel>(m => m.size)]: {
    type: 'string',
    name: '@'
  },
  isDefault: {
    type: 'slot',
    name: '@'
  },
  delete: {
    type: 'icon',
    name: '@',
    iconName: 'delete',
    clicked: (printer: PrinterViewModel) => deletePrinter(selectedDeviceId.value!, printer.id!)
  },
  print: {
    type: 'icon',
    name: '@',
    iconButtonClass: 'indigo',
    iconName: 'printer',
    clicked: (printer: PrinterViewModel) => testPrinter(props.restaurantId, selectedDeviceId.value!, printer)
  },
  cashbox: {
    type: 'icon',
    name: '@',
    iconName: 'cash-register',
    clicked: (printer: PrinterViewModel) => openCashbox(props.restaurantId, selectedDeviceId.value!, printer)
  }
})

const printerModalFieldGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<PrinterViewModel>(m => m.name)]: {
      type: 'text',
      name: '@'
    },
    [nameof<PrinterViewModel>(m => m.printerConnectionTypeId)]: {
      type: 'enum',
      enumValue: PrinterConnectionTypeEnum,
      enumName: 'PrinterConnectionTypeEnum',
      name: 'connectionType'
    },
    [nameof<PrinterViewModel>(m => m.ipAddress)]: {
      type: 'ipaddress',
      name: '@',
      if: (model: PrinterViewModel) => model.printerConnectionTypeId === PrinterConnectionTypeEnum.Network
    },
    [nameof<PrinterViewModel>(m => m.size)]: {
      type: 'number',
      name: '@'
    },
    [nameof<PrinterViewModel>(m => m.isKitchenMode)]: {
      type: 'toggle',
      name: '@'
    },
    [nameof<PrinterViewModel>(m => m.hasCashDrawer)]: {
      type: 'toggle',
      name: '@'
    },
    [nameof<PrinterViewModel>(m => m.baudRate)]: {
      type: 'number',
      name: '@',
      if: (model: PrinterViewModel) => model.printerConnectionTypeId === PrinterConnectionTypeEnum.Serial
    },
    [nameof<PrinterViewModel>(m => m.serialPortName)]: {
      type: 'text',
      name: '@',
      if: (model: PrinterViewModel) => model.printerConnectionTypeId === PrinterConnectionTypeEnum.Serial
    },
    [nameof<PrinterViewModel>(m => m.serialFilePath)]: {
      type: 'text',
      name: '@',
      if: (model: PrinterViewModel) => model.printerConnectionTypeId === PrinterConnectionTypeEnum.File
    },
    [nameof<PrinterViewModel>(m => m.cashdrawerDefaultPin)]: {
      type: 'number',
      name: '@'
    }
  }
])

onMounted(() => {
  loadDevices()
})

watch(store.selectedRestaurant, () => loadDevices())
</script>
<template>
  <div class="w-full">
    <ScrollableDiv class="page-content" :height="pageContentHeight">
      <Modal v-if="printerDetailModal" :show-close-only="false" :size="ModalSize.Medium" :is-loading="isLoading"
        :action-buttons="[{ text: 'confirm', colorClass: 'success-fill', iconName: 'content-save', action: () => updatePrinter() }, ...(printerDetailModal.id ? [{ text: 'delete', iconName: 'delete', colorClass: 'danger', action: () => deletePrinter(printerDetailModal!.deviceId!, printerDetailModal!.id!) }] : [])]"
        @close="printerDetailModal = null">
        <template v-slot:content>
          <FormBuilder v-model="printerDetailModal" :is-loading="isLoading" :fields-groups="printerModalFieldGroups">
          </FormBuilder>
        </template>
      </Modal>
      <InputModal v-if="inputModalFn" :initial-value="inputModalInitialValue"
        @confirm="inputModalFn!($event); inputModalFn = null" @cancel="inputModalFn = null"></InputModal>
      <TableBuilder :items="Object.values(devicesMap)" :change-page-callback="loadDevices" :is-loading="isLoading"
        :columns="devicesColumnsDefinition" @clicked="selectDevice($event.id!)"
        :row-class="(item) => item.id === selectedDeviceId ? 'bg-gray-300' : ''">
        <template v-slot:head>
          <div class="gap-2 mt-2 flex">
            <LoadingButton :is-loading="isLoading" :disabled="isLoading" @click="inputModalFn = addDevice"
              class="btn-action primary-fill"
              v-if="!!store.deviceCredentials.value && !store.deviceCredentials.value.token">
              {{ $tc('add') }}
            </LoadingButton>
            <button class="btn-action danger" @click="removeCurrentDevice" v-if="store.deviceCredentials.value?.token">{{
              $tc('unbindCurrent')
            }}</button>
            <a class="btn-action primary-fill" href="/assets/com.pickandpayapp.platformapp.apk" download="">
              {{ $tc('apkDownload') }}
            </a>
            <a class="btn-action primary-fill" href="/assets/PlatformApp_1.0.31.0_x64.zip" download="">
              {{ $tc('win64Download') }}
            </a>
            <a class="btn-action primary-fill" href="/assets/PlatformApp_1.0.30.0_x86.zip" download="">
              {{ $tc('win86Download') }}
            </a>
            <a class="btn-action primary-fill" href="/assets/win-x64-legacy.zip" download="">
              {{ $tc('winLegacyDownload') }}
            </a>
          </div>
        </template>
        <template v-slot:isCurrent="{ item } : { item: any }">
          <div v-if="item.id === store.device.value?.id" class="w-3 h-3 bg-gradient rounded-full"></div>
        </template>
        <template v-slot:status="{ item } : { item: any }">
          <span class="mdi mdi-circle"
            :class="{ 'text-red-600': !item.isConnected, 'text-green-600': item.isConnected }"></span>
        </template>
      </TableBuilder>

      <div v-if="selectedDeviceId !== undefined" class="mt-2 card p-0">
        <Collapse title="printers" :is-open="true" :is-first="true" :is-last="true">
          <TableBuilder :carded="false" :columns="printersColumnsDefinition" @clicked="printerDetailModal = clone($event)"
            :items="Object.values(printerMap)" :is-loading="isLoadingDetail">
            <template v-slot:head>
              <div>
                <button class="btn-action primary-fill" @click="createNewPrinter()">
                  <span class="mdi mdi-plus"></span>
                  <span>{{ $tc('add') }}</span>
                </button>
              </div>
            </template>
            <template v-slot:isDefault="{ item } : { item: any }">
              <LoadingButton class="btn-action primary-fill"
                v-if="devicesMap[selectedDeviceId!].defaultPrinterId != item.id"
                @click="$event.stopPropagation(); devicesMap[selectedDeviceId!].defaultPrinterId = item.id; updateDevice(selectedDeviceId!)">
                {{ $tc('makeDefault') }}
              </LoadingButton>
              <span class="bg-red-pnp text-white rounded-full py-1 font-semibold px-2 text-xs" v-else>{{
                $tc('default')
              }}</span>
            </template>
          </TableBuilder>
        </Collapse>
      </div>
    </ScrollableDiv>
  </div>
</template>
