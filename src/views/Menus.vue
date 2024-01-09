<script setup lang="ts">
import { Ref, ref, watch, onMounted } from 'vue'
import { apiClient } from '../services/api'
import { useRouter } from 'vue-router'
import { IMenuListItemViewModel, MenuListItemViewModel, PaginatedResultOfMenuListItemViewModel } from '../services/api.client'
import { store } from '../services/store'
import { useShowConfirm } from '../services/injections'
import { pageContentHeight, pageContentHeightPx } from '../services/utils'
import { notifier } from '../services/notification'
import TableBuilder from '../components/ui/TableBuilder.vue'
import { nameof } from 'ts-simple-nameof'
import { TableBuilderFieldDefinition } from '../components/ui/types'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'

const router = useRouter()
const pageSize = ref(10)
const currentPage = ref(0)
const menusResponse: Ref<PaginatedResultOfMenuListItemViewModel | undefined> = ref(undefined)
const isLoading: Ref<boolean> = ref(false)

const navigateToMenuDetail = (id: string) => router.push({ name: 'menu-details', params: { id } })

const loadMenus = async () => {
  if (store.selectedRestaurant.value === null) {
    console.error('Restaurant not found')
    return
  }
  try {
    isLoading.value = true
    menusResponse.value = await apiClient.menuAll(store.selectedRestaurant.value!.id!, currentPage.value, pageSize.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'menus')
  }
  isLoading.value = false
}

const updateDefaultMenu = async (menuId: string) => {
  try {
    await apiClient.restaurantMenu(store.selectedRestaurant.value!.id!, menuId)
    store.selectedRestaurant.value!.defaultMenuId = menuId
    notifier.notifySuccess('saved', 'defaultMenu')
  } catch (error) {
    notifier.notifyError('saving', error, 'menu')
  }
}

const showConfirm = useShowConfirm()

const deleteMenu = (menu: IMenuListItemViewModel) => {
  showConfirm('proceedQuestion', async () => {
    try {
      isLoading.value = true
      await apiClient.menuDelete(store.selectedRestaurant.value!.id!, menu.id!)
      notifier.notifySuccess('deleted', 'menu')
      await loadMenus()
    } catch (error) {
      notifier.notifyError('deleting', error, 'menu')
    }
    isLoading.value = false
  })
}

const cloneMenu = async (menu: IMenuListItemViewModel) => { }

watch(store.selectedRestaurant, () => {
  if (!store.selectedRestaurant.value) return
  loadMenus()
})

onMounted(async () => {
  if (store.selectedRestaurant.value)
    loadMenus()
})

const columnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<MenuListItemViewModel>(m => m.imageUrl)]: {
    type: 'image',
    name: ''
  },
  [nameof<MenuListItemViewModel>(m => m.languageInfo.name)]: {
    type: 'string',
    name: '@',
    class: 'font-medium'
  },
  [nameof<MenuListItemViewModel>(m => m.categoriesCount)]: {
    type: 'string',
    name: 'categories'
  },
  [nameof<MenuListItemViewModel>(m => m.createdAt)]: {
    type: 'date',
    name: 'createdOn'
  },
  [nameof<MenuListItemViewModel>(m => m.updatedAt)]: {
    type: 'date',
    name: 'updatedOn'
  },
  action: {
    type: 'slot',
    name: ''
  }
})
</script>
<template>
  <div class="w-full">
    <ScrollableDiv class="page-content" :height="pageContentHeight">
      <TableBuilder :items="menusResponse?.items ?? []" :show-search-button="false" :is-loading="isLoading"
        :columns="columnDefinition" @clicked="navigateToMenuDetail($event.id)">
        <template v-slot:action-buttons-left>
          <router-link :to="{ name: 'menu-details', params: { id: 'new' } }" class="btn-action primary-fill">
            <span class="mdi mdi-plus"></span>
            <span>{{ $tc('new') }}</span>
          </router-link>
        </template>
        <template v-slot:action="{ item } : { item: any }">
          <div class="flex justify-end items-center gap-2">
            <button v-if="store.selectedRestaurant.value?.defaultMenuId !== item.id" class="btn-action success mx-10"
              @click="$event.stopPropagation(); updateDefaultMenu(item.id!)">{{ $tc('makeDefault') }}</button>
            <template v-else>
              <div class="bg-primary rounded-default px-2 text-white font-semibold text-sm">{{
                $tc('default')
              }}</div>
            </template>
            <Popper hover arrow closeDelay="100">
              <button @click="$event.stopPropagation()" class="btn-action gray p-1">
                <span class="mdi mdi-dots-vertical text-gray-body text-xl"></span>
              </button>
              <template #content>
                <div @click="$event.stopPropagation()"
                  class="border-gray-200 z-10 w-44 -mt-2 text-base list-none rounded-default divide-y border divide-gray-100 shadow-default bg-white dark:bg-gray-800 dark:border-gray-800">
                  <ul class="py-1" aria-labelledby="dropdownButton">
                    <li
                      class="cursor-pointer px-3 py-2 text-base hover:text-red-pnp font-semibold text-gray-body hover:bg-gray-100 transition-colors duration-150">
                      <button class="py-1 px-3" @click="deleteMenu(item)">
                        <span class="mdi mdi-delete mr-2"></span>
                        <span>{{ $tc('delete') }}</span>
                      </button>
                    </li>
                    <!-- <li
                            class="cursor-pointer px-3 py-2 text-base hover:text-red-pnp font-semibold text-gray-body hover:bg-gray-100 transition-colors duration-150">
                            <button class="py-1 px-3" @click="cloneMenu(item)">
                              <span class="mdi mdi-content-copy mr-2"></span>
                              <span>{{ $tc('duplicate') }}</span>
                            </button>
                          </li> -->
                  </ul>
                </div>
              </template>
            </Popper>
          </div>
        </template>
      </TableBuilder>
    </ScrollableDiv>
  </div>
</template>
