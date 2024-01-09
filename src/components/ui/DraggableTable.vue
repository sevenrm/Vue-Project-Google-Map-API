<script lang="ts" setup>
import { PropType, computed, useSlots } from 'vue'
import draggable from 'vuedraggable'
import { pageContentWidthPx } from '../../services/utils';

defineEmits(['update:modelValue'])

const props = defineProps({
  modelValue: {
    type: Array as PropType<any[]>,
    required: true
  },
  columns: Object as PropType<Record<string, {
    name?: string;
    class?: string;
    hidden?: boolean
  }>>,
  itemKey: {
    type: String,
    default: ''
  },
  groupName: String
})

const slots = useSlots()
const hasSlot = (name: string) => {
  return !!slots[name]
}

const groupNameKey = computed(() => props.groupName ?? Math.random().toString())
</script>
<template>
  <div class="overflow-x-auto overflow-y-hidden w-full" :style="{ 'max-width': pageContentWidthPx }">
    <div class="px-2 py-2">
      <slot name="action-buttons"></slot>
    </div>
    <table class="w-full">
      <thead v-if="columns">
        <tr class="bg-gray-table-header">
          <td class="uppercase w-10 py-2 px-4 text-sm font-semibold text-gray-heading text-left"></td>
          <td v-for="(def, column) of columns" :key="column"
            class="uppercase py-2 px-4 text-sm font-semibold text-gray-heading text-left">
            <span v-if="def.name">{{ $tc(def.name === '@' ? column : def.name) }}</span>
          </td>
        </tr>
      </thead>
      <draggable :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" handle=".handle"
        :item-key="itemKey" :group="groupNameKey" tag="tbody">
        <template #item="{ element }">
          <slot v-if="hasSlot('row')" name="row" :item="element"></slot>
          <tr v-else class="cursor-pointer transition-all hover:bg-gray-50 border-b border-gray-200 last:border-none">
            <td class="border-gray-50 text-gray-body w-6 py-2 pl-2">
              <span class="mdi handle mdi-drag"></span>
            </td>
            <template v-for="(def, fieldName) of columns" :key="fieldName">
              <td v-if="!def.hidden" :class="def.class ?? ''" class="border-gray-50 text-gray-body py-2 px-4">
                <slot :name="fieldName" :item="element"></slot>
              </td>
            </template>
          </tr>
        </template>
      </draggable>
    </table>
    <h2 class="page-section my-4 flex items-center justify-center" v-if="!modelValue.length">
      {{
        $tc('noRecordFound')
      }}</h2>
  </div>
</template>
