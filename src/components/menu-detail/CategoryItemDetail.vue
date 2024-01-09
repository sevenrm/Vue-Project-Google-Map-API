<script lang="ts" setup>
import { onMounted, PropType, reactive, Ref, ref, watch } from 'vue'
import Toggle from '../ui/Toggle.vue'
import { LanguageInfoViewModel, MenuAttributeGroupViewModel, MenuCategoryViewModel, MenuItemViewModel, VisibilityScheduleViewModel } from '../../services/api.client'
import { DropdownItem, FormBuilderFieldGroupDefinition, TableBuilderFieldDefinition } from '../../components/ui/types'
import { useShowConfirm } from '../../services/injections'
import { useToast } from 'vue-toastification'
import { useForm } from 'vee-validate'
import { string } from 'yup'
import FormBuilder from '../ui/FormBuilder.vue'
import TableBuilder from '../ui/TableBuilder.vue'
import DraggableTable from '../ui/DraggableTable.vue'
import Collapse from '../ui/Collapse.vue'
import { nameof } from 'ts-simple-nameof'
import { numberFormatter } from '../../services/number.formatter'
import { FeCategoryViewModel, FeMenuItemViewModel } from '../../types'
import Dropdown from '../ui/Dropdown.vue'

const toast = useToast()
const emits = defineEmits([
  'update:category',
  'update:category:validity',
  'remove:category',
  'clone:category',
  'add:group',
  'edit:menuItem',
  'update:menuItemsMap',
  'edit:visibilitySchedule'
])
const props = defineProps({
  languages: {
    type: Array as PropType<string[]>,
    required: true
  },
  isLoading: {
    type: Boolean,
    required: true
  },
  category: {
    type: Object as PropType<MenuCategoryViewModel>,
    required: true
  },
  menuAttributeGroups: {
    type: Array as PropType<MenuAttributeGroupViewModel[]>,
    required: true
  },
  menuItemsMap: {
    type: Object as PropType<Record<string, MenuItemViewModel>>,
    required: true
  },
  currentLanguage: {
    type: String,
    required: true
  },
  defaultLanguage: {
    type: String,
    required: true
  },
  collapsed: {
    type: Boolean,
    default: false
  },
  categories: {
    type: Array as PropType<FeCategoryViewModel[]>,
    required: true
  }
})

const form = useForm()
const categoryLocal = ref(props.category)
watch(() => props.category, () => categoryLocal.value = props.category)
const validationMap: Record<string, boolean> = reactive({})

const updateCategoryValidity = async () => {
  let { valid } = await form.validate()
  const areAllMenuItemsValid = Object.values(validationMap).every(entry => entry === true)
  valid = valid && areAllMenuItemsValid
  // console.log('CategoryItemDetail:updateCategoryValidity', { areAllMenuItemsValid }, validationMap)
  emits('update:category:validity', { category: categoryLocal.value, valid })
}

const showConfirm = useShowConfirm()

const menuItemCollapsed: Ref<{ [menuItemId: string]: boolean }> = ref({})

const onRemoveMenuItem = (menuItemId: string) => {
  showConfirm('proceedQuestion', () => {
    const index = categoryLocal.value.menuItemIds!.findIndex(c => c === menuItemId)
    if (index === -1) return
    categoryLocal.value.menuItemIds?.splice(index, 1)
    emits('update:category', categoryLocal.value)
    //   notifier.notifySuccess('removed', 'menuItem')
  })
}

const addMenuItem = (menuItemId?: string) => {
  const newMenuItem = new FeMenuItemViewModel({
    languageInfo: props.languages.reduce((map, lang) => ({ ...map, [lang]: new LanguageInfoViewModel() }), {})
  }).initialize()
  menuItemId = newMenuItem.id!

  menuItemCollapsed.value[menuItemId] = false
  emits('edit:menuItem', newMenuItem, () => {
    categoryLocal.value.menuItemIds!.unshift(menuItemId!)
    emits('update:category', categoryLocal.value)
  })
}

const toggleCollapse = (val: boolean) => {
  menuItemCollapsed.value = categoryLocal.value.menuItemIds!.reduce((map, id) => ({ ...map, [id]: val }), {})
}

onMounted(() => {
  updateCategoryValidity()
})

const categoryFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<MenuCategoryViewModel>(m => m.imageUrl)]: {
      type: 'image',
      name: 'image',
      imageSize: 'big'
    }
  },
  {
    '[class]': 'flex flex-col gap-1 flex-1',
    'languageInfo[currentLanguage].name': {
      type: 'text',
      name: '@',
      rules: string().required().min(3),
      inputEvt: () => updateCategoryValidity(),
      placeholder: (model: MenuCategoryViewModel) => model.languageInfo[props.defaultLanguage]?.name,
      propsObject: () => ({ currentLanguage: props.currentLanguage })
    },
    'languageInfo[currentLanguage].description': {
      type: 'textarea',
      class: 'resize-none',
      name: '@',
      placeholder: (model: MenuCategoryViewModel) => model.languageInfo[props.defaultLanguage]?.description,
      propsObject: () => ({ currentLanguage: props.currentLanguage })
    }
  } as FormBuilderFieldGroupDefinition, {
    '[class]': 'flex flex-col gap-1 justify-start h-full',
    [nameof<MenuCategoryViewModel>(m => m.isVisible)]: {
      type: 'toggle',
      name: '@'
    }
  } as FormBuilderFieldGroupDefinition])

