<script setup lang="ts">
import Modal from '../components/ui/Modal.vue'
import { QRCanvas } from 'qrcanvas-vue'
import { environment } from '../environment'
import { Ref, ref, onMounted, watch, computed } from 'vue'
import { apiClient } from '../services/api'
import { DownloadTablesFileOptions, ExternalLinkTypeEnum, ExternalLinkViewModel, PrinterViewModel, StoreFullViewModel, TableGroupViewModel, TablePrintFormat, TableViewModel } from '../services/api.client'
import { printQRs, printTableQR } from '../services/printer'
import { store } from '../services/store'
import Toggle from '../components/ui/Toggle.vue'
import { FeTableViewModel, FeTableGroupViewModel } from '../types'
import logoColor from '../assets/images/logo-color-white-bg.png'
import { useShowConfirm } from '../services/injections'
import { download, pageContentHeight } from '../services/utils'
import TablesArrangement from '../components/tables/TablesArrangement.vue'
import LoadingButton from '../components/ui/LoadingButton.vue'
import { notifier } from '../services/notification'
import PrintersDropdown from '../components/orders/PrintersDropdown.vue'
import TableEditModal from '../components/tables/TableEditModal.vue'
import Collapse from '../components/ui/Collapse.vue'
import TableBuilder from '../components/ui/TableBuilder.vue'
import { TableBuilderFieldDefinition, ModalSize, FormBuilderFieldGroupDefinition, DropdownItem } from '../components/ui/types'
import { nameof } from 'ts-simple-nameof'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'
import FormBuilder from '../components/ui/FormBuilder.vue'
import Dropdown from '../components/ui/Dropdown.vue'

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const isLoading: Ref<'save' | 'delete' | 'download' | 'print' | undefined> = ref(undefined)
const tableGroups: Ref<TableGroupViewModel[]> = ref([])
const activeTableGroup = computed(() => activeTableGroupIdx.value > -1 ? tableGroups.value[activeTableGroupIdx.value] : undefined)
const showQrModal = ref(false)
const qrCodes: Ref<{ table: number, code: string }[]> = ref([])
const activeTableGroupIdx = ref(-1)
const addRangeModalVisible = ref(false)
const image = new Image()
image.src = logoColor
const restaurant: Ref<StoreFullViewModel | undefined> = ref(undefined)
const printers: Ref<PrinterViewModel[]> = ref([])
const isPrinting = ref(false)
const isFloorMode = ref(false)
const downloadAllModalVisible = ref(false)

const printAll = () => {
  if (!activeTableGroup.value) return
  qrCodes.value = activeTableGroup.value.tables.map(t => ({ code: getUrl(t), table: t.number })) as { code: string, table: number }[]
  showQrModal.value = true
}

const loadTables = async () => {
  if (store.selectedRestaurant.value === null)
    return
  try {
    tableGroups.value = await apiClient.restaurantTablegroupsGet(props.restaurantId)
    activeTableGroupIdx.value = 0
  } catch (error) {
    notifier.notifyError('loading', error, 'tables')
  }
}

const updateTableStatus = async (table: TableViewModel, isActive: boolean) => {
  if (!table.id) return
  try {
    await apiClient.restaurantTablesStatus(props.restaurantId, table.id!, isActive)
    notifier.notifySuccess('updated', 'table')
  } catch (error) {
    table.isActive = !isActive
    notifier.notifyError('saving', error, 'tables')
    await loadTables()
  }
}

const showConfirm = useShowConfirm()

const deleteGroup = async () => {
  if (!activeTableGroup.value) return
  showConfirm('proceedQuestion', async () => {
    if (!activeTableGroup.value!.id) {
      tableGroups.value.splice(activeTableGroupIdx.value, 1)
      return
    }
    isLoading.value = 'delete'
    try {
      await apiClient.restaurantTablegroupsDelete(props.restaurantId, activeTableGroup.value!.id!)
      await loadTables()
      notifier.notifySuccess('deleted', 'tableGroup')
      activeTableGroupIdx.value = 0
    } catch (error) {
      notifier.notifyError('saving', error, 'tableGroup')
    }
    isLoading.value = undefined
  })
}

