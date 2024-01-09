<script lang="ts" setup>
import { onMounted, ref, Ref } from 'vue'
import { apiClient } from '../../services/api'
import { PlatformPermissionEnum, RoleViewModel } from '../../services/api.client'
import { notifier } from '../../services/notification'
import { enumToArray, pageContentHeight, pageContentHeightPx } from '../../services/utils'
import { useShowConfirm } from '../../services/injections'
import ScrollableDiv from '../../components/ui/ScrollableDiv.vue'

const roles: Ref<RoleViewModel[]> = ref([])
const platformPermissions = ref(enumToArray(PlatformPermissionEnum).map(v => PlatformPermissionEnum[v as any]))
const showConfirm = useShowConfirm()

const loadRoles = async () => {
  try {
    roles.value = await apiClient.globalRoles()
  } catch (error) {
    notifier.notifyError('loading', error, 'roles')
  }
}

const saveRole = (role: RoleViewModel) => {
  showConfirm('proceedQuestion', async () => {
    try {
      await apiClient.globalRolePost(role)
      loadRoles()
      notifier.notifySuccess('saved', 'role')
    } catch (error) {
      notifier.notifyError('saving', error, 'role')
    }
  })
}

const deleteRole = (role: RoleViewModel) => {
  showConfirm('proceedQuestion', async () => {
    try {
      if (role.id)
        await apiClient.globalRoleDelete(role.id)
      await loadRoles()
      notifier.notifySuccess('deleted', 'role')
    } catch (error) {
      notifier.notifyError('deleting', error, 'role')
    }
  })
}

const togglePermission = (role: RoleViewModel, permission: PlatformPermissionEnum) => {
  const idx = role.permissions.indexOf(permission)
  if (idx > -1)
    role.permissions.splice(idx, 1)
  else
    role.permissions.push(permission)
}

const createNew = () => roles.value.push(RoleViewModel.fromJS({ permissions: [] })!)

onMounted(() => {
  loadRoles()
})

</script>

<template>
  <div class="w-full">

    <ScrollableDiv class="page-content" :height="pageContentHeight">
      <div class="h-full w-full flex flex-col">
        <div class="my-6 border-b py-6">
          <button class="btn-action primary-fill text-white" @click="createNew">
            <span>Create</span>
            <span class="mdi mdi-plus ml-1"></span>
          </button>
        </div>
        <div class="justify-between flex">
        </div>
        <div class="my-4 flex">
          <div class="card w-full">
            <div>
              <div class="flex flex-col justify-center">
                <table class="w-full text-[8px] md:text-base">
                  <thead>
                    <tr class="py-4 font-medium text-gray-400">
                      <th>Name</th>
                      <th v-for="permission of platformPermissions" :key="permission" class="px-2">
                        {{ PlatformPermissionEnum[permission] }}
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="border-b hover:bg-gray-50 cursor-pointer" v-for="role of roles" :key="role.id">
                      <td class="text-center py-3">
                        <div class="form-label">
                          <input type="text" v-model="role.name" />
                        </div>
                      </td>
                      <td class="text-center py-3" v-for="permission of platformPermissions" :key="permission">
                        <div class="flex items-center justify-center">
                          <div class="form-label">
                            <input type="checkbox" :checked="role.permissions.indexOf(permission) > -1"
                              @change="togglePermission(role, permission)" />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="flex gap-2">
                          <button class="btn-action success-fill" @click="saveRole(role)">
                            <span class="mdi mdi-content-save"></span>
                            <span>Save</span>
                          </button>
                          <button class="btn-action danger-fill" @click="deleteRole(role)">
                            <span class="mdi mdi-delete"></span>
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollableDiv>
  </div>
</template>
