
<script lang="ts" setup>
import Konva from 'konva'
import { nameof } from 'ts-simple-nameof'
import { computed, onMounted, PropType, reactive, Ref, ref, watch } from 'vue'
import { TableGroupViewModel, TableViewModel } from '../../services/api.client'
import { FormBuilderFieldGroupDefinition } from '../../components/ui/types'
import ColorPickerPopover from '../ui/ColorPickerPopover.vue'
import FormBuilder from '../ui/FormBuilder.vue'
import { ModalSize } from '../ui/types'
import Modal from '../ui/Modal.vue'
import { FloorConfiguration, FloorObjectType, FloorObject, OrderTableStatus } from './types'

const MIN_SIZE = 80

const emits = defineEmits(['update:tableGroup', 'selected:table'])
const props = defineProps({
  tableGroup: {
    type: Object as PropType<TableGroupViewModel>,
    required: true
  },
  offsetTop: {
    type: Number,
    default: () => 0
  },
  tableOrdersMap: {
    type: Object as PropType<Record<string, { count: number, status: OrderTableStatus }>>,
    default: () => ({})
  },
  canEdit: Boolean
})

watch(() => props.tableGroup, (newVal, oldVal) => {
  if (newVal?.floorSetupJson !== oldVal?.floorSetupJson)
    parseConfig()
  if (!props.canEdit) return
  const transformerVal = transformer.value
  if (!transformerVal || !selectedObjectId.value) return
  const transformerNode = transformerVal.getNode()
  const stage = transformerNode.getStage()
  transformerNode.nodes([])
  setTimeout(() => {
    const tableNode = stage.findOne('.' + selectedObjectId.value)
    if (tableNode)
      transformerNode.nodes([tableNode])
  })
}, { deep: true })

const blockSnapSize = 30
const container = ref()

const tableElementsRefs = ref<any>({})
const containerId = ref(Math.random().toString().replace('.', ''))
const floorConfiguration = ref<FloorConfiguration>({ objects: [] })
const selectedObjectId = ref()
const selectedObjectType = ref<'tables' | 'objects' | undefined>()
const transformer = ref<any>()
const hasSelection = ref(false)
const dragItemId: Ref<string | null> = ref(null)
const dragObjectId: Ref<string | null> = ref(null)
const actionButtons = ref<{ isVisible?: () => boolean; isActive?: () => boolean; action: () => void; icon: string; name: string }[]>([
  {
    action: () => {
      floorConfiguration.value.objects.push({
        id: `#${Math.random()}`,
        type: FloorObjectType.Text,
        text: 'i am a text'
      })
    },
    icon: 'format-text',
    name: `FloorObjectType.${FloorObjectType[FloorObjectType.Text]}`
  },
  {
    action: () => {
      floorConfiguration.value.objects.push({
        id: `#${Math.random()}`,
        type: FloorObjectType.Rectangle
      })
    },
    icon: 'square-rounded',
    name: `FloorObjectType.${FloorObjectType[FloorObjectType.Rectangle]}`
  },
  {
    action: () => {
      floorConfiguration.value.objects.push({
        id: `#${Math.random()}`,
        type: FloorObjectType.Circle
      })
    },
    icon: 'circle',
    name: `FloorObjectType.${FloorObjectType[FloorObjectType.Circle]}`
  },
  {
    action: () => {
      const idx = floorConfiguration.value.objects.findIndex(o => o.id === selectedObjectId.value)
      if (idx < 0) return
      const selectedObject = floorConfiguration.value.objects[idx]
      floorConfiguration.value.objects.splice(idx, 1)
      floorConfiguration.value.objects.unshift(selectedObject)
    },
    isVisible: () => !!selectedObjectId.value && selectedObjectType.value !== 'tables',
    icon: 'flip-to-back',
    name: 'toBack'
  },
  {
    action: () => {
      const idx = floorConfiguration.value.objects.findIndex(o => o.id === selectedObjectId.value)
      if (idx < 0) return
      const selectedObject = floorConfiguration.value.objects[idx]
      floorConfiguration.value.objects.splice(idx, 1)
      floorConfiguration.value.objects.push(selectedObject)
    },
    isVisible: () => !!selectedObjectId.value && selectedObjectType.value !== 'tables',
    icon: 'flip-to-front',
    name: 'toFront'
  },
  {
    action: () => {
      const tableGroup = props.tableGroup
      const index = floorConfiguration.value.objects.findIndex(t => t.id === selectedObjectId.value)
      if (index === -1) return
      floorConfiguration.value.objects.splice(index, 1)
      tableGroup.floorSetupJson = JSON.stringify(floorConfiguration.value)
      emits('update:tableGroup', tableGroup)
    },
    icon: 'delete',
    name: 'delete',
    isVisible: () => !!selectedObjectId.value
  },
  {
    action: () => {
      if (selectedObjectType.value === 'tables')
        emits('selected:table', props.tableGroup.tables.find(t => t.id === selectedObjectId.value))
      else
        showObjectSettings.value = true
    },
    isVisible: () => !!selectedObjectId.value,
    icon: 'cog',
    name: 'settings'
  },
  {
    action: () => {
      showFloorSettings.value = true
    },
    isVisible: () => !selectedObjectId.value,
    icon: 'cog',
    name: 'floor'
  }
])
const showObjectSettings = ref(false)
const showFloorSettings = ref(false)
const selectedObject = ref()
const objectEditorFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<FloorObject>(m => m.colorCode)]: {
      type: 'color',
      name: '@'
    },
    [nameof<FloorObject>(m => m.text)]: {
      type: 'text',
      name: '@'
    },
    [nameof<FloorObject>(m => m.isLightText)]: {
      type: 'toggle',
      name: '@'
    }
  }
])

const floorConfigFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<FloorConfiguration>(m => m.height)]: {
      type: 'number',
      name: '@'
    },
    [nameof<FloorObject>(m => m.width)]: {
      type: 'number',
      name: '@'
    }
  }
])

const setCursor = (e: any, cursorStyle: string) => {
  const stage = e.target.getStage()
  stage.container().style.cursor = cursorStyle
}

const handleDragstart = (e: any): void => {
  if (!e.target) return
  const targetType = e.target.getLayer().getName()
  if (targetType === 'tables')
    dragItemId.value = e.target?.id()
  else
    dragObjectId.value = e.target?.id()
}

const handleDragend = (e: { target: { id: () => string, x: () => number, y: () => number } }) => {
  const positionX = Math.trunc(e.target.x())
  const positionY = Math.trunc(e.target.y())
  const tableGroup = props.tableGroup
  if (dragItemId.value) {
    const tableId = dragItemId.value!
    const tableIdx = tableGroup.tables.findIndex(t => t.id === tableId)
    const table = tableGroup.tables[tableIdx]
    dragItemId.value = null

    table.positionX = positionX
    table.positionY = positionY
  } else if (dragObjectId.value) {
    const obj = floorConfiguration.value.objects.find(o => o.id === dragObjectId.value)
    if (!obj) return
    obj.positionX = positionX
    obj.positionY = positionY
    tableGroup.floorSetupJson = JSON.stringify(floorConfiguration.value)
    dragObjectId.value = null
  }
  emits('update:tableGroup', tableGroup)
}

const handleTransformEnd = (e: any) => {
  const targetType = e.target.getLayer().getName()
  const tableGroup = props.tableGroup
  if (targetType === 'tables') {
    const tableId = selectedObjectId.value
    const tableIdx = tableGroup.tables.findIndex(t => t.id === tableId)
    const table = tableGroup.tables[tableIdx]

    table.height = Math.abs(Math.trunc((table.height ?? MIN_SIZE) * e.target.scaleY()))
    table.width = Math.abs(Math.trunc((table.width ?? MIN_SIZE) * e.target.scaleX()))
    table.rotation = Math.round(e.target.rotation() / 5) * 5
    tableGroup.tables[tableIdx] = table
    e.currentTarget.setRotation(table.rotation)
  } else {
    const obj = floorConfiguration.value.objects.find(o => o.id === selectedObjectId.value)
    if (!obj) return
    if (obj.type === FloorObjectType.Circle) {
      obj.height = obj.width = Math.abs(Math.trunc((obj.height ?? MIN_SIZE) * e.target.scaleY()))
    } else {
      obj.height = Math.abs(Math.trunc((obj.height ?? MIN_SIZE) * e.target.scaleY()))
      obj.width = Math.abs(Math.trunc((obj.width ?? MIN_SIZE) * e.target.scaleX()))
      obj.rotation = Math.round(e.target.rotation() / 5) * 5
    }
    tableGroup.floorSetupJson = JSON.stringify(floorConfiguration.value)
    e.currentTarget.setRotation(obj.rotation)
  }
  emits('update:tableGroup', tableGroup)
  e.currentTarget.setScaleX(1)
  e.currentTarget.setScaleY(1)
}

