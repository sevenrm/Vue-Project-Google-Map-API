<script lang="ts" setup>
import { computed, onMounted, PropType, reactive, ref, watch } from 'vue'
import { LanguageInfoViewModel, MenuBundleCategoryViewModel, MenuBundleViewModel, MenuItemViewModel } from '../../services/api.client'
import Collapse from '../ui/Collapse.vue'
import FormBuilder from '../ui/FormBuilder.vue'
import TableBuilder from '../ui/TableBuilder.vue'
import { string, object, number } from 'yup'
import { useForm } from 'vee-validate'
import { nameof } from 'ts-simple-nameof'
import MenuBundleCategory from './MenuBundleCategory.vue'
import { FormBuilderFieldGroupDefinition } from '../../components/ui/types'
import { FeMenuBundleCategoryViewModel } from '../../types'

const emits = defineEmits([
  'update:bundle:validity',
  'update:bundle',
  'remove:bundle',
  'edit:menuItem'
])
const props = defineProps({
  isLoading: {
    type: Boolean,
    required: true
  },
  bundle: {
    type: Object as PropType<MenuBundleViewModel>,
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

const form = useForm()
const bundleLocal = ref(props.bundle)
watch(() => props.bundle, () => bundleLocal.value = props.bundle)
const categoriesValidityMap: Record<string, boolean> = reactive({})

const updateMenuBundleCategoryValidity = (menuBundleCategory: MenuBundleCategoryViewModel, isValid: boolean) => {
  categoriesValidityMap[menuBundleCategory.id!] = isValid
  updateMenuBundleDetailValidity()
}

const updateMenuBundleDetailValidity = async () => {
  const areCategoriesValid = Object.values(categoriesValidityMap).every(x => !!x)
  const { valid } = await form.validate()
  emits('update:bundle:validity', { bundle: bundleLocal.value, valid: areCategoriesValid && valid })
}

const menuBundleFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    '[class]': 'flex flex-col gap-1 flex-1',
    'languageInfo[currentLanguage].name': {
      type: 'text',
      rules: string().required().min(3),
      name: '@',
      inputEvt: () => updateMenuBundleDetailValidity(),
      placeholder: (model: MenuBundleViewModel) => model.languageInfo![props.defaultLanguage].name,
      propsObject: () => ({ currentLanguage: props.currentLanguage })
    },
    'languageInfo[currentLanguage].description': {
      type: 'textarea',
      class: 'resize-none',
      name: '@',
      placeholder: (model: MenuBundleViewModel) => model.languageInfo![props.defaultLanguage].description,
      propsObject: () => ({ currentLanguage: props.currentLanguage })
    }
  } as FormBuilderFieldGroupDefinition, {
    '[class]': 'flex flex-col gap-1 w-32 items-center',
    [nameof<MenuBundleViewModel>(m => m.price)]: {
      type: 'currency',
      class: 'w-32',
      rules: number().required().min(1),
      name: '@',
      inputEvt: () => updateMenuBundleDetailValidity()
    },
    [nameof<MenuBundleViewModel>(m => m.isVisible)]: {
      type: 'toggle',
      name: '@'
    }
  } as FormBuilderFieldGroupDefinition
])

const addBundleCategory = () => {
  const bundleCategory = new FeMenuBundleCategoryViewModel({
    languageInfo: props.languages.reduce((map, lang) => ({ ...map, [lang]: new LanguageInfoViewModel() }), {}),
    maxItems: 1
  })
  bundleLocal.value.bundleCategories!.unshift(bundleCategory)
  emits('update:bundle', bundleLocal.value)
}

const bundleCategoriesMap = computed(() => bundleLocal.value.bundleCategories?.reduce((map, c) => ({ ...map, [c.id!]: c }), {}) ?? {} as any)

onMounted(() => {
  updateMenuBundleDetailValidity()
})
</script>
<template>
  <div class="w-full cursor-pointer flex flex-col relative">
    <div class="card flex flex-col items-stretch mb-4">
      <div class="flex justify-between gap-2 w-full">
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
                    <button class="py-1 px-3" @click="$emit('clone:bundle', bundleLocal)">
                      <span class="mdi mdi-content-copy pr-1"></span>
                      <span>{{ $tc('clone') }}</span>
                    </button>
                  </li>
                  <li
                    class="cursor-pointer px-3 py-2 text-base hover:text-red-pnp font-semibold text-gray-500 hover:bg-gray-100 transition-colors duration-150">
                    <button class="py-1 px-3" @click="$emit('remove:bundle', bundleLocal)">
                      <span class="mdi mdi-delete pr-1"></span>
                      <span>{{ $tc('delete') }}</span>
                    </button>
                  </li>
                </ul>
              </div>
            </template>
          </Popper>
        </div>
        <FormBuilder :is-loading="isLoading" v-model="bundleLocal"
          @update:model-value="$emit('update:bundle', bundleLocal)" :fields-groups="menuBundleFieldsGroups"
          :display-as-column="true">
        </FormBuilder>
      </div>
    </div>
    <div class="flex flex-col gap-2">
      <div class="flex justify-between items-center">
        <h1 class="page-subtitle">{{ $tc('categories') }}</h1>
        <button class="btn-action primary-fill" @click="addBundleCategory()">
          <span class="mdi mdi-plus"></span>
          <span>{{ $tc('add') }}</span>
        </button>
      </div>
      <MenuBundleCategory @edit:menu-item="$emit('edit:menuItem', $event)" :languages="languages"
        :current-language="currentLanguage" :default-language="defaultLanguage"
        @update:bundle-category:validity="updateMenuBundleCategoryValidity" :key="category.id"
        v-for="category of bundleLocal.bundleCategories" :is-loading="isLoading"
        @update:bundle-category="$emit('update:bundle', bundleLocal)"
        v-model:category="bundleCategoriesMap[bundleLocal.id!]" :menu-items-map="menuItemsMap">
      </MenuBundleCategory>
    </div>
  </div>
</template>
