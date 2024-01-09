<script lang="ts" setup>
import { VuePdf, createLoadingTask } from 'vue3-pdfjs';
import { VuePdfPropsType } from 'vue3-pdfjs/components/vue-pdf/vue-pdf-props'; // Prop type definitions can also be imported
import { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import { computed, onMounted, PropType, ref, watch } from 'vue';
import Modal from '../ui/Modal.vue';
import { download } from '../../services/utils';
import InputModal from '../ui/InputModal.vue';
import { ModalSize } from '../ui/types';

const props = defineProps({
  fileName: String,
  data: Blob
})
const numOfPages = ref(0)
const inputModalFn = ref<((input: string) => void) | null>(null)

const downloadFile = (name?: string) => {
  if (props.fileName)
    download(props.data, props.fileName, 'pdf') // file.data.type
  else if (name)
    download(props.data, `${name}.pdf`, 'pdf') // file.data.type
  else
    inputModalFn.value = (val) => downloadFile(val)
}

const src = computed(() => {
  if (!props.data) return null
  const blobURL = URL.createObjectURL(props.data);
  return { url: blobURL }
})

const loadSrc = () => {
  if (!src.value)
    return;
  const loadingTask = createLoadingTask(src.value)
  loadingTask.promise.then((pdf: PDFDocumentProxy) => {
    numOfPages.value = pdf.numPages
  })
}
onMounted(() => {
  loadSrc()
})

watch(() => props.data, () => loadSrc())
</script>
<template>
  <InputModal v-if="inputModalFn" @confirm="inputModalFn!($event); inputModalFn = null" @cancel="inputModalFn = null" />
  <Modal v-if="src && !inputModalFn" @close="$emit('close')"
    :action-buttons="[{ text: 'download', iconName: 'download', colorClass: 'light-teal', action: () => downloadFile() }]">
    <template v-slot:content>
      <div class="transform scale-90">
        <VuePdf v-for="page in numOfPages" :key="page" :src="src" :page="page" />
      </div>
    </template>
  </Modal>
</template>
