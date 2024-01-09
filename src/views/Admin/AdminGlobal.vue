<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { apiClient } from '../../services/api'
import { notifier } from '../../services/notification'
import { pageContentHeightPx, windowHeight } from '../../services/utils'
import Datepicker from '@vuepic/vue-datepicker'
import Collapse from '../../components/ui/Collapse.vue'
import TableBuilder from '../../components/ui/TableBuilder.vue'
import { TableBuilderFieldDefinition } from '../../components/ui/types'
import { PlatformFeatureTypeEnum, PlatformFeatureViewModel } from '../../services/api.client'
import { nameof } from 'ts-simple-nameof'

const date = ref(new Date())
const cacheKey = ref('')
const deleteCache = async () => {
  try {
    await apiClient.globalCache(cacheKey.value)
    notifier.notifySuccess('cleared', 'cache')
  } catch (error) {
    notifier.notifyError('cleared', error, 'cache')
  }
}

const triggerInvoice = async () => {
  try {
    await apiClient.globalInvoices(date.value)
    notifier.notifySuccess('triggered', 'invoice')
  } catch (error) {
    notifier.notifyError('triggering', error, 'invoice')
  }
}

const dateFromFilter = ref(new Date())
const dateToFilter = ref(new Date())
const sessionsCount = ref<{ [key: string]: number; }>({})
const loadSessionsCount = async () => {
  try {
    sessionsCount.value = await apiClient.globalSessions(dateFromFilter.value, dateToFilter.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'sessions')
  }
}

const isLoading = ref(false)
const featuresColumns = ref<TableBuilderFieldDefinition>({
  [nameof<PlatformFeatureViewModel>(m => m.platformFeatureTypeEnumId)]: {
    type: 'enum',
    enumName: 'PlatformFeatureTypeEnum',
    enumValue: PlatformFeatureTypeEnum
  },
  [nameof<PlatformFeatureViewModel>(m => m.monthlyPrice)]: {
    type: 'number',
    name: '@'
  },
  [nameof<PlatformFeatureViewModel>(m => m.annualPrice)]: {
    type: 'number',
    name: '@'
  }
})

const features = ref<PlatformFeatureViewModel[]>([])
const loadFeatures = async () => {
  isLoading.value = true
  try {
    features.value = await apiClient.globalFeaturesGet()
  } catch (error) {
    notifier.notifyError('loading', error, 'pricings')
  }
  isLoading.value = false
}

const saveFeatures = async () => {
  isLoading.value = true
  try {
    await apiClient.globalFeaturesPost(features.value)
    notifier.notifySuccess('saved', 'pricings')
    loadFeatures()
  } catch (error) {
    notifier.notifyError('loading', error, 'pricings')
  }
  isLoading.value = false
}

onMounted(() => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  dateFromFilter.value = yesterday
  loadSessionsCount()
  loadFeatures()
})
</script>
<template>
  <div class="page-content" :style="{ height: pageContentHeightPx }">
    <div class="flex flex-col gap-2">
      <div class="card flex gap-2 p-10 items-center">
        <div>
          <button class="btn-action primary" @click="triggerInvoice">Trigger invoice</button>
          <Datepicker v-model="date" :auto-apply="true">
          </Datepicker>
        </div>
        <div>
          <button class="btn-action primary" @click="deleteCache">Delete cache</button>
          <div class="form-label">
            <span>Cache key</span>
            <input type="text" v-model="cacheKey" />
          </div>
        </div>
      </div>
      <div class="card">
        <Collapse title="sessions" :is-first="true" :is-last="true" class="-m-2">
          <div class="flex flex-col p-2">
            <div class="flex gap-2 items-center">
              <label class="form-label">
                <span>Date from</span>
                <Datepicker v-model="dateFromFilter" :auto-apply="true">
                </Datepicker>
              </label>
              <label class="form-label">
                <span>Date to</span>
                <Datepicker v-model="dateToFilter" :auto-apply="true">
                </Datepicker>
              </label>
              <div>
                <button class="btn-action primary" @click="loadSessionsCount()">Search</button>
              </div>
            </div>
            <div v-for="(count, storeName) of sessionsCount" :key="storeName">{{ storeName }}:{{ count }}</div>
            <span v-if="!Object.keys(sessionsCount).length">no items</span>
          </div>
        </Collapse>
      </div>
      <div class="card">
        <Collapse title="pricings" :is-first="true" :is-last="true" class="-m-2">
          <TableBuilder :is-loading="isLoading" :columns="featuresColumns" :items="features">
            <template v-slot:head>
              <button class="btn-action success" @click="saveFeatures">Save</button>
            </template>
          </TableBuilder>
        </Collapse>
      </div>
    </div>
  </div>
</template>