const handleStageMouseUp = (e: any) => {
  const objectId = e.target.getParent()?.id()
  const targetType = e.target.getLayer()?.getName()
  if (objectId && targetType === 'tables' && !props.canEdit)
    emits('selected:table', props.tableGroup.tables.find(t => t.id === objectId))
}

const handleStageMouseDown = (e: any) => {
  if (!props.canEdit) return
  // clicked on stage - clear selection
  if (e.target === e.target.getStage()) {
    selectedObjectId.value = undefined
    updateTransformer()
    return
  }

  // clicked on transformer - do nothing
  const clickedOnTransformer =
    e.target.getParent().className === 'Transformer'
  if (clickedOnTransformer) {
    return
  }
  const targetType = e.target.getLayer().getName()
  selectedObjectType.value = targetType
  selectedObjectId.value = e.target.getParent().id()
  if (targetType === 'objects')
    selectedObject.value = floorConfiguration.value.objects.find(o => o.id === selectedObjectId.value)
  updateTransformer()
}

const updateTransformer = () => {
  // // here we need to manually attach or detach Transformer node
  const transformerVal = transformer.value
  if (!transformerVal) return
  const transformerNode = transformerVal.getNode()
  const stage = transformerNode.getStage()

  const objectNode = stage.findOne('.' + selectedObjectId.value)
  // do nothing if selected node is already attached
  if (objectNode === transformerNode.node()) {
    hasSelection.value = true
    return
  }

  if (objectNode) {
    // attach to another node
    transformerNode.nodes([objectNode])
  } else {
    // remove transformer
    transformerNode.nodes([])
  }
}

const boundBoxFunc = (oldBoundBox: any, newBoundBox: any) => {
  if (selectedObjectType.value === 'tables' && (Math.abs(newBoundBox.width) < MIN_SIZE || Math.abs(newBoundBox.height) < MIN_SIZE)) {
    return oldBoundBox
  }

  return newBoundBox
}

const parseConfig = () => {
  try {
    floorConfiguration.value = JSON.parse(props.tableGroup.floorSetupJson ?? '')
  } catch (error) {
    floorConfiguration.value = { objects: [] }
  }
  if (!floorConfiguration.value.width)
    floorConfiguration.value.width = container.value.offsetWidth ?? 0
  if (!floorConfiguration.value.height)
    floorConfiguration.value.height = (container.value.offsetHeight - props.offsetTop) ?? 0
}

const updateObject = () => {
  const tableGroup = props.tableGroup
  const idx = floorConfiguration.value.objects.findIndex(i => i.id === selectedObject.value.id)
  if (idx === -1) return
  floorConfiguration.value.objects[idx] = selectedObject.value
  tableGroup.floorSetupJson = JSON.stringify(floorConfiguration.value)
  emits('update:tableGroup', tableGroup)
}

const updateFloor = () => {
  const tableGroup = props.tableGroup
  tableGroup.floorSetupJson = JSON.stringify(floorConfiguration.value)
  emits('update:tableGroup', tableGroup)
}

const getFillByStatus = (status: OrderTableStatus) => {
  switch (status) {
    case 'accepted':
      return '#e3a008'
    case 'paid':
      return '#22c55e'
    case 'hasPending':
      return '#f87171'
    case 'unpaidWarning':
      return '#f97316'
  }
}

onMounted(() => {
  container.value = document.getElementById(containerId.value)
  parseConfig()
  if (props.canEdit)
    updateFloor()
})

</script>

