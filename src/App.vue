<template>
  <div :class="{ 'dark': darkMode }" class="bg-gray-50" :style="{ 'height': windowHeight + 'px' }">
    <PinLogin v-if="store.device.value && store.isDeviceLocked.value"></PinLogin>
    <div v-else-if="!['login', 'checkout-confirm'].includes($route.name as string)">
      <div v-if="confirmVisible">
        <Modal :z-index="89" :show-close-only="false" @confirm="confirmAction?.()" @close="confirmVisible = false"
          title="Confirm?">
          <template v-slot:content>
            <div class="flex w-full text-gray-body dark:text-gray-400">{{ confirmMessage }}</div>
          </template>
        </Modal>
      </div>
      <Modal :z-index="99" title="disconnectionError" v-if="store.showConnectionError.value === true"
        :show-close-only="false" :hide-default-ctas="true" :show-footer="true" :show-close="false"
        :action-buttons="[{ text: 'reload', iconName: 'reload', action: () => reloadPage(), colorClass: 'success-fill' }]">
        >
        <template v-slot:content>
          <div class="py-2">{{ $tc('internetIssue') }}</div>
        </template>
      </Modal>
      <div class="flex flex-col" :style="{ 'height': windowHeight + 'px' }">

        <Navbar v-model:sidebar-visible="sidebarVisible" v-model:is-fullscreen="isFullscreen"></Navbar>
        <div class="flex">
          <Sidebar :is-fullscreen="isFullscreen" :is-dark="darkMode" @theme-toggle="toggleDarkMode"
            :is-collapsed="!sidebarVisible" />
          <div class="flex flex-col flex-1 w-full" style="width: calc(100% - 18rem)"
            :class="{ 'md:pl-12 md:ml-4 xl:pl-0': sidebarVisible, 'ml-1 md:ml-0': !sidebarVisible }">
            <main class="h-full overflow-y-hidden">
              <div class="flex items-center justify-center" :style="{ 'height': pageContentHeightPx }"
                v-if="store.isLoadingPage.value">
                <SimpleSpinner></SimpleSpinner>
              </div>
              <router-view :class="{ 'pl-16': sidebarVisible }" v-show="!store.isLoadingPage.value" />
            </main>
          </div>
        </div>
      </div>
    </div>
    <router-view v-else />
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, provide, Ref, watch } from 'vue'
import { ref } from '@vue/reactivity'
import { useRoute, useRouter } from 'vue-router'
import { store } from './services/store'
import Sidebar from './components/Sidebar.vue'
import Modal from './components/ui/Modal.vue'
import { pageContentHeightPx, windowHeight, isFullscreen } from './services/utils'
import { i18nInstance } from './services/i18n'
import Navbar from './components/Navbar.vue'
import SimpleSpinner from './components/ui/SimpleSpinner.vue'
import PinLogin from './views/PinLogin.vue'

const router = useRouter()
const darkMode = ref(false)
const confirmVisible = ref(false)
const confirmMessage = ref('')
const confirmAction: Ref<(() => void) | null> = ref(null)
const sidebarVisible = ref(false)

router.afterEach(() => sidebarVisible.value = false)

const showConfirm = (message: string, callback: () => void) => {
  confirmVisible.value = true
  confirmMessage.value = i18nInstance.global.t(message)
  confirmAction.value = () => {
    confirmVisible.value = false
    callback()
  }
}
provide('showConfirm', showConfirm)

const toggleDarkMode = () => {
  darkMode.value = !darkMode.value
  localStorage.setItem('darkMode', darkMode.value + '')
}

const reloadPage = () => {
  window.location.reload()
}

onMounted(() => {
  darkMode.value = localStorage.getItem('darkMode') === 'true'
  document.onkeydown = (e: KeyboardEvent) => {
    if (confirmVisible.value)
      if (e.key === 'Escape')
        confirmVisible.value = false
      else if (e.key === 'Enter')
        confirmAction.value?.()
  }
})

// router.afterEach(() => setHeight())
</script>
