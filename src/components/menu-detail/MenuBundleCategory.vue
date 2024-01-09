<script lang="ts" setup>
import { nameof } from 'ts-simple-nameof'
import { useForm } from 'vee-validate'
import { onMounted, PropType, ref, watch } from 'vue'
import { MenuBundleCategoryItemViewModel, MenuBundleCategoryViewModel, MenuItemViewModel } from '../../services/api.client'
import { useShowConfirm } from '../../services/injections'
import Collapse from '../ui/Collapse.vue'
import DraggableTable from '../ui/DraggableTable.vue'
import FormBuilder from '../ui/FormBuilder.vue'
import TableBuilder from '../ui/TableBuilder.vue'
import { string } from 'yup'
import { numberFormatter } from '../../services/number.formatter'
import { FormBuilderFieldGroupDefinition, TableBuilderFieldDefinition } from '../../components/ui/types'

const emits = defineEmits([
  'update:bundleCategory:validity',
  'update:bundleCategory',
  'remove:bundleCategory',
  'edit:menuItem'
])

const props = defineProps({
  isLoading: {
    type: Boolean,
    required: true
  },
  category: {
    type: Object as PropType<MenuBundleCategoryViewModel>,
    required: true
  },
  menuItemsMap: {
    type: Object as PropType<Record<string, MenuItemViewModel>>,
    required: true
  },
  languages: {
    type: Array as PropType<string[]>,
    required: true
  },
  defaultLanguage: {
    type: String,
    required: true
  },
  currentLanguage: {
    type: String,
    required: true
  }
})

const categoryLocal = ref(props.category)
watch(() => props.category, () => categoryLocal.value = props.category)
const showConfirm = useShowConfirm()

const onRemoveMenuItem = (menuItemId: string) => {
  showConfirm('proceedQuestion', () => {
    const index = categoryLocal.value.menuItems!.findIndex(c => c.id === menuItemId)
    if (index === -1) return
    categoryLocal.value.menuItems?.splice(index, 1)
    emits('update:bundleCategory', categoryLocal.value)
    //   notifier.notifySuccess('removed', 'menuItem')
  })
}

const showNewMenuItems = ref(false)
const menuItemsColumnDefinition = ref<TableBuilderFieldDefinition>({
  selector: {
    type: 'selector',
    isChecked: (item: any) => !!categoryLocal.value.menuItems!.find(i => item.id === i.id),
    changeEvt: (item: any, val: boolean) => {
      const idx = categoryLocal.value.menuItems!.findIndex(i => i.id === item.id)
      if (idx > -1)
        categoryLocal.value.menuItems!.splice(idx, 1)
      else
        categoryLocal.value.menuItems!.push(MenuBundleCategoryItemViewModel.fromJS({ id: item.id })!)
    }
  },
  image: {
    type: 'slot'
  },
  name: {
    type: 'slot',
    name: '@'
  }
})

const form = useForm()

const updateMenuBundleDetailValidity = async () => {
  const { valid } = await form.validate()
  emits('update:bundleCategory:validity', { bundleCategory: categoryLocal.value, valid })
}

const menuBundleCategoryFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    '[class]': 'flex flex-col gap-1 flex-1',
    'languageInfo[currentLanguage].name': {
      type: 'text',
      rules: string().required().min(3),
      name: '@',
      inputEvt: () => updateMenuBundleDetailValidity(),
      placeholder: (model: MenuBundleCategoryViewModel) => model.languageInfo![props.defaultLanguage].name,
      propsObject: () => ({ currentLanguage: props.currentLanguage })
    }
  } as FormBuilderFieldGroupDefinition, {
    '[class]': 'flex flex-col gap-1 w-32 items-center',
    [nameof<MenuBundleCategoryViewModel>(m => m.maxItems)]: {
      type: 'number',
      name: '@'
      // inputEvt: () => updateMenuBundleDetailValidity(),
    }
  } as FormBuilderFieldGroupDefinition
])

onMounted(() => {
  updateMenuBundleDetailValidity()
})