<template>
  <div class="overflow-auto md:overflow-hidden">
    <Modal v-if="showObjectSettings && !!selectedObject" :size="ModalSize.Small" @close="showObjectSettings = false">
      <template v-slot:content>
        <div>
          <FormBuilder v-model="selectedObject" @update:model-value="updateObject" :is-loading="false"
            :fields-groups="objectEditorFieldsGroups">
          </FormBuilder>
        </div>
      </template>
    </Modal>
    <Modal v-if="showFloorSettings" :size="ModalSize.Small" @close="showFloorSettings = false">
      <template v-slot:content>
        <div>
          <FormBuilder v-model="floorConfiguration" :is-loading="false" @update:model-value="updateFloor"
            :fields-groups="floorConfigFieldsGroups">
          </FormBuilder>
        </div>
      </template>
    </Modal>
    <div :id="containerId" class="w-full h-full relative">
      <v-stage v-if="container" :config="floorConfiguration" @dragstart="handleDragstart" @dragend="handleDragend"
        @mousedown="handleStageMouseDown" @touchstart="handleStageMouseDown" @mouseup="handleStageMouseUp"
        @touchend="handleStageMouseUp">
        <v-layer name="grid">
          <v-line :config="{
            listening: false,
            points: [0, Math.round(idx * blockSnapSize), (floorConfiguration.width ?? container.offsetWidth), Math.round(idx * blockSnapSize)],
            stroke: '#ddd',
            strokeWidth: 0.5,
          }" v-for="idx in Math.trunc((floorConfiguration.height ?? container.offsetHeight) / blockSnapSize)"
            :key="idx"></v-line>
          <v-line :config="{
            listening: false,
            points: [Math.round(idx * blockSnapSize) + 0.5, 0, Math.round(idx * blockSnapSize) + 0.5, (floorConfiguration.height ?? container.offsetHeight)],
            stroke: '#ddd',
            strokeWidth: 1,
          }" v-for="idx in Math.trunc((floorConfiguration.width ?? container.offsetWidth) / blockSnapSize)"
            :key="idx"></v-line>
        </v-layer>
        <v-layer name="objects">
          <v-group @transformend="handleTransformEnd" @mouseenter="setCursor($event, 'pointer')"
            @mouseleave="setCursor($event, 'default')" :key="obj.id" :config="{
              x: obj.positionX ?? (obj.width ?? MIN_SIZE) / 2,
              y: obj.positionY ?? (obj.height ?? MIN_SIZE) / 2,
              draggable: canEdit,
              listening: canEdit,
              id: obj.id,
              name: obj.id,
              offset: obj.type !== FloorObjectType.Circle ? {
                x: (obj.width ?? MIN_SIZE) / 2,
                y: (obj.height ?? MIN_SIZE) / 2
              } : undefined,
              rotation: obj.rotation ?? 0,
            }" v-for="obj of floorConfiguration.objects">
            <v-rect v-if="obj.type === FloorObjectType.Rectangle" :config="{
              width: obj.width ?? MIN_SIZE,
              height: obj.height ?? MIN_SIZE,
              fill: obj.colorCode ?? '#555555',
              shadowColor: 'black',
              listening: canEdit,
              cornerRadius: 5,
              shadowBlur: 10,
              shadowOffsetX: dragObjectId === obj.id ? 15 : 5,
              shadowOffsetY: dragObjectId === obj.id ? 15 : 5,
              shadowOpacity: 0.05
            }"></v-rect>
            <v-circle v-else-if="obj.type === FloorObjectType.Circle" :config="{
              width: obj.width ?? MIN_SIZE,
              height: obj.height ?? MIN_SIZE,
              fill: obj.colorCode ?? '#555555',
              listening: canEdit,
              shadowColor: 'black',
              cornerRadius: 5,
              shadowBlur: 10,
              shadowOffsetX: dragObjectId === obj.id ? 15 : 5,
              shadowOffsetY: dragObjectId === obj.id ? 15 : 5,
              shadowOpacity: 0.05
            }"></v-circle>
            <v-text v-if="obj.type === FloorObjectType.Text || !!obj.text" :config="{
              y: obj.type === FloorObjectType.Circle ? 0 : 20,
              x: obj.type === FloorObjectType.Circle ? -(obj.width ?? MIN_SIZE) / 2 : undefined,
              rotation: obj.type !== FloorObjectType.Text ? obj.textRotation : 0,
              fontSize: obj.fontSize ?? 16,
              listening: canEdit,
              text: obj.text,
              fill: obj.isLightText ? 'white' : 'black',
              width: obj.width ?? MIN_SIZE,
              align: obj.type === FloorObjectType.Rectangle ? 'center' : undefined
            }">
            </v-text>
          </v-group>
        </v-layer>
        <v-layer name="tables">
          <template v-for="table in tableGroup.tables" :key="table.id">
            <v-group v-if="table.isActive" @transformend="handleTransformEnd" @mouseenter="setCursor($event, 'pointer')"
              @mouseleave="setCursor($event, 'default')" :config="{
                x: table.positionX ?? (table.width ?? MIN_SIZE) / 2,
                y: table.positionY ?? (table.height ?? MIN_SIZE) / 2,
                draggable: canEdit,
                id: table.id,
                name: table.id,
                offset: {
                  x: (table.width ?? MIN_SIZE) / 2,
                  y: (table.height ?? MIN_SIZE) / 2
                },
                rotation: table.rotation ?? 0,
              }" :key="table.id">
              <v-rect :ref="tableElementsRefs[table.id!]" :config="{
                width: table.width ?? MIN_SIZE,
                height: table.height ?? MIN_SIZE,
                fill: table.colorCode ?? '#E94B4E',
                shadowColor: 'black',
                cornerRadius: 5,
                shadowBlur: 10,
                shadowOffsetX: dragItemId === table.id ? 15 : 5,
                shadowOffsetY: dragItemId === table.id ? 15 : 5,
                shadowOpacity: 0.05
              }"></v-rect>
              <v-text
                :config="{ y: 10, x: 5, listening: false, text: `${table.name ?? $tc('table')} ${table.number}`, fontFamily: 'Poppins', fontSize: 16, fill: 'white', width: (table.width ?? MIN_SIZE) - 10, align: 'center' }">
              </v-text>
              <v-text
                :config="{ y: 60, listening: false, text: `${$tc('seats')}:${(table.seats ?? '-')}`, fontFamily: 'Poppins', fontSize: 16, fill: 'white', width: table.width ?? MIN_SIZE, align: 'center' }">
              </v-text>
              <v-group v-if="!canEdit && (tableOrdersMap[table.id!]?.count ?? 0) > 0" :config="{
                offset: {
                  x: -5,
                  y: -5
                }
              }">
                <v-circle :config="{
                  height: 30,
                  width: 30,
                  fill: 'white',
                  shadowColor: 'black',
                  shadowBlur: 10,
                  shadowOpacity: 0.1,
                  shadowOffsetX: 5,
                  shadowOffsetY: 8,
                }"></v-circle>
                <v-text
                  :config="{ width: 30, x: -15, listening: false, y: -8, text: tableOrdersMap[table.id!].count ?? 0, fill: 'black', fontFamily: 'Poppins', fontStyle: 'bold', fontSize: 18, align: 'center' }"></v-text>
              </v-group>
              <v-group v-if="!canEdit && (tableOrdersMap[table.id!]?.count ?? 0) > 0" :config="{
                offset: {
                  x: -(table.height ?? MIN_SIZE) + 5,
                  y: -5
                }
              }">
                <v-circle :config="{
                  height: 30,
                  width: 30,
                  fill: 'white',
                  shadowColor: 'black',
                  shadowBlur: 10,
                  shadowOpacity: 0.1,
                  shadowOffsetX: 5,
                  shadowOffsetY: 8,
                }"></v-circle>
                <v-circle :config="{
                  height: 15,
                  width: 15,
                  fill: getFillByStatus(tableOrdersMap[table.id!].status),
                }"></v-circle>
              </v-group>
            </v-group>
          </template>
          <v-transformer :config="{
            borderDash: [4, 3],
            anchorCornerRadius: 5,
            anchorStrokeWidth: 1,
            borderStrokeWidth: 1,
            padding: 10,
            keepRatio: true,
            anchorFill: '#29A9E5',
            rotationSnaps: [0, 90, 180, 270],
            boundBoxFunc
          }" ref="transformer" />
        </v-layer>
      </v-stage>
      <div v-if="canEdit"
        class="absolute right-0 top-1/2 -translate-y-1/2 bg-white p-2 rounded-default shadow-default flex items-center">
        <ul>
          <template v-for="button of actionButtons">
            <li v-if="button.isVisible?.() ?? true" @click="button.action()" :key="button.name"
              class="inline mx-2 cursor-pointer font-semibold text-gray-body"
              :class="{ 'text-red-pnp': button.isActive?.() }">
              <div class="flex flex-col items-center">
                <span class="mdi" :class="`mdi-${button.icon}`"></span>
                <span class="text-xs">{{ $tc(button.name) }}</span>
              </div>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </div>
</template>
