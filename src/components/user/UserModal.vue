<script lang="ts" setup>
import { nameof } from 'ts-simple-nameof'
import { onMounted, PropType, ref } from 'vue'
import { apiClient } from '../../services/api'
import { PlatformUserViewModel, RoleViewModel } from '../../services/api.client'
import { notifier } from '../../services/notification'
import { store } from '../../services/store'
import { FormBuilderFieldGroupDefinition, TableBuilderFieldDefinition } from '../../components/ui/types'
import FormBuilder from '../ui/FormBuilder.vue'
import { ModalSize } from '../ui/types'
import Modal from '../ui/Modal.vue'
import TableBuilder from '../ui/TableBuilder.vue'

const props = defineProps({
  modelValue: {
    type: Object as PropType<PlatformUserViewModel>,
    required: true
  },
  roles: {
    type: Array as PropType<RoleViewModel[]>,
    required: true
  },
  timezones: {
    type: Array as PropType<{ [timeZoneId: string]: string }[]>,
    required: true
  },
  parentId: String,
  showDelete: Boolean
})

const emits = defineEmits(['update:modelValue', 'saved', 'deleted', 'close'])

const isLoading = ref(false)

const fetchUsers = async (query: string) => {
  let options: any[] = []
  if (props.modelValue.parentId && !query)
    options.push({ label: props.modelValue.parentName, value: props.modelValue.parentId })
  else
    try {
      options = await apiClient.userAutocomplete(query)
    } catch (error) {
      notifier.notifyError('loading', error, 'users')
    }
  return options
}

const saveUser = async () => {
  try {
    isLoading.value = true
    await apiClient.userPost(props.modelValue)
    emits('saved')
    notifier.notifySuccess('saved', 'user')
  } catch (error) {
    notifier.notifyError('saving', error, 'user')
  }
  isLoading.value = false
}

const userModalFormFieldGroups = ref([
  {
    [nameof<PlatformUserViewModel>(m => m.username)]: {
      type: 'text',
      name: '@',
      disabled: (model: PlatformUserViewModel) => !!model.id
    },
    [nameof<PlatformUserViewModel>(m => m.role.id)]: {
      type: 'select',
      options: () => props.roles,
      optionLabel: 'name',
      optionValue: 'id',
      optionIf: (option: any) => option.name !== 'Admin' || store.isUserAdmin(),
      name: 'role'
    },
    [nameof<PlatformUserViewModel>(m => m.password)]: {
      type: 'text',
      name: '@'
    },
    [nameof<PlatformUserViewModel>(m => m.pin)]: {
      type: 'number',
      name: '@',
      if: () => store.isUserAdmin()
    },
    [nameof<PlatformUserViewModel>(m => m.isActive)]: {
      type: 'toggle',
      name: '@'
    },
    [nameof<PlatformUserViewModel>(m => m.email)]: {
      type: 'email',
      name: '@'
    },
    [nameof<PlatformUserViewModel>(m => m.langCode)]: {
      type: 'language',
      name: '@'
    },
    [nameof<PlatformUserViewModel>(m => m.timeZoneId)]: {
      type: 'select',
      name: '@',
      options: () => props.timezones,
      optionValue: 'key',
      optionLabel: 'label'
    },
    [nameof<PlatformUserViewModel>(m => m.parentId)]: {
      type: 'autocomplete',
      options: (query: string) => fetchUsers(query),
      name: 'parent',
      if: () => store.isUserAdmin() && !props.parentId
    }
  } as FormBuilderFieldGroupDefinition
])

const restaurantsMappingColumnDefinition = ref<TableBuilderFieldDefinition>({
  '[value]': {
    type: 'string',
    name: 'name'
  },
  deleteAction: {
    type: 'icon',
    iconName: 'delete',
    clicked: (item: any) => delete props.modelValue!.mappedRestaurants[item['[key]']]
  }
})

onMounted(() => {
  if (props.parentId) {
    const modelValue = props.modelValue
    modelValue.parentId = props.parentId
    emits('update:modelValue', modelValue)
  }
})
</script>
<template>
  <Modal v-if="modelValue" :show-close-only="false" :size="ModalSize.Medium" :is-loading="isLoading"
    :action-buttons="[{ text: 'confirm', colorClass: 'success-fill', iconName: 'content-save', action: () => saveUser() }, ...(modelValue.id && showDelete ? [{ text: 'delete', iconName: 'delete', colorClass: 'danger', action: () => $emit('deleted') }] : [])]"
    @close="$emit('close')" :title="modelValue.id ? 'updateUser' : 'createUser'">
    <template v-slot:content>
      <div class="flex text-gray-body justify-center my-4" v-if="modelValue.id">
        <span>ID:</span>
        <span>{{ modelValue.id }}</span>
      </div>
      <FormBuilder :is-loading="isLoading" :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)" :fields-groups="userModalFormFieldGroups">
      </FormBuilder>
      <div class="w-full pt-2">
        <label class="form-label">
          <span>{{ $tc('mappedRestaurants') }}</span>
        </label>
        <TableBuilder :is-loading="isLoading" :carded="false" :show-search-button="false"
          :columns="restaurantsMappingColumnDefinition" :items="modelValue.mappedRestaurants" :show-pages="false">
        </TableBuilder>
      </div>
    </template>
  </Modal>
</template>