const showNewMenuItems = ref(false)
const menuItemsColumnDefinition = ref<TableBuilderFieldDefinition>({
  selector: {
    type: 'selector',
    isChecked: (item: any) => categoryLocal.value.menuItemIds!.includes(item.id),
    changeEvt: (item: any, val: boolean) => {
      const category = categoryLocal.value
      const idx = category.menuItemIds!.indexOf(item.id)
      if (idx > -1)
        category.menuItemIds!.splice(idx, 1)
      else
        category.menuItemIds!.push(item.id)
      emits('update:category', category)
    }
  },
  image: {
    type: 'slot',
    class: 'w-20',
    columnClass: 'w-20'
  },
  name: {
    type: 'slot',
    name: '@'
  },
  price: {
    type: 'currency',
    name: '@'
  },
  edit: {
    name: '',
    type: 'slot'
  }
})

const dropdownItems = ref<DropdownItem[]>([
  {
    text: 'delete',
    icon: 'delete',
    action: () => emits('remove:category', categoryLocal.value.id)
  },
  {
    text: 'visibilitySchedule',
    icon: 'clock',
    action: () => emits('edit:visibilitySchedule', (schedules: VisibilityScheduleViewModel[]) => {
      categoryLocal.value.schedules = schedules
      emits('update:category', categoryLocal.value)
    }, categoryLocal.value.schedules)
  }
])
</script>

<template>
  <div class="w-full cursor-pointer flex flex-col relative">
    <div class="card flex flex-col items-stretch mb-4">
      <div class="flex justify-between gap-2 w-full mb-2">
        <div class="flex items-center">
          <Dropdown :items="dropdownItems">
            <button class="text-gray-body btn-action gray p-1">
              <span class="mdi mdi-dots-vertical text-xl"></span>
            </button>
          </Dropdown>
        </div>
        <FormBuilder :is-loading="isLoading" v-model="categoryLocal"
          @update:model-value="$emit('update:category', categoryLocal)" :fields-groups="categoryFieldsGroups"
          :display-as-column="true">
        </FormBuilder>
      </div>
      <div class="-mx-2 -mb-2">
        <Collapse :is-open="true" title="items" :is-last="true">
          <TableBuilder v-if="showNewMenuItems" :carded="false" :fixed-page-size="5" :show-search-input="true"
            :is-loading="isLoading" :show-search-button="false" :items="Object.values(menuItemsMap)"
            :columns="menuItemsColumnDefinition"
            :filter-fn="(item, query) => item.languageInfo[defaultLanguage]?.name.toLowerCase().indexOf(query.toLowerCase()) > -1">
            <template v-slot:action-buttons-right>
              <div class="flex py-0.5 gap-2 items-end">
                <button class="btn-action gray" @click="showNewMenuItems = false">
                  <span class="mdi mdi-close"></span>
                  <span>{{ $tc('close') }}</span>
                </button>
                <button class="btn-action primary-fill" @click="addMenuItem()">
                  <span class="mdi mdi-plus"></span>
                  <span>{{ $tc('new') }}</span>
                </button>
              </div>
            </template>
            <template v-slot:image="{ item } : { item: any }">
              <div
                class="w-20 h-20 transition-colors my-1 border-gray-input border duration-150 bg-white cursor-pointer rounded flex items-center justify-center">
                <span class="mdi mdi-file-image" v-if="!item.medias.length"></span>
                <div class="w-full h-full relative" v-else>
                  <img :src="item.medias[0].mediaUrl" class="w-full object-cover h-full rounded" />
                </div>
              </div>
            </template>
            <template v-slot:name="{ item } : { item: any }">
              {{ item.languageInfo[defaultLanguage]?.name }}
            </template>
            <template v-slot:edit="{ item } : { item: any }">
              <span class="mdi mdi-pencil" @click="$emit('edit:menuItem', item)"></span>
            </template>
          </TableBuilder>
          <DraggableTable v-else @update:model-value="$emit('update:category', categoryLocal)"
            v-model="categoryLocal.menuItemIds"
            :columns="{ img: { class: 'w-10' }, name: { name: '@' }, isVisible: { name: '@' }, price: { name: '@' }, edit: { class: 'w-10' }, delete: { class: 'w-10' } }">
            <template v-slot:action-buttons>
              <button class="btn-action primary-fill" @click="showNewMenuItems = true">
                <span class="mdi mdi-plus"></span>
                <span>{{ $tc('add') }}</span>
              </button>
            </template>
            <template v-slot:name="{ item: itemId }">
              {{ menuItemsMap[itemId].languageInfo[defaultLanguage]?.name }}
            </template>
            <template v-slot:img="{ item: itemId }">
              <div
                class="w-10 h-10 transition-colors my-1 border-gray-input border duration-150 bg-white cursor-pointer rounded flex items-center justify-center">
                <span class="mdi mdi-file-image" v-if="!menuItemsMap[itemId].medias.length"></span>
                <div class="w-full h-full relative" v-else>
                  <img :src="menuItemsMap[itemId].medias[0].mediaUrl" class="w-full object-cover h-full rounded" />
                </div>
              </div>
            </template>
            <template v-slot:price="{ item: itemId }">
              <span>{{ numberFormatter.currency(menuItemsMap[itemId].price) }}</span>
            </template>
            <template v-slot:isVisible="{ item: itemId }">
              <div class="flex items-center">
                <label class="form-label -mt-1">
                  <Toggle v-model="menuItemsMap[itemId].isVisible"></Toggle>
                </label>
              </div>
            </template>
            <template v-slot:delete="{ item: itemId }">
              <span class="mdi mdi-delete" @click="onRemoveMenuItem(itemId)"></span>
            </template>
            <template v-slot:edit="{ item: itemId }">
              <span class="mdi mdi-pencil" @click="$emit('edit:menuItem', menuItemsMap[itemId])"></span>
            </template>
          </DraggableTable>
        </Collapse>
      </div>
    </div>
  </div>
</template>
