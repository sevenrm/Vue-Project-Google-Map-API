<script lang="ts" setup>
import { PropType, ref } from 'vue'
import { MenuItemMediaViewModel } from '../../services/api.client'
import { useShowConfirm } from '../../services/injections'
import UploadImage from '../ui/UploadImage.vue'
import draggable from 'vuedraggable'
import Modal from '../ui/Modal.vue'

const emits = defineEmits(['update:modelValue', 'close'])
const props = defineProps({
  modelValue: {
    type: Array as PropType<MenuItemMediaViewModel[]>,
    required: true
  }
})
const uploadImageModalVisible = ref(false)
const imageUpload = ref(undefined)
const showConfirm = useShowConfirm()

const removeMedia = (media: MenuItemMediaViewModel) => {
  showConfirm('proceedQuestion', () => {
    const index = props.modelValue.findIndex(c => c.id === media.id)
    if (index === -1) return
    const modelValue = props.modelValue
    modelValue.splice(index, 1)
    emits('update:modelValue', modelValue)
  })
}

const onImageUpdate = (imgUrl: string) => {
  if (imgUrl) {
    const modelValue = props.modelValue
    modelValue.push(MenuItemMediaViewModel.fromJS({ id: `#${Math.random().toString().replace('.', '')}`, mediaUrl: imgUrl, isVideo: false })!)
    uploadImageModalVisible.value = false
    emits('update:modelValue', modelValue)
  }
  imageUpload.value = undefined
}
</script>
<template>
  <div>
    <UploadImage v-if="uploadImageModalVisible" @close="uploadImageModalVisible = false" :skip-preview="true" size="big"
      :show-upload-button="false" :model-value="imageUpload" @update:model-value="onImageUpdate">
    </UploadImage>
    <Modal :show-footer="false" @close="$emit('close')" v-else>
      <template v-slot:content>

        <div>
          <label class="mb-1 ml-1 form-label">
            <span>Images</span>
          </label>
          <div class="flex flex-col w-full pr-2">
            <div class="w-full border-b dark:border-gray-800 py-2 mx-2">
              <button class="rounded mx-2 hover:bg-red-pnp hover:text-white py-1 px-2 transition-colors duration-150"
                @click="uploadImageModalVisible = true">
                <span class="mdi mdi-file-upload"></span>
                <span class="ml-2">{{ $tc('upload') }}</span>
              </button>
            </div>
            <div class="max-h-44 overflow-auto my-1">
              <draggable tag="ul" :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)"
                item-key="_idx" group="images" class="px-2 py-1" handle=".handle">
                <template #item="{ element }">
                  <li class="flex items-center m-1 justify-between carded p-3">
                    <div class="flex items-center">
                      <div
                        class="border w-24 h-24 border-gray-200 dark:border-gray-700 shadow-sm rounded-md flex items-center justify-center">
                        <div class="w-full h-full relative">
                          <img :src="element.mediaUrl" class="object-cover w-full h-full rounded-md" />
                        </div>
                      </div>
                      <div>
                        <button
                          class="mx-2 hover:bg-red-pnp transition-colors duration-150 hover:text-white px-2 py-1 rounded"
                          @click="removeMedia(element)">
                          <span class="mdi mdi-delete"></span>
                          <span class="ml-2">Remove</span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <span class="mdi mdi-reorder-horizontal handle"></span>
                    </div>
                  </li>
                </template>
              </draggable>
            </div>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>
