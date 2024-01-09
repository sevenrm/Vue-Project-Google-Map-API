<script lang="ts" setup>
import { computed, PropType } from 'vue'
import { IPrinterViewModel, PrinterTypeEnum, PrinterViewModel } from '../../services/api.client'
import Dropdown from '../ui/Dropdown.vue'
import DropdownButton from '../ui/DropdownButton.vue'
import SimpleSpinner from '../ui/SimpleSpinner.vue'
import { DropdownItem } from '../ui/types'

const props = defineProps({
  btnClass: String,
  printers: {
    type: Array as PropType<IPrinterViewModel[]>,
    required: true
  },
  isPrinting: Boolean
})

defineEmits(['print'])

const items = computed(() => props.printers.map(p => ({ text: p.name, printer: p } as DropdownItem)))
</script>
<template>
  <Dropdown :items="items" @click="$emit('print', $event.printer)" :skip-translation="true">
    <template v-slot:default="{ isOpen }">
      <button class="btn-action indigo">
        <span class="mdi mdi-printer"></span>
        <span class="uppercase hidden md:block">{{ $tc('print') }}</span>
        <span class="mdi" :class="{ 'mdi-chevron-down': !isOpen, 'mdi-chevron-up': isOpen }"></span>
      </button>
    </template>
  </Dropdown>
</template>