const saveGroup = async () => {
  if (!activeTableGroup.value) return
  isLoading.value = 'save'
  try {
    await apiClient.restaurantTablegroupsPost(props.restaurantId, tableGroups.value)
    await loadTables()
    notifier.notifySuccess('saved', 'tableGroup')
  } catch (error) {
    notifier.notifyError('saving', error, 'tableGroup')
  }
  isLoading.value = undefined
}

const loadRestaurant = async () => {
  try {
    restaurant.value = await apiClient.restaurantFull(store.selectedRestaurant.value!.id!)
  } catch (error) {
    notifier.notifyError('loading', error, 'restaurant')
  }
}

const getUrl = (table: TableViewModel): string | undefined => {
  if (store.selectedRestaurant.value === null)
    return

  return environment.baseAppUrl + (restaurant.value!.allowTableChange ? environment.tableShortFormatUrl : environment.tableFormatUrl)
    .replace('{{restaurantSlug}}', store.selectedRestaurant.value!.slug!)
    .replace('{{restaurantId}}', store.selectedRestaurant.value!.id!)
    .replace('{{tableNumber}}', table.number + '')
    .replace('{{tableId}}', table.id!)
}

const showQR = (table: TableViewModel) => {
  if (table.id?.startsWith('#')) {
    notifier.notifyInfo('saveRequired')
    return
  }
  qrCodes.value = [{ code: getUrl(table)!, table: table.number }]
  showQrModal.value = true
}

const addTable = () => {
  if (!activeTableGroup.value) return
  const tables = activeTableGroup.value.tables
  const number = tables.length > 0 ? Math.max((tables[tables.length - 1]?.number ?? 0) + 1, 1) : 1
  activeTableGroup.value.tables.push(new FeTableViewModel({ number, isActive: true }))
}

const addTableGroup = () => {
  tableGroups.value = [...tableGroups.value, new FeTableGroupViewModel({ isActive: true })]
}

const loadPrinters = async () => {
  try {
    printers.value = await apiClient.restaurantPrinters(props.restaurantId)
  } catch (error) {
    notifier.notifyError('loading', error, 'printers')
  }
}

const tableDownloadOptions = ref(DownloadTablesFileOptions.fromJS({ format: TablePrintFormat.A6, languages: [store.selectedRestaurant.value?.defaultLangCode], externalLinkIds: [] })!)
const downloadAll = async () => {
  downloadAllModalVisible.value = false
  try {
    isLoading.value = 'download'
    const file = await apiClient.restaurantTablesDownload(props.restaurantId, activeTableGroup.value!.id!, tableDownloadOptions.value)
    download(file.data, `TablesQR_${activeTableGroup.value!.name}.pdf`, 'pdf')
  } catch (error) {
    notifier.notifyError('downloading', error, 'file')
  }
  isLoading.value = undefined
}

const init = () => {
  if (!store.selectedRestaurant.value) return
  loadTables()
  loadRestaurant()
  loadPrinters()
}

const toggleExternalLink = (linkId: string) => {
  const idx = tableDownloadOptions.value.externalLinkIds!.indexOf(linkId)
  if (idx > -1)
    tableDownloadOptions.value.externalLinkIds!.splice(idx, 1)
  else
    tableDownloadOptions.value.externalLinkIds!.push(linkId)
}

const toggleLanguage = (language: string) => {
  const idx = tableDownloadOptions.value.languages!.indexOf(language)
  if (idx > -1)
    tableDownloadOptions.value.languages!.splice(idx, 1)
  else
    tableDownloadOptions.value.languages!.push(language)
}

const removeTableById = (tableId: string) => {
  showConfirm('proceedQuestion', () => {
    const idx = activeTableGroup.value?.tables.findIndex(t => t.id === tableId) ?? -1
    if (idx > -1)
      activeTableGroup.value?.tables.splice(idx, 1)
  })
}

watch(store.selectedRestaurant, () => init())

const tableEdit: Ref<TableViewModel | undefined> = ref(undefined)

const tablesColumnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<TableViewModel>(m => m.number)]: {
    type: (table: TableViewModel) => table.id!.startsWith('#') ? 'number' : 'string',
    name: '@',
    class: 'font-semibold',
    columnClass: 'w-32 text-center'
  },
  [nameof<TableViewModel>(m => m.seats)]: {
    type: 'number',
    name: '@',
    columnClass: 'w-32'
  },
  [nameof<TableViewModel>(m => m.isActive)]: {
    type: 'toggle',
    name: 'isVisible',
    toggleUpdated: (table: TableViewModel, val: boolean) => updateTableStatus(table, val)
  },
  showQr: {
    type: 'icon',
    name: 'showQr',
    class: 'text-primary',
    iconName: 'qrcode-scan',
    clicked: (table: TableViewModel) => showQR(table)
  },
  print: {
    type: 'slot',
    name: '',
    if: () => printers.value.length > 0
  },
  delete: {
    type: 'icon',
    name: 'delete',
    iconName: 'delete',
    clicked: (table: TableViewModel) => removeTableById(table.id!)
  },
  move: {
    type: 'slot',
    name: ''
  }
})

const externalLinksColumnsDef = ref<TableBuilderFieldDefinition>({
  [nameof<ExternalLinkViewModel>(m => m.externalLinkTypeId)]: {
    type: 'enum',
    enumValue: ExternalLinkTypeEnum,
    enumName: 'ExternalLinkTypeEnum',
    name: 'linkType'
  },
  [nameof<ExternalLinkViewModel>(m => m.value)]: {
    type: 'string',
    name: 'value'
  },
  toggle: {
    type: 'slot',
    name: ''
  }
})

const languagesColumnsDef = ref<TableBuilderFieldDefinition>({
  name: {
    type: 'slot',
    name: ''
  },
  toggle: {
    type: 'slot',
    name: ''
  }
})

const tableOptionsFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<DownloadTablesFileOptions>(m => m.useDarkBackground)]: {
      type: 'toggle',
      name: '@'
    },
    [nameof<DownloadTablesFileOptions>(m => m.format)]: {
      type: 'enum',
      name: '@',
      enumValue: TablePrintFormat,
      skipTranslation: true
    }
  }
])

const availableTableGroups = computed(() => tableGroups.value.filter(t => t.id !== activeTableGroup.value?.id).map(g => ({ text: g.name, id: g.id } as DropdownItem)))

const moveToGroup = (tableGroupId: string, table: TableViewModel) => {
  const tableGroup = tableGroups.value.find(t => t.id === tableGroupId)
  if (!tableGroup) return
  tableGroup!.tables.push(table)
  const tableIdx = activeTableGroup.value!.tables.findIndex(i => i.id === table.id)
  activeTableGroup.value!.tables.splice(tableIdx, 1)
}

onMounted(() => init())

