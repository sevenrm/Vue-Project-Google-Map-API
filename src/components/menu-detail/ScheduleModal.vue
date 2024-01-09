<script setup lang="ts">
import { PropType, watch, ref } from 'vue';
import { VisibilityScheduleViewModel } from '../../services/api.client';
import Schedules from '../shared/Schedules.vue';
import Modal from '../ui/Modal.vue';

const emits = defineEmits(['close', 'confirm'])
const props = defineProps({
  schedules: Array as PropType<VisibilityScheduleViewModel[]>
})
const schedulesLocal = ref(props.schedules)
watch(() => props.schedules, () => schedulesLocal.value = props.schedules)
</script>
<template>
  <Modal @close="$emit('close')" title="schedules"
    :action-buttons="[{ text: 'confirm', iconName: 'content-save', colorClass: 'success', action: () => $emit('confirm', schedulesLocal) }]">
    <template v-slot:content>
      <Schedules v-model="schedulesLocal" :show-visibility-toggle="true"></Schedules>
    </template>
  </Modal>
</template>