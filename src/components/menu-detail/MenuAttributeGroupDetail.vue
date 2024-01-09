<script lang="ts" setup>
import { computed, onMounted, PropType, reactive, ref, watch } from 'vue'
import { LanguageInfoViewModel, MenuAttributeGroupViewModel, MenuAttributeItemViewModel, MenuItemViewModel } from '../../services/api.client'
import { useForm } from 'vee-validate'
import { string } from 'yup'
import FormBuilder from '../ui/FormBuilder.vue'
import Collapse from '../ui/Collapse.vue'
import TableBuilder from '../ui/TableBuilder.vue'
import { useShowConfirm } from '../../services/injections'
import { notifier } from '../../services/notification'
import DraggableTable from '../ui/DraggableTable.vue'
import { nameof } from 'ts-simple-nameof'
import { FormBuilderFieldGroupDefinition, TableBuilderFieldDefinition } from '../../components/ui/types'
import { FeMenuAttributeItem } from '../../types'
import { numberFormatter } from '../../services/number.formatter'
import Toggle from '../ui/Toggle.vue'

const emits = defineEmits([
  'update:menuAttributeGroup:validity',
  'update:menuAttributeGroup',
  'change:variant',
  'remove:menuAttributeGroup',
  'update:attributeItem',
  'edit:attributeItem'
])
const props = defineProps({
  isLoading: {
    type: Boolean,
    required: true
  },
  isFromModal: Boolean,
  isVariantMode: Boolean,
  menuAttributeGroup: {
    type: Object as PropType<MenuAttributeGroupViewModel>,
    required: true
  },
  attributeGroupBoundItems: {
    type: Object as PropType<{ [attributeGroupId: string]: string[] }>,
    required: true
  },
  attributeItemBoundGroups: {
    type: Object as PropType<{ [attributeGroupId: string]: string[] }>,
    required: true
  },
  menuAttributeGroupsMap: {
    type: Object as PropType<Record<string, MenuAttributeGroupViewModel>>,
    required: true
  },
  menuItemsMap: {
    type: Object as PropType<Record<string, MenuItemViewModel>>,
    required: true
  },
  menuAttributeItemsMap: {
    type: Object as PropType<Record<string, MenuAttributeItemViewModel>>,
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

const showConfirm = useShowConfirm()

const menuAttributeGroupLocal = ref(props.menuAttributeGroup)
watch(() => props.menuAttributeGroup, () => menuAttributeGroupLocal.value = props.menuAttributeGroup)
const form = useForm()

const showNewItems = ref(false)
const attributeItemColumnDefinition = ref<TableBuilderFieldDefinition>({
  selector: {
    type: 'selector',
    isChecked: (item: any) => menuAttributeGroupLocal.value.attributeItemIds!.includes(item.id),
    changeEvt: (item: any, val: boolean) => {
      const idx = menuAttributeGroupLocal.value.attributeItemIds!.indexOf(item.id)
      if (idx > -1)
        menuAttributeGroupLocal.value.attributeItemIds!.splice(idx, 1)
      else
        menuAttributeGroupLocal.value.attributeItemIds!.push(item.id)
      emits('update:menuAttributeGroup', menuAttributeGroupLocal.value)
    }
  },
  name: {
    type: 'slot',
    name: '@'
  },
  boundItems: {
    type: 'slot'
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
const validationMap: Record<string, boolean> = reactive({})

const updateAttributeItemProp = (attributeItem: MenuAttributeItemViewModel, prop: keyof MenuAttributeItemViewModel, val: any) => {
  (attributeItem as any)[prop] = val
  emits('update:attributeItem', attributeItem)
}

// First time will be triggered by the children MenuAttributeDetail, as they trigger on mounted, bubbling up.
const updateAttributeGroupValidity = async () => {
  let { valid } = await form.validate()
  const areAllMenuItemsValid = Object.values(validationMap).every(entry => entry === true)
  valid = valid && areAllMenuItemsValid
  emits('update:menuAttributeGroup:validity', { group: menuAttributeGroupLocal.value, valid })
}

const addAttributeItem = (attributeItemId?: string) => {
  const newAttributeItem = new FeMenuAttributeItem({
    languageInfo: props.languages.reduce((map, lang) => ({ ...map, [lang]: new LanguageInfoViewModel() }), {})
  }).initialize()
  attributeItemId = newAttributeItem.id!

  emits('edit:attributeItem', newAttributeItem, () => {
    menuAttributeGroupLocal.value.attributeItemIds!.unshift(attributeItemId!)
    emits('update:menuAttributeGroup', menuAttributeGroupLocal.value)
  })
}

const attributeGroupFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    '[class]': 'flex gap-2',
    'languageInfo[currentLanguage].name': {
      type: 'text',
      class: 'flex-1',
      rules: string().required().min(3),
      name: '@',
      inputEvt: () => updateAttributeGroupValidity(),
      placeholder: (model: MenuAttributeGroupViewModel) => model.languageInfo[props.defaultLanguage].name,
      propsObject: () => ({ currentLanguage: props.currentLanguage })
    },
    [nameof<MenuAttributeGroupViewModel>(m => m.minSelections)]: {
      type: 'number',
      name: '@',
      if: () => !props.isVariantMode
    },
    [nameof<MenuAttributeGroupViewModel>(m => m.maxSelections)]: {
      type: 'number',
      name: '@',
      if: () => !props.isVariantMode
    }
  } as FormBuilderFieldGroupDefinition
])

const onRemoveAttributeItem = (attributeItemId: string) => {
  showConfirm('proceedQuestion', () => {
    const index = menuAttributeGroupLocal.value.attributeItemIds.findIndex(c => c === attributeItemId)
    if (index === -1) return
    menuAttributeGroupLocal.value.attributeItemIds?.splice(index, 1)
    emits('update:menuAttributeGroup', menuAttributeGroupLocal.value)
    notifier.notifySuccess('removed', 'attributeItem')
  })
}

const sortedAttributes = computed(() => Object.values(props.menuAttributeItemsMap).sort((a, b) => (a.languageInfo[props.defaultLanguage].name ?? '').localeCompare(b.languageInfo[props.defaultLanguage].name!)))

onMounted(() => {
  updateAttributeGroupValidity()
})
</script>

<template>
  <div class="card flex-col flex items-stretch">
    <div class="flex gap-2" v-if="attributeGroupBoundItems[menuAttributeGroup.id!]">
      <span class="text-xs rounded-xl py-0.5 px-2 bg-gray-body text-white"
        v-for="menuItemId of attributeGroupBoundItems[menuAttributeGroup.id!]" :key="menuItemId">{{
          menuItemsMap[menuItemId].languageInfo[props.defaultLanguage].name }}</span>
    </div>
    <div class="w-full flex flex-1 items-center mb-2 gap-2">
      <Popper hover arrow closeDelay="100" v-if="!isVariantMode">
        <button class="text-gray-body btn-action gray p-1" @click="$event.stopPropagation()">
          <span class="mdi mdi-dots-vertical text-xl"></span>
        </button>
        <template #content>
          <div
            class="border-gray-200 z-90 w-44 -mt-2 text-base list-none rounded-default divide-y border divide-gray-100 shadow-default bg-white dark:bg-gray-800 dark:border-gray-800">
            <ul class="py-1" aria-labelledby="dropdownButton">
              <li
                class="cursor-pointer px-3 py-2 text-base hover:text-red-pnp font-semibold text-gray-500 hover:bg-gray-100 transition-colors duration-150">
                <button class="py-1 px-3" @click="$emit('clone:menuAttributeGroup', menuAttributeGroupLocal)">
                  <span class="mdi mdi-content-copy mr-2"></span>
                  <span>{{ $tc('duplicate') }}</span>
                </button>
              </li>
              <li
                class="cursor-pointer px-3 py-2 text-base hover:text-red-pnp font-semibold text-gray-500 hover:bg-gray-100 transition-colors duration-150">
                <button class="py-1 px-3" @click="emits('remove:menuAttributeGroup', menuAttributeGroupLocal)">
                  <span class="mdi mdi-delete mr-2"></span>
                  <span>{{ $tc('delete') }}</span>
                </button>
              </li>
            </ul>
          </div>
        </template>
      </Popper>
      <FormBuilder :is-loading="isLoading" v-model="menuAttributeGroupLocal"
        @update:model-value="$emit('update:menuAttributeGroup', menuAttributeGroupLocal)"
        :fields-groups="attributeGroupFieldsGroups">
      </FormBuilder>
    </div>
    <div class="-mx-2 -mb-2">
      <Collapse title="options" :is-last="true" :is-open="isFromModal" :unwrap="isVariantMode">
        <TableBuilder v-if="showNewItems" :carded="false" :fixed-page-size="5" :show-search-input="true"
          :is-loading="isLoading" :show-search-button="false" :items="sortedAttributes"
          :columns="attributeItemColumnDefinition"
          :filter-fn="(item, query) => item.languageInfo[defaultLanguage].name.toLowerCase().indexOf(query.toLowerCase()) > -1">
          <template v-slot:action-buttons-right>
            <div class="flex py-0.5 gap-2 items-end">
              <button class="btn-action gray" @click="showNewItems = false">
                <span class="mdi mdi-close"></span>
                <span>{{ $tc('close') }}</span>
              </button>
              <button class="btn-action primary-fill" @click="addAttributeItem()">
                <span class="mdi mdi-plus"></span>
                <span>{{ $tc('new') }}</span>
              </button>
            </div>
          </template>
          <template v-slot:name="{ item } : { item: any }">
            {{ item.languageInfo[defaultLanguage].name }}
          </template>
          <template v-slot:boundItems="{ item } : { item: any }">
            <span class="text-xs rounded-xl py-0.5 px-2 bg-gray-body text-white"
              v-for="attributeGroupId of attributeItemBoundGroups[item.id!]" :key="attributeGroupId">{{
                menuAttributeGroupsMap[attributeGroupId].languageInfo[props.defaultLanguage].name }}</span>
          </template>
          <template v-slot:edit="{ item } : { item: any }">
            <span class="mdi mdi-pencil" @click="$emit('edit:attributeItem', item)"></span>
          </template>
        </TableBuilder>
        <DraggableTable v-else v-model="menuAttributeGroupLocal.attributeItemIds" group-name="attributes"
          @update:model-value="$emit('update:menuAttributeGroup', menuAttributeGroupLocal)"
          :columns="{ isDefault: { hidden: menuAttributeGroupLocal.maxSelections !== 1, class: 'w-10' }, name: { name: '@' }, isVisible: { name: '@' }, price: { name: '@' }, edit: { class: 'w-10' }, delete: { class: 'w-10' } }">
          <template v-slot:action-buttons>
            <div class="flex justify-between items-center">
              <button class="btn-action primary-fill" @click="showNewItems = true">
                <span class="mdi mdi-plus"></span>
                <span>{{ $tc('add') }}</span>
              </button>
              <button class="btn-action light-teal" @click="$emit('change:variant')" v-if="isVariantMode">
                <span class="mdi mdi-file-replace"></span>
                <span>{{ $tc('changeVariantGroup') }}</span>
              </button>
            </div>
          </template>
          <template v-slot:isDefault="{ item: itemId }">
            <label class="form-label row">
              <input type="radio" :name="menuAttributeGroupLocal.id" :value="itemId"
                v-model="menuAttributeGroupLocal.defaultVariantAttributeItemId" />
            </label>
          </template>
          <template v-slot:name="{ item: itemId }">
            {{ menuAttributeItemsMap[itemId].languageInfo[props.defaultLanguage].name }}
          </template>
          <template v-slot:price="{ item: itemId }">
            <label class="form-label -my-2 w-32" v-if="isVariantMode">
              <input class="cell" :value="menuAttributeItemsMap[itemId].price" type="number"
                @input="updateAttributeItemProp(menuAttributeItemsMap[itemId], 'price', parseFloat(($event.target as any).value))" />
            </label>
            <span v-else>{{ numberFormatter.currency(menuAttributeItemsMap[itemId].price) }}</span>
          </template>
          <template v-slot:isVisible="{ item: itemId }">
            <div class="flex items-center">
              <label class="form-label -mt-1">
                <Toggle :model-value="menuAttributeItemsMap[itemId].isVisible"
                  @update:model-value="updateAttributeItemProp(menuAttributeItemsMap[itemId], 'isVisible', $event)">
                </Toggle>
              </label>
            </div>
          </template>
          <template v-slot:edit="{ item: itemId }">
            <span class="mdi mdi-pencil" @click="$emit('edit:attributeItem', menuAttributeItemsMap[itemId])"></span>
          </template>
          <template v-slot:delete="{ item: itemId }">
            <span class="mdi mdi-delete" @click="onRemoveAttributeItem(itemId)"></span>
          </template>
        </DraggableTable>
      </Collapse>
    </div>
  </div>
</template>
