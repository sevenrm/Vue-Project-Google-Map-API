<script setup lang="ts">
import { Ref, ref, watch, onMounted } from 'vue'
import { apiClient } from '../../services/api'
import { PaginatedResultOfPlatformUserViewModel, PlatformUserSearchRequest, PlatformUserViewModel, RoleViewModel } from '../../services/api.client'
import { clone, pageContentHeight, pageContentHeightPx } from '../../services/utils'
import { store } from '../../services/store'
import Toggle from '../../components/ui/Toggle.vue'
import { useShowConfirm } from '../../services/injections'
import { FormBuilderFieldGroupDefinition, TableBuilderFieldDefinition } from '../../components/ui/types'
import { FePlatformUserViewModel } from '../../types'
import { notifier } from '../../services/notification'
import TableBuilder from '../../components/ui/TableBuilder.vue'
import FormBuilder from '../../components/ui/FormBuilder.vue'
import { nameof } from 'ts-simple-nameof'
import UserModal from '../../components/user/UserModal.vue'
import ScrollableDiv from '../../components/ui/ScrollableDiv.vue'

const userModal: Ref<PlatformUserViewModel | undefined> = ref(undefined)
const isLoading = ref(false)
const timezones: Ref<{ [timeZoneId: string]: string }[]> = ref([])

const usersResponse: Ref<PaginatedResultOfPlatformUserViewModel | undefined> = ref()
const roles: Ref<RoleViewModel[]> = ref([])
const filter = ref(PlatformUserSearchRequest.fromJS({ pageIdx: 0, pageSize: 20, restaurantId: '' })!)

const showConfirm = useShowConfirm()

const updateUserStatus = async (user: PlatformUserViewModel, isActive: boolean) => {
  try {
    await apiClient.userStatus(user.id!, isActive)
    notifier.notifySuccess('updated', 'user')
  } catch (error) {
    user.isActive = !isActive
    notifier.notifyError('saving', error, 'user')
    await loadUsers()
  }
}

const deleteUser = async (userId: string) => {
  showConfirm('proceedQuestion', async () => {
    try {
      isLoading.value = true
      await apiClient.userDelete(userId)
      userModal.value = undefined
      notifier.notifySuccess('deleted', 'user')
      await loadUsers()
    } catch (error) {
      notifier.notifyError('deleting', error, 'user')
    }
    isLoading.value = false
  })
}

const loadUsers = async (pageIdx = 0, pageSize = 10) => {
  try {
    isLoading.value = true
    filter.value.pageIdx = pageIdx
    filter.value.pageSize = pageSize
    usersResponse.value = await apiClient.userAll(filter.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'users')
  }
  isLoading.value = false
}

const loadRoles = async () => {
  try {
    isLoading.value = true
    roles.value = await apiClient.userRestaurantRoles(store.selectedRestaurant.value!.id!)
  } catch (error) {
    notifier.notifyError('loading', error, 'roles')
  }
  isLoading.value = false
}

const loadTimeZones = async () => {
  isLoading.value = true
  try {
    const timezonesMap = await apiClient.globalTimezones()
    timezones.value = Object.keys(timezonesMap).map(k => ({ key: k, label: timezonesMap[k] }))
  } catch (error) {
    notifier.notifyError('loading', error, 'timezones')
  }
  isLoading.value = false
}

const createUser = () => {
  userModal.value = new FePlatformUserViewModel({ restaurants: [store.selectedRestaurant.value!], suppliers: [] })
}

watch(store.selectedRestaurant, async () => {
  if (store.selectedRestaurant.value) {
    filter.value.restaurantId = store.selectedRestaurant.value.id
    await loadRoles()
    await loadUsers()
  }
})

watch(filter, () => loadUsers())

onMounted(async () => {
  if (store.selectedRestaurantId)
    filter.value.restaurantId = store.selectedRestaurant.value!.id
  await loadRoles()
  await loadUsers()
  await loadTimeZones()
})

const columnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<PlatformUserViewModel>(m => m.id)]: {
    type: 'id',
    name: '@'
  },
  [nameof<PlatformUserViewModel>(m => m.username)]: {
    type: 'string',
    name: '@'
  },
  [nameof<PlatformUserViewModel>(m => m.role.name)]: {
    type: 'string',
    name: 'role'
  },
  [nameof<PlatformUserViewModel>(m => m.parentName)]: {
    type: 'string',
    name: '@'
  },
  [nameof<PlatformUserViewModel>(m => m.isActive)]: {
    type: 'slot',
    name: '@'
  },
  action: {
    type: 'slot',
    name: ''
  }
})

const filterFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<PlatformUserSearchRequest>(m => m.username)]: {
      type: 'text',
      name: '@'
    },
    [nameof<PlatformUserSearchRequest>(m => m.parentUsername)]: {
      type: 'text',
      name: '@'
    },
    [nameof<PlatformUserSearchRequest>(m => m.isActive)]: {
      type: '3way',
      name: '@'
    },
    [nameof<PlatformUserSearchRequest>(m => m.roleId)]: {
      type: 'select',
      options: () => roles.value,
      optionLabel: 'name',
      optionValue: 'id',
      optionIf: (option: any) => option.name !== 'Admin' || store.isUserAdmin(),
      name: 'role'
    }
  } as FormBuilderFieldGroupDefinition
])
</script>

<template>
  <div class="w-full">

    <ScrollableDiv class="page-content" :height="pageContentHeight">
      <div class="h-full w-full ">
        <UserModal :timezones="timezones" v-if="userModal" :roles="roles" v-model="userModal"
          @saved="userModal = undefined; loadUsers()" @deleted="deleteUser(userModal!.id!)"
          @close="userModal = undefined">
        </UserModal>

        <TableBuilder :items="usersResponse?.items ?? []" :total-pages="usersResponse?.totalPages"
          :total-records="usersResponse?.totalRecords" :is-loading="isLoading" :change-page-callback="loadUsers"
          :show-pages="true" :columns="columnDefinition" @clicked="userModal = clone($event)">
          <template v-slot:head>
            <FormBuilder v-model="filter" :is-loading="isLoading" :fields-groups="filterFieldsGroups"></FormBuilder>
            <label class="form-label">
              <span>Filter by restaurant</span>
              <Toggle @click="$event.stopPropagation()" :model-value="!!filter.restaurantId"
                @update:model-value="filter.restaurantId = filter.restaurantId ? undefined : store.selectedRestaurant.value!.id" />
            </label>
          </template>
          <template v-slot:action-buttons-left>
            <button class="btn-action primary-fill" @click="createUser()">
              <span class="mdi mdi-plus ml-1"></span>
              <span>{{ $tc('new') }}</span>
            </button>
          </template>
          <template v-slot:isActive="{ item } : { item: any }">
            <Toggle @click="$event.stopPropagation()" v-model="item.isActive"
              @update:modelValue="updateUserStatus(item, $event)" />
          </template>
          <template v-slot:action="{ item } : { item: any }">
            <a @click="$event.stopPropagation(); deleteUser(item.id!)"
              class="cursor-pointer h-10 w-10 p-2 mx-1 hover:bg-gray-100 rounded-full transition-colors duration-150">
              <span class="mdi mdi-delete text-gray-body text-xl"></span>
            </a>
          </template>
        </TableBuilder>
      </div>
    </ScrollableDiv>
  </div>
</template>
