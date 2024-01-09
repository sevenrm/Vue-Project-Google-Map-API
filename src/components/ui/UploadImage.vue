<template>
  <Modal v-if="skipPreview || modalVisible" @close="modalVisible = false; $emit('close')">
    <template v-slot:content>
      <div>
        <div>
          <div v-if="currentImg">
            <Cropper @click.prevent :default-size="defaultSize" image-restriction="stencil" ref="cropper" class="cropper"
              :src="currentImg" />
          </div>
          <div class="flex items-center my-1" v-else>
            <div @dragover.prevent @drop.prevent @click="selectImage" :class="{
              'w-40 h-40': size === 'large',
              'w-32 h-32': size === 'big',
              'w-24 h-24': size == 'medium',
              'w-16 h-16': size == 'small',
              'w-10 h-10': size == 'smallest',
              'border-red-pnp border-2': isDragging,
              'border-gray-200 border dark:border-gray-700': !isDragging
            }"
              class="transition-colors duration-150 dark:hover:border-red-pnp hover:border-red-pnp hover:border-2 bg-white cursor-pointer dark:bg-gray-800 rounded flex items-center justify-center"
              @drop="dragFile" @dragover="isDragging = true" @dragleave="isDragging = false">
              <input class="w-0 h-0" ref="fileInput" accept="image/*" type="file"
                @change="fileSelected($event.target?.files)" />
              <span class="mdi" :class="iconName" v-if="!currentImg"></span>
              <div class="w-full h-full relative" v-else>
                <img :src="currentImg" :class="['object-' + displayMode]" class="w-full h-full rounded" />
                <div class="absolute bottom-0 right-0">
                  <span class="mdi mdi-delete text-white"></span>
                </div>
              </div>
            </div>
            <div>
              <button class="rounded mx-2 hover:bg-red-pnp hover:text-white py-1 px-2 transition-colors duration-150"
                v-if="showUploadButton" @click="fileInput?.click()">
                <span class="mdi mdi-file-upload"></span>
                <span class="ml-2">{{ $tc('upload') }}</span>
              </button>
            </div>
          </div>
        </div>
        <div class="flex justify-between gap-2 mt-1" @click.capture="undefined">
          <div class="flex gap-2 text-2xl items-center" v-if="currentImg">
            <button class="btn-action-icon" @click="flip(true, false)">
              <span class="mdi mdi-flip-horizontal"></span>
            </button>
            <button class="btn-action-icon" @click="flip(false, true)">
              <span class="mdi mdi-flip-vertical"></span>
            </button>
            <button class="btn-action-icon" @click="rotate(-90)">
              <span class="mdi mdi-rotate-left"></span>
            </button>
            <button class="btn-action-icon" @click="rotate(90)">
              <span class="mdi mdi-rotate-right"></span>
            </button>
          </div>
          <div class="flex justify-end gap-2">
            <button class="btn-action danger" v-if="currentImg" @click="currentImg = null">
              <span class="mdi mdi-delete"></span>
              <span>{{ $tc('delete') }}</span>
            </button>
            <button class="btn-action success-fill" @click="saveImg">
              <span class="mdi mdi-content-save"></span>
              <span>{{ $tc('save') }}</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </Modal>
  <div v-if="!skipPreview" @click="modalVisible = true" :class="{
    'w-40 h-40': size === 'large',
    'w-32 h-32': size === 'big',
    'w-24 h-24': size == 'medium',
    'w-16 h-16': size == 'small',
    'w-10 h-10': size == 'smallest',
  }"
    class="transition-colors my-1 border-gray-input border duration-150 dark:hover:border-red-pnp hover:border-red-pnp hover:border-2 bg-white cursor-pointer dark:bg-gray-800 rounded flex items-center justify-center">
    <span class="mdi" :class="iconName" v-if="!modelValue"></span>
    <div class="w-full h-full relative" v-else>
      <img :src="modelValue" :class="['object-' + displayMode]" class="w-full h-full rounded" />
      <div class="absolute bottom-0 right-0">
        <span class="mdi mdi-delete text-white"></span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, PropType, Ref, ref } from 'vue'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import Modal from './Modal.vue'

const props = defineProps({
  displayMode: {
    type: String,
    default: 'cover'
  },
  skipPreview: Boolean,
  size: {
    type: String as PropType<'smallest' | 'small' | 'medium' | 'big' | 'large'>,
    default: 'medium'
  },
  modelValue: {
    type: String
  },
  iconName: {
    type: String,
    default: 'mdi-file-image-plus-outline'
  },
  showUploadButton: {
    type: Boolean
  }
})
const cropper = ref()
const emits = defineEmits(['update:modelValue', 'close'])
const isDragging = ref(false)
const fileInput: Ref<HTMLElement | null> = ref(null)
const currentImg = ref()
const currentImgType = ref()
const modalVisible = ref(false)

const defaultSize = ({ imageSize, visibleArea }: any) => {
  return {
    width: (visibleArea || imageSize).width,
    height: (visibleArea || imageSize).height
  }
}

const rotate = (angle: number) => {
  cropper.value.rotate(angle)
}

const flip = (x: boolean, y: boolean) => {
  const { image } = cropper.value.getResult()
  if (image.transforms.rotate % 180 !== 0) {
    cropper.value.flip(!x, !y)
  } else {
    cropper.value.flip(x, y)
  }
}

const dragFile = (e: DragEvent) => {
  isDragging.value = false
  fileSelected(e.dataTransfer?.files)
}
const selectImage = () => {
  if (props.modelValue)
    currentImg.value = null
  else
    fileInput.value?.click()
}
const fileSelected = (file: any) => {
  if (file && file[0]) {
    const reader = new FileReader()
    reader.onload = e => {
      currentImg.value = e.target?.result
      currentImgType.value = file[0].type
      // emits('update:modelValue', e.target.result)
    }
    reader.readAsDataURL(file[0])
  }
}

const saveImg = () => {
  if (cropper.value) {
    const { canvas } = cropper.value.getResult()
    if (canvas) {
      const img = canvas.toDataURL(
        currentImgType.value
      )
      emits('update:modelValue', img)
    }
  } else
    emits('update:modelValue', null)
  modalVisible.value = false
}

onMounted(() => {
  currentImg.value = props.modelValue
  if (!currentImg.value)
    selectImage()
})

</script>
<style lang="scss">
.cropper {
  max-height: 500px;
  max-width: 500px;
}
</style>