</script>
<template>
  <div class="card">
    <div class="flex justify-between gap-2 w-full mb-2">
      <div class="flex items-center">
        <Popper hover arrow closeDelay="100">
          <button class="text-gray-body btn-action gray p-1" @click="$event.stopPropagation()">
            <span class="mdi mdi-dots-vertical text-xl"></span>
          </button>
          <template #content>
            <div
              class="border-gray-200 z-90 w-44 -mt-2 text-base list-none rounded-default divide-y border divide-gray-100 shadow-default bg-white dark:bg-gray-800 dark:border-gray-800">
              <ul class="py-1" aria-labelledby="dropdownButton">
                <li
                  class="cursor-pointer px-3 py-2 text-base hover:text-red-pnp font-semibold text-gray-500 hover:bg-gray-100 transition-colors duration-150">
                  <button class="py-1 px-3" @click="$emit('clone:bundleCategory', categoryLocal)">
                    <span class="mdi mdi-content-copy pr-1"></span>
                    <span>{{ $tc('clone') }}</span>
                  </button>
                </li>
                <li
                  class="cursor-pointer px-3 py-2 text-base hover:text-red-pnp font-semibold text-gray-500 hover:bg-gray-100 transition-colors duration-150">
                  <button class="py-1 px-3" @click="$emit('remove:bundleCategory', categoryLocal)">
                    <span class="mdi mdi-delete pr-1"></span>
                    <span>{{ $tc('delete') }}</span>
                  </button>
                </li>
              </ul>
            </div>
          </template>
        </Popper>
      </div>
      <FormBuilder :is-loading="isLoading" v-model="categoryLocal"
        @update:model-value="$emit('update:bundleCategory', categoryLocal)"
        :fields-groups="menuBundleCategoryFieldsGroups" :display-as-column="true">
      </FormBuilder>
    </div>
    <div class="-mx-2 -mb-2">
      <Collapse :is-open="true" title="items">
        <TableBuilder v-if="showNewMenuItems" :carded="false" :fixed-page-size="5" :show-search-input="true"
          :is-loading="isLoading" :show-search-button="false" :items="Object.values(menuItemsMap)"
          :columns="menuItemsColumnDefinition"
          :filter-fn="(item, query) => item.languageInfo[defaultLanguage].name.toLowerCase().indexOf(query.toLowerCase()) > -1">
          <template v-slot:action-buttons-right>
            <button class="btn-action gray" @click="showNewMenuItems = false">
              <span class="mdi mdi-close"></span>
              <span>{{ $tc('close') }}</span>
            </button>
          </template>
          <template v-slot:image="{ item } : { item: any }">
            <div
              class="w-20 h-20 transition-colors my-1 border-gray-input border duration-150 bg-white cursor-pointer rounded flex items-center justify-center">
              <span class="mdi mdi-file-image-plus-outline" v-if="!item.medias.length"></span>
              <div class="w-full h-full relative" v-else>
                <img :src="item.medias[0].mediaUrl" class="w-full object-cover h-full rounded" />
              </div>
            </div>
          </template>
          <template v-slot:name="{ item } : { item: any }">
            {{ item.languageInfo[defaultLanguage].name }}
          </template>
          <template v-slot:delete="{ item } : { item: any }">
            <span class="mdi mdi-delete" @click="onRemoveMenuItem(item)"></span>
          </template>
        </TableBuilder>
        <DraggableTable v-else
          @update:model-value="categoryLocal.menuItems = $event; $emit('update:bundleCategory', categoryLocal)"
          :model-value="(categoryLocal.menuItems as any[])"
          :columns="{ img: { class: 'w-10' }, name: { name: '@' }, extraPrice: { name: '@' }, edit: { class: 'w-10' }, delete: { class: 'w-10' } }">
          <template v-slot:action-buttons>
            <button class="btn-action primary-fill" @click="showNewMenuItems = true">
              <span class="mdi mdi-plus"></span>
              <span>{{ $tc('add') }}</span>
            </button>
          </template>
          <template v-slot:img="{ item } : { item: any }">
            <div
              class="w-10 h-10 transition-colors my-1 border-gray-input border duration-150 bg-white cursor-pointer rounded flex items-center justify-center">
              <span class="mdi mdi-file-image" v-if="!menuItemsMap[item.id].medias.length"></span>
              <div class="w-full h-full relative" v-else>
                <img :src="menuItemsMap[item.id].medias[0].mediaUrl" class="w-full object-cover h-full rounded" />
              </div>
            </div>
          </template>
          <template v-slot:name="{ item } : { item: any }">
            {{ menuItemsMap[item.id].languageInfo[defaultLanguage].name }}
          </template>
          <template v-slot:extraPrice="{ item } : { item: any }">
            <label class="form-label -my-2">
              <div class="relative">
                <div class="prefix">
                  <span>{{ numberFormatter.currencySymbol }}</span>
                  <input type="number" v-model="item.extraPrice" class="cell w-24" />
                </div>
              </div>
            </label>
          </template>
          <template v-slot:delete="{ item } : { item: any }">
            <span class="mdi mdi-delete" @click="onRemoveMenuItem(item.id)"></span>
          </template>
          <template v-slot:edit="{ item } : { item: any }">
            <span class="mdi mdi-pencil" @click="$emit('edit:menuItem', item.id)"></span>
          </template>
        </DraggableTable>
      </Collapse>
    </div>
  </div>
</template>
