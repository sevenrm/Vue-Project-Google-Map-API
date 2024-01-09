<script lang="ts" setup>
import { computed, ref } from 'vue'
import PinPad from '../components/user/PinPad.vue'
import { notifier } from '../services/notification'
import { store } from '../services/store'
import { windowHeight } from '../services/utils'

const selectedUserId = ref(store.user.value?.id)
const selectedUser = computed(() => selectedUserId.value ? store.deviceUsers.value.find(u => u.id === selectedUserId.value) : undefined)
const pinLogin = async (pin: string) => {
  const loginResponse = await store.pinLogin(selectedUserId.value!, pin)
  if (!loginResponse)
    notifier.notifyError('invalidLogin')
}
</script>
<template>
  <section class="flex flex-col justify-center items-center bg-gradient" :style="{ 'height': windowHeight + 'px' }">
    <span class="mdi mdi-power text-2xl fixed bottom-4 right-4 cursor-pointer text-white hover:text-gray-100"
      @click="store.logoutDevice()"></span>
    <div class="max-w-md justify-center card p-1">
      <div v-if="selectedUser" class="flex flex-col p-4 gap-2">
        <div class="flex items-center justify-center">
          <span class="font-semibold text-lg">{{ selectedUser.username }}</span>
        </div>
        <PinPad @confirm="pinLogin"></PinPad>
        <div class="flex items-center justify-center">
          <button @click="selectedUserId = undefined" class="btn-action gray">
            <span class="mdi mdi-account-switch"></span>
          </button>
        </div>
      </div>
      <div class="w-full" v-else>
        <ul>
          <li :class="{ 'border-t': idx > 0, 'text-primary': user.id === store.user.value?.id }"
            class="py-2 px-10 text-center hover:bg-gray-100 cursor-pointer"
            v-for="(user, idx) of store.deviceUsers.value" :key="user.id" @click="selectedUserId = user.id">
            <span class="font-semibold">{{ user.username }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
