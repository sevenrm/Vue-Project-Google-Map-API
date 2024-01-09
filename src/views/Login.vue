<template>
  <section class="flex flex-col justify-center items-center bg-gradient" :style="{ 'height': windowHeight + 'px' }">
    <div class="max-w-md justify-center card space-y-4 p-10"
      :class="{ 'w-full': !isDeviceLoading && !store.isLoadingPage.value }">
      <div class="mb-4 justify-center flex flex-col items-center">
        <img src="@/assets/images/logo-color.png" width="250" />
      </div>
      <template v-if="!isDeviceLoading && !store.isLoadingPage.value">
        <div v-if="loginError"
          class="flex items-center justify-center text-red-pnp font-bold border-2 border-red-pnp p-4 rounded-default">
          <span class="mdi mdi-alert text-2xl mr-4"></span>
          <span>{{ $tc('invalidLoginData') }}</span>
        </div>
        <div class="flex flex-col">
          <label class="form-label w-full">
            <span>{{ $tc('username') }}</span>
            <input type="text" v-model="username" :disabled="isLoading" placeholder="Username"
              @keydown.enter="execLogin" />
          </label>
          <label class="form-label w-full">
            <span>{{ $tc('password') }}</span>
            <input type="password" v-model="password" :disabled="isLoading" placeholder="******************"
              @keydown.enter="execLogin" />
          </label>
        </div>
        <div class="w-full">
          <LoadingButton :is-loading="isLoading" :disabled="!username || !password || isLoading" :class="{
            'btn-action primary-fill': !!username && !!password && !isLoading,
            'bg-gray-400 cursor-default': !username || !password || isLoading
          }" @click="execLogin" class="w-full py-4 rounded text-sm font-bold text-gray-50 transition duration-200">
            {{ $tc('signIn') }}
          </LoadingButton>
        </div>
      </template>
      <template v-else>
        <div class="flex flex-col items-center justify-center gap-2">
          <span class="p-2 text-red-pnp" v-if="store.deviceCredentials.value?.token">{{ $tc('deviceLogin') }}</span>
          <SimpleSpinner></SimpleSpinner>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts" >
import { onMounted, ref, watch } from 'vue'
import { router } from '../routes'
import { store } from '../services/store'
import LoadingButton from '../components/ui/LoadingButton.vue'
import SimpleSpinner from '../components/ui/SimpleSpinner.vue'
import { windowHeight } from '../services/utils'

const isDeviceLoading = ref(false)
const isLoading = ref(false)
const loginError = ref(false)
const username = ref('')
const password = ref('')

const execLogin = async () => {
  isLoading.value = true
  const loginResult = await store.login({ username: username.value, password: password.value })
  if (!loginResult) {
    loginError.value = true
    isLoading.value = false
  } else
    router.push({ name: 'home', params: { restaurantId: store.selectedRestaurantId } })
}

const execDeviceLogin = async () => {
  if (store.device.value && store.user.value) {
    router.push({ name: 'home', params: { restaurantId: store.selectedRestaurantId } })
    return
  }
  isDeviceLoading.value = true
  const loginResult = await store.deviceLogin()
  if (!loginResult) {
    loginError.value = true
    isDeviceLoading.value = false
  } else
    router.push({ name: 'home', params: { restaurantId: store.selectedRestaurantId } })
}

watch(store.deviceCredentials, () => {
  if (store.deviceCredentials.value?.token)
    execDeviceLogin()
})

onMounted(() => {
  if (store.deviceCredentials.value?.token)
    execDeviceLogin()
})

</script>
