<script lang="ts" setup>
import { onMounted, ref, PropType } from 'vue'
import TablesArrangement from '../tables/TablesArrangement.vue'
import { TableGroupViewModel } from '../../services/api.client'

import { pageContentHeight } from '../../services/utils'
import { OrderTableStatus } from '../tables/types';

const props = defineProps({
  tableGroupsMap: {
    type: Object as PropType<{ [tableGroupId: string]: TableGroupViewModel }>,
    required: true
  },
  tableOrdersCountMap: {
    type: Object as PropType<Record<string, { count: number, status: OrderTableStatus }>>,
    default: () => ({})
  },
  isFromModal: Boolean
})

const emits = defineEmits(['selected:table'])

const selectedTableGroupId = ref()
onMounted(() => {
  selectedTableGroupId.value = Object.values(props.tableGroupsMap)[0].id
})

</script>
<template>
  <div :style="{ height: !isFromModal ? `${pageContentHeight - 50}px` : undefined }" class="relative p-2 pr-3">
    <TablesArrangement :table-group="tableGroupsMap[selectedTableGroupId]" :table-orders-map="tableOrdersCountMap"
      @selected:table="$emit('selected:table', $event.id)">
    </TablesArrangement>
    <div
      class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white p-2 rounded-default shadow-default flex items-center">
      <ul>
        <li v-for="tableGroup of Object.values(tableGroupsMap)" @click="selectedTableGroupId = tableGroup.id"
          :key="tableGroup.id" class="inline mx-2 cursor-pointer font-semibold text-gray-body"
          :class="{ 'text-red-pnp': tableGroup.id === selectedTableGroupId }">{{
            tableGroup.name
          }}</li>
      </ul>
    </div>
  </div>
</template>
