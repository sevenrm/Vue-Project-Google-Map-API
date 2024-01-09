<script setup lang="ts">
import { Ref, ref, watch, onMounted } from 'vue'
import { apiClient } from '../../services/api'
import { PaginatedResultOfStoreViewModel, RestaurantSearchRequest, StoreViewModel } from '../../services/api.client'
import { pageContentHeight, pageContentHeightPx } from '../../services/utils'
import { store } from '../../services/store'
import { useRouter } from 'vue-router'
import Toggle from '../../components/ui/Toggle.vue'
import { notifier } from '../../services/notification'
import TableBuilder from '../../components/ui/TableBuilder.vue'
import { nameof } from 'ts-simple-nameof'
import { TableBuilderFieldDefinition } from '../../components/ui/types'
import ScrollableDiv from '../../components/ui/ScrollableDiv.vue'

const isLoading = ref(false)

const restaurantsResponse: Ref<PaginatedResultOfStoreViewModel | undefined> = ref(undefined)

const filter = ref(RestaurantSearchRequest.fromJS({ pageIdx: 0, pageSize: 20 })!)

const loadRestaurants = async () => {
  try {
    isLoading.value = true
    restaurantsResponse.value = await apiClient.restaurantAll(filter.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'restaurants')
  }
  isLoading.value = false
}

const updateRestaurantStatus = async (restaurantId: string, isActive: boolean) => {
  try {
    await apiClient.restaurantStatus(restaurantId, isActive)
    notifier.notifySuccess('updated', 'restaurant')
  } catch (error) {
    notifier.notifyError('saving', error, 'restaurants')
    await loadRestaurants()
  }
}

watch(filter, () => loadRestaurants())

const router = useRouter()
onMounted(async () => {
  loadRestaurants()
})

const columnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<StoreViewModel>(m => m.logoUrl)]: {
    type: 'image',
    name: ''
  },
  [nameof<StoreViewModel>(m => m.id)]: {
    type: 'id',
    name: '@'
  },
  [nameof<StoreViewModel>(m => m.displayName)]: {
    type: 'string',
    name: '@'
  },
  [nameof<StoreViewModel>(m => m.currencyCode)]: {
    type: 'string',
    name: 'currency'
  },
  [nameof<StoreViewModel>(m => m.slug)]: {
    type: 'string',
    name: '@'
  },
  [nameof<StoreViewModel>(m => m.isActive)]: {
    type: 'slot',
    name: '@'
  }
})

</script>
<template>
  <div class="w-full">

    <ScrollableDiv class="page-content" :height="pageContentHeight">
      <TableBuilder :items="restaurantsResponse?.items ?? []" :total-pages="restaurantsResponse?.totalPages"
        :total-records="restaurantsResponse?.totalRecords" :is-loading="isLoading" :change-page-callback="loadRestaurants"
        :show-pages="true" :columns="columnDefinition" @clicked="router.push('/admin/restaurants/' + $event.id)">
        <template v-slot:head>
          <label class="form-label my-0">
            <span>Display name</span>
            <input v-model="filter.displayName" @keydown.enter="loadRestaurants" />
          </label>
          <label class="form-label my-0">
            <span>Slug</span>
            <input v-model="filter.slug" @keydown.enter="loadRestaurants"
              @keydown="e => { if (!new RegExp('[a-z\-]+', 'g').test(e.key)) e.preventDefault() }" />
          </label>
          <label class="form-label my-0">
            <span>Is Active</span>
            <select v-model="filter.isActive">
              <option :value="undefined">ALL</option>
              <option :value="true">YES</option>
              <option :value="false">NO</option>
            </select>
          </label>
        </template>
        <template v-slot:action-buttons-left>
          <router-link v-if="store.isUserAdmin()" :to="{ name: 'admin-restaurant-manager', params: { id: 'new' } }"
            class="btn-action primary-fill">
            <span class="mdi mdi-plus"></span>
            <span>{{ $tc('new') }}</span>
          </router-link>
        </template>
        <template v-slot:isActive="{ item } : { item: any }">
          <Toggle @click="$event.stopPropagation()" :model-value="item.isActive"
            @update:model-value="updateRestaurantStatus(item.id, $event)" />
        </template>
      </TableBuilder>
    </ScrollableDiv>
  </div>
</template>