</script>
<style lang="scss">
.bg-paper {
  background-image: url('@/assets/images/template-qr-container.png');
}
</style>
<template>
  <div>
    <Modal v-if="downloadAllModalVisible" @close="downloadAllModalVisible = false"
      :action-buttons="[{ text: 'download', iconName: 'content-save', action: () => downloadAll(), colorClass: 'success-fill' }]">
      <template v-slot:content>
        <div class="flex flex-col gap-4">
          <div>
            <span class="text-gray-body font-semibold">{{ $tc('externalLinks') }}</span>
            <TableBuilder :show-search-button="false" :is-loading="!!isLoading" :columns="externalLinksColumnsDef"
              :items="restaurant!.externalLinks!">
              <template v-slot:toggle="{ item } : { item: any }">
                <Toggle :model-value="tableDownloadOptions.externalLinkIds!.indexOf(item.id!) > -1"
                  @update:model-value="toggleExternalLink(item.id!)"></Toggle>
              </template>
            </TableBuilder>
          </div>
          <div>
            <span class="text-gray-body font-semibold">{{ $tc('languages') }}</span>
            <TableBuilder :hide-head="true" :show-search-button="false" :is-loading="!!isLoading"
              :columns="languagesColumnsDef" :items="store.languages.value">
              <template v-slot:name="{ item } : { item: any }">
                <span class="fi mr-2" :class="['fi-' + item.code]"></span>
                <span>{{ item.name }}</span>
              </template>
              <template v-slot:toggle="{ item } : { item: any }">
                <Toggle :model-value="tableDownloadOptions.languages!.indexOf(item.code) > -1"
                  @update:model-value="toggleLanguage(item.code)"></Toggle>
              </template>
            </TableBuilder>
          </div>
          <div>
            <FormBuilder :is-loading="!!isLoading" :fields-groups="tableOptionsFieldsGroups"
              v-model="tableDownloadOptions"></FormBuilder>
          </div>
        </div>
      </template>
    </Modal>
    <TableEditModal v-if="tableEdit" @show:qr="showQR(tableEdit!)" v-model="tableEdit" :printers="printers"
      :is-printing="isPrinting" @update:tableStatus="updateTableStatus($event.tableId, $event.isActive)">
    </TableEditModal>
    <Modal v-if="showQrModal" @close="showQrModal = false" :show-close-only="true" background-class="bg-gradient"
      :size="ModalSize.Small"
      :action-buttons="[{ text: 'print', iconName: 'printer', action: () => printQRs('qrs'), colorClass: 'success-fill' }]">
      <template v-slot:content>
        <div class="flex items-center justify-center">
          <div id="qrs" class="grid" :class="'grid-cols-' + (qrCodes.length > 5 ? 5 : qrCodes.length)">
            <a v-for="qrCode of qrCodes" :key="qrCode.code" :href="qrCode.code" target="_blank"
              class="flex justify-center items-center cursor-pointer relative mt-5 mb-5 p-1 flex-col text-center border-white border-2 rounded-default">
              <img class="hidden" />
              <QRCanvas
                :options="{ data: qrCode.code, correctLevel: 'L', logo: image, padding: 8, background: 'transparent', foreground: 'white', cellSize: 4, effect: { type: 'fusion', value: 1 } }">
              </QRCanvas>
              <span
                class="bg-white w-8 h-8 text-red-pnp font-bold rounded-full flex items-center justify-center absolute bottom-10">{{
                  qrCode.table
                }}</span>
            </a>
            <span class="text-center -mt-2 text-white px-3">{{ $tc('scanMe') }}</span>
          </div>
        </div>
      </template>
    </Modal>
    <div class="w-full">

      <div class="relative">
        <div class="flex justify-between card ml-2 mr-3 mt-2">
          <div class="flex gap-1">
            <LoadingButton @click="saveGroup" class="btn-action success-fill" :is-loading="isLoading === 'save'"
              :is-disabled="!activeTableGroup || !!isLoading || !activeTableGroup.name?.length">
              <span class="mdi mdi-content-save"></span>
              <span>{{ $tc('save') }}</span>
            </LoadingButton>
            <LoadingButton @click="deleteGroup" class="btn-action danger" :is-loading="isLoading === 'delete'"
              :is-disabled="!activeTableGroup || !!isLoading">
              <span class="mdi mdi-delete"></span>
              <span>{{ $tc('delete') }}</span>
            </LoadingButton>
            <LoadingButton @click="addTable" class="btn-action primary-fill"
              :is-disabled="!activeTableGroup || !!isLoading || !activeTableGroup">
              <span class="mdi mdi-plus"></span>
              <span>{{ $tc('addTable') }}</span>
            </LoadingButton>
            <button :disabled="!!isLoading" class="btn-action primary-fill" @click="addTableGroup">
              <span class="mdi mdi-plus"></span>
              <span>{{ $tc('addGroup') }}</span>
            </button>
            <button @click="addRangeModalVisible = true" class="btn-action primary-fill mx-1" v-if="false">
              <span class="mdi mdi-plus"></span>
              <span>{{ $tc('addRange') }}</span>
            </button>
            <LoadingButton @click="downloadAllModalVisible = true" class="btn-action dark-teal"
              :is-loading="!activeTableGroup || isLoading === 'download'"
              :is-disabled="!!isLoading || !activeTableGroup?.tables.length">
              <span class="mdi mdi-download"></span>
              <span>{{ $tc('downloadAll') }}</span>
            </LoadingButton>
          </div>
          <div class="flex justify-end" v-if="activeTableGroup">
            <label class="form-label row">
              <span class="mr-1">{{ $tc('list') }}</span>
              <Toggle v-model="isFloorMode"></Toggle>
              <span class="ml-1">{{ $tc('floor') }}</span>
            </label>
          </div>
        </div>

        <ScrollableDiv class="page-content" :height="pageContentHeight - 82">
          <div class="w-full flex justify-between relative border-b" v-if="!isFloorMode">
            <div class="flex flex-1">
              <ul>
                <li v-for="(tableGroup, idx) of tableGroups" :key="idx" class="inline-block relative">
                  <button @click="activeTableGroupIdx = idx"
                    :class="{ 'text-red-pnp': activeTableGroupIdx === idx, 'text-gray-body': activeTableGroupIdx !== idx }"
                    class="rounded py-3 px-3 inline-flex items-center w-full uppercase text-base font-semibold transition-colors duration-150">
                    <span v-if="activeTableGroupIdx === idx"
                      class="absolute left-0 right-0 mx-auto bottom-0 w-10 h-0.5 rounded-t-lg bg-red-pnp"></span>
                    <span v-if="tableGroup.name">{{ tableGroup.name }}</span>
                    <span v-else class="italic">{{ $tc('unnamed') }}</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <template v-if="activeTableGroup">
            <div class="card my-2" v-if="!isFloorMode">
              <Collapse class="-m-2" title="details" :hide-border="true" :is-first="true" :is-last="true">
                <div class="flex gap-4 p-3">
                  <label class="form-label">
                    <span>{{ $tc('name') }}</span>
                    <input v-model="activeTableGroup.name" />
                  </label>
                  <label class="form-label">
                    <span>{{ $tc('isActive') }}</span>
                    <Toggle v-model="activeTableGroup.isActive" />
                  </label>
                </div>
              </Collapse>
            </div>
            <div v-if="isFloorMode" class="relative">
              <TablesArrangement :can-edit="true" :offset-top="20" v-model:table-group="tableGroups[activeTableGroupIdx]"
                @selected:table="tableEdit = $event">
              </TablesArrangement>
            </div>
            <div v-else>
              <TableBuilder :show-search-button="false" :is-loading="!!isLoading" :items="activeTableGroup.tables"
                :columns="tablesColumnDefinition">
                <template v-slot:move="{ item } : { item: any }">
                  <Dropdown :items="availableTableGroups" :skip-translation="true" @click="moveToGroup($event.id, item)">
                    <button class="btn-action gray">
                      <span class="mdi mdi-open-in-new"></span>
                      {{ $tc('moveTo') }}
                    </button>
                  </Dropdown>
                </template>
                <template v-slot:print="{ item } : { item: any }">
                  <PrintersDropdown @print="printTableQR(restaurantId, item.id!, $event)" :printers="printers">
                  </PrintersDropdown>
                </template>
              </TableBuilder>
            </div>
          </template>
          <div v-else class="flex justify-center items-center">
            <h2 class="page-section my-2">{{ $tc('selectATableGroup') }}</h2>
          </div>
        </ScrollableDiv>
        <div v-if="isFloorMode"
          class="absolute bottom-0 left-1/2 -translate-x-1/2 bg-white p-2 rounded-default shadow-default flex items-center">
          <ul>
            <li v-for="(tableGroup, tableGroupIdx) of tableGroups" @click="activeTableGroupIdx = tableGroupIdx"
              :key="tableGroup.id" class="inline mx-2 cursor-pointer font-semibold text-gray-body"
              :class="{ 'text-red-pnp': tableGroup.id === activeTableGroup?.id }">
              <span v-if="tableGroup.name">{{ tableGroup.name }}</span>
              <span v-else class="italic">{{ $tc('unnamed') }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
