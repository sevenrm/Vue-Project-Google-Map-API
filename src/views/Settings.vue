<script setup lang="ts">

import { onMounted, Ref, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { apiClient } from '../services/api'
import { ChangePasswordRequest, ChangePinRequest, ChangeSettingsRequest, DeviceSettingsViewModel, DeviceViewModel } from '../services/api.client'
import LoadingButton from '../components/ui/LoadingButton.vue'
import { deviceApp } from '../services/deviceapp'
import { i18nInstance } from '../services/i18n'
import { notifier } from '../services/notification'
import { store } from '../services/store'
import { enumToArray, pageContentHeight, pageContentHeightPx } from '../services/utils'
import { useShowConfirm } from '../services/injections'
import PinPad from '../components/user/PinPad.vue'
import { FormBuilderFieldGroupDefinition } from '../components/ui/types'
import { nameof } from 'ts-simple-nameof'
import FormBuilder from '../components/ui/FormBuilder.vue'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'

enum SettingsTabEnum {
  General = 1,
  Password = 2,
  Pin = 3,
  // Authenticator = 4,
  Device = 5
}
const tabs = ref(enumToArray<keyof typeof SettingsTabEnum>(SettingsTabEnum))
const selectedTab: Ref<SettingsTabEnum> = ref(SettingsTabEnum.General)
const toast = useToast()
const showConfirm = useShowConfirm()

const deviceName = ref('')
const timezones: Ref<{ [timeZoneId: string]: string }> = ref({})
const changePinRequest = ref(new ChangePinRequest())
const changeSettingsRequest = ref(ChangeSettingsRequest.fromJS({ langCode: i18nInstance.global.locale, email: store.user.value?.email, timeZoneId: store.user.value?.timeZoneId })!)
const changePasswordRequest = ref(new ChangePasswordRequest())
const newPasswordRepeat = ref('')
const newPinRepeat = ref('')
const isLoading = ref(false)
onMounted(() => {
  loadTimeZones()
})
const loadTimeZones = async () => {
  isLoading.value = true
  try {
    timezones.value = await apiClient.globalTimezones()
  } catch (error) {
    notifier.notifyError('loading', error, 'timezones')
  }
  isLoading.value = false
}
const changePin = async () => {
  isLoading.value = true
  try {
    const updatedToken = await apiClient.userPin(changePinRequest.value)
    notifier.notifySuccess('saved', 'pin')
    const deviceUser = store.deviceUsers.value.find(u => u.id === store.user.value!.id!)
    changePinRequest.value = new ChangePinRequest()
    newPinRepeat.value = ''
    if (deviceUser)
      deviceUser.token = updatedToken
  } catch (error) {
    notifier.notifyError('saving', error, 'pin')
  }
  isLoading.value = false
}
const changePassword = async () => {
  isLoading.value = true
  try {
    await apiClient.userPassword(changePasswordRequest.value)
    notifier.notifySuccess('saved', 'password')
  } catch (error) {
    notifier.notifyError('saving', error, 'password')
  }
  isLoading.value = false
}

const saveDeviceSettings = async () => {
  isLoading.value = true
  try {
    await apiClient.deviceSettings(store.selectedRestaurantId!, store.device.value!.id!, store.device.value!.settings!)
    notifier.notifySuccess('saved', 'settings')
  } catch (error) {
    notifier.notifyError('saving', error, 'settings')
  }
  isLoading.value = false
}

const changeSettings = async () => {
  isLoading.value = true
  try {
    await apiClient.userSettings(changeSettingsRequest.value)
    const updatedUser = store.user.value!
    updatedUser.email = changeSettingsRequest.value.email
    updatedUser.langCode = changeSettingsRequest.value.langCode
    updatedUser.timeZoneId = changeSettingsRequest.value.timeZoneId
    store.user.value = updatedUser
    i18nInstance.global.locale = changeSettingsRequest.value.langCode as any
    notifier.notifySuccess('saved', 'settings')
  } catch (error) {
    notifier.notifyError('saving', error, 'settings')
  }
  isLoading.value = false
}

const addDevice = async () => {
  try {
    isLoading.value = true
    const token = await apiClient.devicePut(store.selectedRestaurant.value!.id!, DeviceViewModel.fromJS({
      restaurantId: store.selectedRestaurant.value!.id,
      deviceMachineId: store.deviceCredentials.value!.id,
      name: deviceName.value
    })!)
    deviceApp.addDevice(token)
  } catch (error) {
    notifier.notifyError('adding', error, 'device')
  }
  isLoading.value = false
}

const removeCurrentDevice = () => showConfirm('proceedQuestion', () => {
  store.logoutDevice()
  notifier.notifySuccess('removed', 'device')
})

const deviceSettingsFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<DeviceSettingsViewModel>(m => m.showScrollbarButtons)]: {
      type: 'toggle',
      name: '@'
    },
    [nameof<DeviceSettingsViewModel>(m => m.automaticLogoutSeconds)]: {
      type: 'number',
      name: '@'
    }
  }
])

