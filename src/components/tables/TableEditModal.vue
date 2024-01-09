<script lang="ts" setup>
import { nameof } from 'ts-simple-nameof'
import { PropType, watch, ref } from 'vue'
import { PrinterViewModel, TableViewModel } from '../../services/api.client'
import { store } from '../../services/store'
import { FormBuilderFieldGroupDefinition } from '../../components/ui/types'
import DropdownButton from '../ui/DropdownButton.vue'
import FormBuilder from '../ui/FormBuilder.vue'
import { ModalSize } from '../ui/types'
import Modal from '../ui/Modal.vue'
import SimpleSpinner from '../ui/SimpleSpinner.vue'

const props = defineProps({
  modelValue: {
    type: Object as PropType<TableViewModel>,
    required: true
  },
  isPrinting: {
    type: Boolean,
    required: true
  },
  printers: {
    type: Array as PropType<PrinterViewModel[]>,
    required: true
  }
})

const modelValueLocal = ref(props.modelValue)
watch(() => props.modelValue, () => modelValueLocal.value = props.modelValue)

const emits = defineEmits(['update:modelValue', 'update:tableStatus'])

const resetShape = () => {
  modelValueLocal.value.height = undefined
  modelValueLocal.value.width = undefined
  modelValueLocal.value.rotation = undefined
  modelValueLocal.value.colorCode = undefined
  modelValueLocal.value.positionX = undefined
  modelValueLocal.value.positionY = undefined
  emits('update:modelValue', modelValueLocal.value)
}

const fieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    '[class]': 'flex gap-3',
    [nameof<TableViewModel>(m => m.name)]: {
      type: 'text',
      name: '@'
    },
    [nameof<TableViewModel>(m => m.seats)]: {
      type: 'number',
      name: '@'
    },
    [nameof<TableViewModel>(m => m.colorCode)]: {
      type: 'color',
      name: '@'
    },
    [nameof<TableViewModel>(m => m.isActive)]: {
      type: 'toggle',
      name: '@'
    }
  }
])
</script>
<template>
  <Modal :size="ModalSize.Medium" v-if="modelValueLocal" @close="emits('update:modelValue', undefined)"
    :show-close-only="true">
    <template v-slot:content>
      <div class="flex flex-col gap-4">
        <h1>{{ $tc('table') }}:<span class="font-bold">{{ modelValueLocal.number }}</span></h1>
        <div>
          <FormBuilder :is-loading="false" v-model="modelValueLocal"
            @update:model-value="$emit('update:modelValue', modelValueLocal)" :fields-groups="fieldsGroups">
          </FormBuilder>
        </div>

        <div class="flex items-center gap-2 justify-end">
          <button class="btn-action light-teal" @click="resetShape()">
            <span>{{ $tc('resetShape') }}</span>
          </button>
          <button :disabled="!modelValueLocal.id" @click="$emit('show:qr')" class="btn-action primary-fill">
            <span class="mdi mdi-qrcode"></span>
            <span>{{ $tc('showQr') }}</span>
          </button>
          <!-- <button class="btn-action-icon mx-1 text-red-pnp" @click="activeTableGroup!.tables.splice(idx, 1)">
                <span class="mdi mdi-close"></span>
              </button> -->
          <DropdownButton :items="printers" placement="bottom"
            btn-class="px-4 p-1 border-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white transition-colors duration-150 border-indigo-600 text-indigo-600 rounded-default flex items-center justify-center">
            <template v-slot:btn>
              <template v-if="!isPrinting">
                <div>
                  <span class="mdi mdi-printer"></span>
                  <span>{{ $tc('print') }}</span>
                </div>
              </template>
              <SimpleSpinner v-else></SimpleSpinner>
            </template>
            <template v-slot:item="{ item } : { item: any }">
              <a class="text-base block text-left" :class="{ 'text-red-pnp': item.id === store.user.value?.id }"
                @click="$event.stopPropagation(); $emit('print:single', { tableId: modelValueLocal!.id!, printerId: item.id })">{{
                  item.name
                }}</a>
            </template>
          </DropdownButton>
        </div>
      </div>
    </template>
  </Modal>
</template>
