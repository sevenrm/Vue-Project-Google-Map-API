<script setup lang="ts">
import { Ref, ref, onMounted } from 'vue'
import TableBuilder from '../../components/ui/TableBuilder.vue'
import { PaginatedResultOfActivityLogViewModel, ActivityLogSearchRequest, PlatformOperationTypeEnum, ActivityLogViewModel, SelectOptionViewModel } from '../../services/api.client'
import { apiClient } from '../../services/api'
import { pageContentHeight, pageContentHeightPx } from '../../services/utils'
import { notifier } from '../../services/notification'
import { nameof } from 'ts-simple-nameof'
import { FormBuilderFieldGroupDefinition, TableBuilderFieldDefinition } from '../../components/ui/types'
import ScrollableDiv from '../../components/ui/ScrollableDiv.vue'
import FormBuilder from '../../components/ui/FormBuilder.vue'

const isLoading = ref(false)
const activityLogResponse: Ref<PaginatedResultOfActivityLogViewModel | undefined> = ref(undefined)
const activityLogSearchRequest = ref(new ActivityLogSearchRequest())

const loadActivityLog = async (pageIdx = 0, pageSize = 10) => {
  isLoading.value = true
  activityLogSearchRequest.value.pageIdx = pageIdx
  activityLogSearchRequest.value.pageSize = pageSize
  try {
    activityLogResponse.value = await apiClient.globalActivityLog(activityLogSearchRequest.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'history')
  }
  isLoading.value = false
}

onMounted(() => {
  loadActivityLog()
})

const columnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<ActivityLogViewModel>(m => m.restaurantSlug)]: {
    type: 'string',
    name: '@'
  },
  [nameof<ActivityLogViewModel>(m => m.platformOperationTypeId)]: {
    type: 'enum',
    enumValue: PlatformOperationTypeEnum,
    skipTranslation: true,
    name: '@'
  },
  [nameof<ActivityLogViewModel>(m => m.platformUserName)]: {
    type: 'string',
    name: '@'
  },
  [nameof<ActivityLogViewModel>(m => m.relatedEntityId)]: {
    type: 'id',
    name: '@'
  },
  [nameof<ActivityLogViewModel>(m => m.createdAt)]: {
    type: 'date',
    name: '@'
  }
})

const fetchStores = async (query: string) => {
  let options: SelectOptionViewModel[] = []

  try {
    options = await apiClient.globalStoresAutocomplete(query)
  } catch (error) {
    notifier.notifyError('loading', error, 'products')
  }
  return options
}

const searchFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    '[class]': 'grid grid-cols-3 gap-2',
    [nameof<ActivityLogSearchRequest>(m => m.dateFrom)]: {
      type: 'date',
      name: '@'
    },
    [nameof<ActivityLogSearchRequest>(m => m.dateTo)]: {
      type: 'date',
      name: '@'
    },
    [nameof<ActivityLogSearchRequest>(m => m.restaurantId)]: {
      type: 'autocomplete',
      options: (query: string) => fetchStores(query),
      name: '@'
    },
    [nameof<ActivityLogSearchRequest>(m => m.operationTypeId)]: {
      type: 'enum',
      name: 'operationType',
      enumValue: PlatformOperationTypeEnum,
      skipTranslation: true
    }
  }
])

</script>
<template>
  <div class="w-full">
    <ScrollableDiv class="page-content" :height="pageContentHeight">
      <TableBuilder :columns="columnDefinition" :items="activityLogResponse?.items ?? []"
        :total-pages="activityLogResponse?.totalPages" :total-records="activityLogResponse?.totalRecords"
        :is-loading="isLoading" :change-page-callback="loadActivityLog" :show-pages="true">
        <template v-slot:head>
          <FormBuilder :is-loading="isLoading" :fields-groups="searchFieldsGroups" v-model="activityLogSearchRequest">
          </FormBuilder>
        </template>
      </TableBuilder>
    </ScrollableDiv>
  </div>
</template>
