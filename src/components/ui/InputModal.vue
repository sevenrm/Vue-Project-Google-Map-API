<script lang="ts" setup>
import { ref } from 'vue'
import { ModalSize } from './types'
import Modal from './Modal.vue'

const props = defineProps({
  text: String,
  title: String,
  initialValue: String,
  isTextarea: Boolean
})
defineEmits(['confirm', 'cancel'])
const inputValue = ref(props.initialValue || '')
</script>
<template>
  <Modal :show-close-only="false" :size="ModalSize.Small" @close="$emit('cancel')"
    @confirm="$emit('confirm', inputValue)" :title="title">
    <template v-slot:content>
      <div class="flex my-1 space-x-2">
        <div class="w-full items-center justify-center">
          <label class="form-label">
            <span>{{ text }}</span>
            <textarea v-if="isTextarea" v-model="inputValue"></textarea>
            <input v-else v-model="inputValue" />
          </label>
        </div>
      </div>
    </template>
  </Modal>
</template>