</script>
<template>
  <div class="w-full">

    <ScrollableDiv class="page-content" :height="pageContentHeight">
      <div class="w-full flex relative my-2">
        <div class="flex flex-1">
          <ul>
            <template v-for="tab of tabs" :key="tab">
              <li v-if="SettingsTabEnum[tab] as any !== SettingsTabEnum.Device || store.deviceCredentials.value?.id"
                @click="selectedTab = SettingsTabEnum[tab]"
                :class="{ 'text-red-pnp': selectedTab === SettingsTabEnum[tab], 'text-gray-body': selectedTab !== SettingsTabEnum[tab] }"
                class="inline-block relative cursor-pointer rounded p-4 items-center uppercase text-base font-semibold transition-colors duration-150">
                <div class="flex items-center">
                  <div>
                    <span class="font-semibold">{{ tab }}</span>
                  </div>
                  <span v-if="selectedTab === SettingsTabEnum[tab]"
                    class="absolute left-0 right-0 mx-auto bottom-0 w-10 h-0.5 rounded-t-lg bg-red-pnp"></span>
                </div>
              </li>
            </template>
          </ul>
        </div>
      </div>
      <div class="card">
        <template v-if="selectedTab == SettingsTabEnum.General">
          <label class="form-label">
            <span>{{ $tc('language') }}</span>
            <div>
              <Popper hover arrow closeDelay="100" class="ml-3">
                <button
                  class="w-auto rounded-default p-2 hover:bg-white flex relative items-center justify-center text-white hover:text-red-pnp transition-colors duration-150">
                  <span class="fi mr-2 rounded" :class="['fi-' + changeSettingsRequest.langCode]"></span>
                  <span class="mdi mdi-chevron-down absolute right-0"></span>
                </button>
                <template #content>
                  <div
                    class="border-gray-200 z-10 -mt-3 text-base list-none rounded-default divide-y border divide-gray-100 shadow-default bg-white dark:bg-gray-720 dark:border-gray-720">
                    <ul class="py-1" aria-labelledby="dropdownButton">
                      <li v-for="locale in i18nInstance.global.availableLocales" :key="`locale-${locale}`" :value="locale"
                        @click="changeSettingsRequest.langCode = locale"
                        :class="{ 'text-red-pnp': changeSettingsRequest.langCode === locale, 'text-gray-body': changeSettingsRequest.langCode !== locale }"
                        class="cursor-pointer px-3 py-2 text-base hover:text-red-pnp font-semibold hover:bg-gray-100 transition-colors duration-150">
                        <span class="fi mr-2 rounded" :class="['fi-' + locale]"></span>
                        <span class="font-bold uppercase">{{ locale }}</span>
                      </li>
                    </ul>
                  </div>
                </template>
              </Popper>
            </div>
          </label>
          <label class="form-label w-full">
            <span>{{ $tc('timezone') }}</span>
            <select v-model="changeSettingsRequest.timeZoneId">
              <option></option>
              <option v-for="(name, timezoneId) of timezones" :value="timezoneId" :key="timezoneId">
                {{ name }}
              </option>
            </select>
          </label>
          <label class="form-label w-full">
            <span>{{ $tc('email') }}</span>
            <input type="email" v-model="changeSettingsRequest.email" />
          </label>
          <LoadingButton class="btn-action success-fill" @click="changeSettings()" :is-loading="isLoading"
            :is-disabled="isLoading">
            <span class="mdi mdi-content-save"></span>
            <span>{{ $tc('save') }}</span>
          </LoadingButton>
        </template>
        <template v-if="selectedTab === SettingsTabEnum.Password">
          <div>
            <label class="form-label w-full">
              <span>{{ $tc('currentPassword') }}</span>
              <input type="password" v-model="changePasswordRequest.currentPassword" />
            </label>
            <label class="form-label w-full">
              <span>{{ $tc('newPassword') }}</span>
              <input type="password" v-model="changePasswordRequest.newPassword" />
            </label>
            <label class="form-label w-full">
              <span>{{ $tc('repeatPassword') }}</span>
              <input type="password" v-model="newPasswordRepeat" />
            </label>
            <LoadingButton class="btn-action success-fill" @click="changePassword()" :is-loading="isLoading"
              :is-disabled="isLoading" :disabled="newPasswordRepeat !== changePasswordRequest.newPassword">
              <span class="mdi mdi-content-save"></span>
              <span>{{ $tc('save') }}</span>
            </LoadingButton>
          </div>
        </template>
        <template v-if="selectedTab === SettingsTabEnum.Pin">
          <!-- <PinPad></PinPad> -->
          <div>
            <label class="form-label w-full">
              <span>{{ $tc('currentPin') }}</span>
              <input type="password" v-model="changePinRequest.currentPin" />
            </label>
            <label class="form-label w-full">
              <span>{{ $tc('newPin') }}</span>
              <input type="password" v-model="changePinRequest.newPin" />
            </label>
            <label class="form-label w-full">
              <span>{{ $tc('repeatPin') }}</span>
              <input type="password" v-model="newPinRepeat" />
            </label>
            <LoadingButton class="btn-action success-fill" @click="changePin()" :is-loading="isLoading"
              :is-disabled="isLoading" :disabled="newPinRepeat !== changePinRequest.newPin">
              <span class="mdi mdi-content-save"></span>
              <span>{{ $tc('save') }}</span>
            </LoadingButton>
          </div>
        </template>
        <!-- <template v-if="selectedTab === SettingsTabEnum.Authenticator">
                  <div>

                  </div>
                </template> -->
        <template v-if="selectedTab === SettingsTabEnum.Device">
          <div v-if="!store.deviceCredentials.value?.token">
            <h2>{{ $tc('deviceDetected') }}</h2>
            <label class="form-label">
              <span>{{ $tc('name') }}</span>
              <input type="text" v-model="deviceName" />
            </label>
            <LoadingButton :is-loading="isLoading" :disabled="isLoading" @click="addDevice"
              class="btn-action primary-fill">
              {{ $tc('add') }}
            </LoadingButton>
          </div>
          <div v-else class="flex flex-col gap-2">
            <FormBuilder :fields-groups="deviceSettingsFieldsGroups" :is-loading="isLoading"
              v-model="store.device.value!.settings"></FormBuilder>
            <div class="flex items-center gap-2">
              <button class="btn-action danger" @click="removeCurrentDevice"
                v-if="store.deviceCredentials.value?.token">{{
                  $tc('unbindCurrent')
                }}</button>
              <LoadingButton class="btn-action success-fill" @click="saveDeviceSettings()" :is-loading="isLoading"
                :is-disabled="isLoading">
                <span class="mdi mdi-content-save"></span>
                <span>{{ $tc('save') }}</span>
              </LoadingButton>
            </div>
          </div>
        </template>
      </div>
    </ScrollableDiv>
  </div>
</template>
