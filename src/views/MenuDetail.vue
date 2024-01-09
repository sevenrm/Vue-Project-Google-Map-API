<script lang="ts" setup>
import DropdownButton from '../components/ui/DropdownButton.vue'
import LoadingButton from '../components/ui/LoadingButton.vue'
import MenuAttributeGroupDetail from '../components/menu-detail/MenuAttributeGroupDetail.vue'
import Toggle from '../components/ui/Toggle.vue'
import CategoryItemDetail from '../components/menu-detail/CategoryItemDetail.vue'
import draggable from 'vuedraggable'
import { useToast } from 'vue-toastification'
import { computed, ComputedRef, onMounted, reactive, ref, Ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiClient } from '../services/api'
import { router } from '../routes'
import { useShowConfirm } from '../services/injections'
import { InventoryProductCategoryViewModel, InventoryProductListItemViewModel, InventoryProductViewModel, LanguageInfoViewModel, MenuAttributeGroupViewModel, MenuAttributeItemViewModel, MenuBundleViewModel, MenuCategoryViewModel, MenuItemViewModel, MenuViewModel, SupplierProductViewModel, VisibilityScheduleViewModel } from '../services/api.client'
import { FeCategoryViewModel, FeMenuAttributeGroup, FeMenuAttributeItem, FeMenuBundleViewModel, FeMenuItemViewModel, FeMenuViewModel } from '../types'
import { FormBuilderFieldGroupDefinition, TableBuilderFieldDefinition } from '../components/ui/types'
import { store } from '../services/store'
import { clone, download, enumToArray, pageContentHeight, pageContentHeightPx, windowHeight } from '../services/utils'
import { useForm } from 'vee-validate'
import { string } from 'yup'
import { notifier } from '../services/notification'
import SimpleSpinner from '../components/ui/SimpleSpinner.vue'
import InputModal from '../components/ui/InputModal.vue'
import FormBuilder from '../components/ui/FormBuilder.vue'
import Collapse from '../components/ui/Collapse.vue'
import TableBuilder from '../components/ui/TableBuilder.vue'
import DraggableTable from '../components/ui/DraggableTable.vue'
import MenuBundleDetail from '../components/menu-detail/MenuBundleDetail.vue'
import MenuItemDetail from '../components/menu-detail/MenuItemDetail.vue'
import MenuAttributeDetail from '../components/menu-detail/MenuAttributeDetail.vue'
import PaginatedList from '../components/ui/PaginatedList.vue'
import { nameof } from 'ts-simple-nameof'
import Modal from '../components/ui/Modal.vue'
import { numberFormatter } from '../services/number.formatter'
import TranslationTable from '../components/menu-detail/TranslationTable.vue'
import MediaManager from '../components/menu-detail/MediaManager.vue'
import InventoryProductModal from '../components/inventory/InventoryProductModal.vue'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'
import VisibilityScheduleModal from '../components/menu-detail/ScheduleModal.vue'

enum SectionsTab {
  categories = 1,
  menuItems = 2,
  attributeGroups = 3,
  attributeItems = 4,
  bundles = 5
}

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

type ValidationKeys = 'basicInfo' | keyof typeof SectionsTab

const form = useForm()
const route = useRoute()
const toast = useToast()
const showConfirm = useShowConfirm()

const inputModalFn: Ref<((input: string) => void) | null> = ref(null)

const isLoading = ref(false)
const isTableMode = ref(false)
const showPreview = ref(false)
const menu: Ref<FeMenuViewModel | null> = ref(null)
const selectedCategory: Ref<MenuCategoryViewModel | undefined> = ref(undefined)
const selectedBundle: Ref<MenuBundleViewModel | undefined> = ref(undefined)
const menuItemMedia: Ref<MenuItemViewModel | undefined> = ref(undefined)
const menuItemEditValid: Ref<boolean> = ref(false)
const menuItemEdit: Ref<MenuItemViewModel | undefined> = ref(undefined)
const attributeGroupEditValid: Ref<boolean> = ref(false)
const attributeGroupEdit: Ref<MenuAttributeGroupViewModel | undefined> = ref(undefined)
const attributeItemEditValid: Ref<boolean> = ref(false)
const attributeItemEdit: Ref<MenuAttributeItemViewModel | undefined> = ref(undefined)
const currentLanguage = ref(store.selectedRestaurant.value!.defaultLangCode)
const inventoryProductCategoriesMap: Ref<Record<string, InventoryProductCategoryViewModel>> = ref({})
const selectedInventoryProduct: Ref<InventoryProductViewModel | undefined> = ref(undefined)
const loadingState: Ref<'IDLE' | 'SAVING' | 'DELETING'> = ref('IDLE')
const previewUrl = computed(() => 'http://localhost:4200/restaurants/alex-s-bar/table/1/menu')
const sectionsTab = ref(enumToArray<keyof typeof SectionsTab>(SectionsTab))
const selectedTab = ref(SectionsTab.categories)
const inventoryProductsMap: Ref<Record<string, InventoryProductListItemViewModel>> = ref({})
const validationMap: Record<ValidationKeys, Record<string, boolean> | boolean> = reactive({
  basicInfo: false,
  categories: {},
  menuItems: {},
  attributeItems: {},
  attributeGroups: {},
  bundles: {}
})

const isFormValid = computed(() => {
  const areAllCategoriesValid = Object.values(validationMap.categories).every(c => c === true)
  const areAllItemGroupsValid = Object.values(validationMap.attributeGroups).every(c => c === true)
  const areAllAttributeItemsValid = Object.values(validationMap.attributeItems).every(c => c === true)
  const areAllBundlesValid = Object.values(validationMap.bundles).every(c => c === true)
  const areAllMenuItemsValid = Object.values(validationMap.menuItems).every(c => c === true)
  return areAllCategoriesValid &&
    areAllItemGroupsValid &&
    areAllAttributeItemsValid &&
    areAllBundlesValid &&
    areAllMenuItemsValid &&
    validationMap.basicInfo
})

let menuEditConfirmCallback: (() => void) | undefined
let attibuteItemEditConfirmCallback: (() => void) | undefined
let attibuteGroupEditConfirmCallback: (() => void) | undefined

const sortedItems = computed(() => [...(menu.value?.menuItems ?? [])].sort((a, b) => (a.languageInfo[defaultLang.value].name ?? '').localeCompare(b.languageInfo[defaultLang.value].name!)))
const sortedAttributes = computed(() => [...(menu.value?.attributes ?? [])].sort((a, b) => (a.languageInfo[defaultLang.value].name ?? '').localeCompare(b.languageInfo[defaultLang.value].name!)))
const sortedGroups = computed(() => [...(menu.value?.attributeGroups ?? [])].sort((a, b) => (a.languageInfo[defaultLang.value].name ?? '').localeCompare(b.languageInfo[defaultLang.value].name!)))

const attributeGroupsMap: ComputedRef<Record<string, MenuAttributeGroupViewModel>> = computed(() => menu.value?.attributeGroups.reduce((map, i) => ({ ...map, [i.id!]: i }), {}) ?? {})
const menuItemsMap: ComputedRef<Record<string, MenuItemViewModel>> = computed(() => menu.value?.menuItems.reduce((map, i) => ({ ...map, [i.id!]: i }), {}) ?? {})
const attributeItemsMap: ComputedRef<Record<string, MenuAttributeItemViewModel>> = computed(() => menu.value?.attributes.reduce((map, i) => ({ ...map, [i.id!]: i }), {}) ?? {})
const attributeGroupBoundItems: ComputedRef<Record<string, string[]>> = computed(() => menu.value?.menuItems.reduce((map, i) => {
  const ret = i.attributeGroupIds.reduce((subMap, groupId) => ({ ...subMap, [groupId]: [...(subMap[groupId] ?? []), i.id] }), map)
  if (i.variantAttributeGroupId)
    ret[i.variantAttributeGroupId] = [...(ret[i.variantAttributeGroupId] ?? []), i.id]
  return ret
}, {} as any))
const attributeItemBoundGroups: ComputedRef<Record<string, string[]>> = computed(() => menu.value?.attributeGroups.reduce((map, i) => i.attributeItemIds.reduce((subMap, groupId) => ({ ...subMap, [groupId]: subMap[groupId] ?? [i.id] }), map), {} as any))
const selectTab = (tab: keyof typeof SectionsTab) => {
  selectedTab.value = SectionsTab[tab]
  router.push({ hash: `#${selectedTab.value}` })
}

const addLanguage = (langCode: string) => {
  menu.value!.languages[langCode] = true
  initLang(langCode)
  currentLanguage.value = langCode
}

const initLang = (langCode: string) => {
  menu.value!.languageInfo[langCode] = menu.value?.languageInfo[langCode] ?? new LanguageInfoViewModel()
  menu.value!.categories.forEach(c => {
    c.languageInfo[langCode] = c.languageInfo[langCode] ?? new LanguageInfoViewModel()
  })
  menu.value!.menuItems?.forEach(i => i.languageInfo[langCode] = i.languageInfo[langCode] ?? new LanguageInfoViewModel())
  menu.value!.attributeGroups.forEach(g => {
    g.languageInfo[langCode] = g.languageInfo[langCode] ?? new LanguageInfoViewModel()
  })
  menu.value!.attributes.forEach(a => {
    a.languageInfo[langCode] = a.languageInfo[langCode] ?? new LanguageInfoViewModel()
  })
}

const loadInventoryProducts = async () => {
  try {
    const inventoryProducts = await apiClient.inventoryProducts(props.restaurantId)
    inventoryProductsMap.value = inventoryProducts.reduce((map, i) => ({ ...map, [i.id!]: i }), {})
  } catch (error) {
    notifier.notifyError('loading', error, 'inventoryProducts')
  }
}

const loadInventoryProductCategories = async () => {
  try {
    const categories = await apiClient.inventoryCategoriesGet(props.restaurantId)
    inventoryProductCategoriesMap.value = categories.reduce((map, category) => ({ ...map, [category.id!]: category }), {})
  } catch (error) {
    notifier.notifyError('loading', error, 'inventoryCategories')
  }
}

const loadMenu = async (id: string) => {
  isLoading.value = true
  if (id === 'new' || !id) {
    const newMenu = new FeMenuViewModel({ languages: { [defaultLang.value]: true } })
      .initialize(defaultLang.value)
    menu.value = newMenu
    selectedCategory.value = newMenu.categories[0]
  } else
    try {
      const apiMenu = await apiClient.menuGet(props.restaurantId, id)
      menu.value = new FeMenuViewModel(apiMenu)
      Object.keys(menu.value.languages).forEach(langCode => {
        initLang(langCode)
      })
      selectedCategory.value = menu.value.categories[0]
      if (menu.value.bundles.length > 0)
        selectedBundle.value = menu.value.bundles[0]
      setMenuName()
      validateMenuBasics()
    } catch (error) {
      notifier.notifyError('loading', error, 'menu')
    }
  isLoading.value = false
}

const saveMenu = async () => {
  if (!menu.value) return
  try {
    loadingState.value = 'SAVING'
    const menuModel = menu.value as MenuViewModel
    menuModel.restaurantId = props.restaurantId
    const savedMenu = await apiClient.menuPut(props.restaurantId, menuModel)
    Object.keys(menu.value.languages).forEach(langCode => {
      initLang(langCode)
    })
    menu.value = new FeMenuViewModel(savedMenu)
    notifier.notifySuccess('saved', 'menu')
    selectedCategory.value = menu.value.categories.find(c => c.id === selectedCategory?.value?.id) ?? menu.value.categories[0]

    if (route.params.id === 'new')
      router.push({ name: 'menu-details', params: { id: savedMenu.id } })
  } catch (error) {
    notifier.notifyError('saving', error, 'menu')
  }
  loadingState.value = 'IDLE'
}

const deleteMenu = () => {
  showConfirm('proceedQuestion', async () => {
    loadingState.value = 'DELETING'
    try {
      if (route.params.id !== 'new') {
        await apiClient.menuDelete(props.restaurantId, menu.value!.id!)
        notifier.notifySuccess('deleted', 'menu')
      }

      router.push({ name: 'menus' })
    } catch (error) {
      notifier.notifyError('deleting', error, 'menu')
    }
    loadingState.value = 'IDLE'
  })
}

const addCategory = async () => {
  const newMenuCategory = new FeCategoryViewModel({
    languageInfo: Object.keys(menu.value!.languages).reduce((map, lang) => ({ ...map, [lang]: new LanguageInfoViewModel() }), {})
  }).initialize()
  pushNewCategory(newMenuCategory)
  selectedCategory.value = newMenuCategory
}

const addBundle = (newBundle?: FeMenuBundleViewModel) => {
  if (!newBundle) {
    newBundle = new FeMenuBundleViewModel({
      languageInfo: Object.keys(menu.value!.languages).reduce((map, lang) => ({ ...map, [lang]: new LanguageInfoViewModel() }), {})
    })
  }
  menu.value!.bundles.unshift(newBundle)
  selectedBundle.value = newBundle
  onUpdateBundleValidity({ valid: false, bundle: newBundle })
}

const addAttributeItem = (newAttribute?: FeMenuAttributeItem) => {
  if (!newAttribute) {
    newAttribute = new FeMenuAttributeItem({
      languageInfo: Object.keys(menu.value!.languages).reduce((map, lang) => ({ ...map, [lang]: new LanguageInfoViewModel() }), {}),
      inventoryProducts: []
    }).initialize()
  }
  editAttributeItem(newAttribute)
}

const addAttributeGroup = (newAttributeGroup?: FeMenuAttributeGroup) => {
  if (!newAttributeGroup) {
    newAttributeGroup = new FeMenuAttributeGroup({
      languageInfo: Object.keys(menu.value!.languages).reduce((map, lang) => ({ ...map, [lang]: new LanguageInfoViewModel() }), {})
    })
  }
  editAttributeGroup(newAttributeGroup)
}

const addMenuItem = (newMenuItem?: FeMenuItemViewModel) => {
  if (!newMenuItem) {
    newMenuItem = new FeMenuItemViewModel({
      languageInfo: Object.keys(menu.value!.languages).reduce((map, lang) => ({ ...map, [lang]: new LanguageInfoViewModel() }), {}),
      inventoryProducts: []
    }).initialize()
  }
  editMenuItem(newMenuItem)
}

const pushNewCategory = (newMenuCategory: FeCategoryViewModel) => {
  menu.value?.categories.push(newMenuCategory)
  onUpdateCategoryValidity({ valid: false, category: newMenuCategory })
}

const onCategoryClone = (category: MenuCategoryViewModel) => {
  const clonedCategory = new FeCategoryViewModel(category).clone()
  pushNewCategory(clonedCategory)
}

const onRemoveAttributeGroup = (attributeGroupId: string) => {
  showConfirm('proceedQuestion', () => {
    const index = menu.value!.attributeGroups.findIndex(c => c.id === attributeGroupId)
    if (index === -1) return
    const menuItemBoundGroup = menu.value!.menuItems.filter(i => i.attributeGroupIds.indexOf(attributeGroupId) > -1)
    const deleteGroup = () => {
      menuItemBoundGroup.forEach(c => {
        c.attributeGroupIds = c.attributeGroupIds?.filter(i => i !== attributeGroupId)
      })
      delete (validationMap.attributeGroups as Record<string, boolean>)[attributeGroupId]
      menu.value!.attributeGroups.splice(index, 1)
      notifier.notifySuccess('removed', 'attributeGroup')
    }
    if (menuItemBoundGroup.length > 0) {
      showConfirm('itemsConnectedProceedQuestion', () => {
        // notifier.notifyError('removing', undefined, 'attributeGroup')
        // toast.error(`Cannot remove group because is being used by ${menuItemBoundGroup.length} elements\n(${menuItemBoundGroup.map(g => g.languageInfo[defaultLang.value].name).join(', ')})`)
        deleteGroup()
      })
    } else
      deleteGroup()
  })
}

const onRemoveBundle = (bundleId: string) => {
  showConfirm('proceedQuestion', () => {
    const index = menu.value!.bundles.findIndex(c => c.id === bundleId)
    if (index === -1) return
    const menuCategoriesBound = menu.value!.categories.filter(i => i.bundleId === bundleId)
    if (menuCategoriesBound.length > 0) {
      toast.error(`Cannot remove bundle because is being used by ${menuCategoriesBound.length} elements\n(${menuCategoriesBound.map(g => g.languageInfo[defaultLang.value].name).join(', ')})`)
      return
    }
    delete (validationMap.bundles as Record<string, boolean>)[bundleId]
    menu.value!.bundles.splice(index, 1)
    notifier.notifySuccess('removed', 'bundle')
  })
}

const onRemoveAttributeItem = (attributeItemId: string) => {
  showConfirm('proceedQuestion', () => {
    const index = menu.value!.attributes!.findIndex(attribute => attribute.id === attributeItemId)
    if (index === -1) return

    const attributeItemBoundGroup = menu.value!.attributeGroups.filter(i => i.attributeItemIds.indexOf(attributeItemId) > -1)
    const deleteItem = () => {
      attributeItemBoundGroup.forEach(c => {
        c.attributeItemIds = c.attributeItemIds?.filter(i => i !== attributeItemId)
      })
      delete (validationMap.attributeItems as Record<string, boolean>)[attributeItemId]
      menu.value!.attributes.splice(index, 1)
      notifier.notifySuccess('removed', 'recommendedItem')
    }
    if (attributeItemBoundGroup.length > 0) {
      showConfirm('itemsConnectedProceedQuestion', () => {
        // notifier.notifyError('removing', undefined, 'attributeGroup')
        // toast.error(`Cannot remove group because is being used by ${menuItemBoundGroup.length} elements\n(${menuItemBoundGroup.map(g => g.languageInfo[defaultLang.value].name).join(', ')})`)
        deleteItem()
      })
    } else
      deleteItem()
  })
}

const onRemoveRecommendedItem = (menuItemId: string) => {
  showConfirm('proceedQuestion', () => {
    const index = menu.value!.suggestedItems!.findIndex(id => id === menuItemId)
    if (index === -1) return
    menu.value!.suggestedItems!.splice(index, 1)
    notifier.notifySuccess('removed', 'suggestedItem')
  })
}

const onMenuItemRemove = (menuItemId: string) => {
  showConfirm('proceedQuestion', () => {
    const index = menu.value!.menuItems.findIndex(item => item.id === menuItemId) ?? -1
    if (index === -1) return
    const menuSuggested = menu.value!.suggestedItems.filter(s => s === menuItemId)
    const menuItemBoundCategories = menu.value!.categories.filter(i => i.menuItemIds!.indexOf(menuItemId) > -1)
    const menuItemBoundBundleCategories = menu.value!.bundles.flatMap(b => b.bundleCategories).filter(c => c.menuItems.map(i => i.id).indexOf(menuItemId) > -1)
    const deleteItem = () => {
      menu.value!.suggestedItems = menu.value!.suggestedItems.filter(i => i !== menuItemId)
      menuItemBoundCategories.forEach(c => {
        c.menuItemIds = c.menuItemIds?.filter(i => i !== menuItemId)
      })
      menuItemBoundBundleCategories.forEach(c => {
        c.menuItems = c.menuItems?.filter(i => i.id !== menuItemId)
      })
      delete (validationMap.menuItems as Record<string, boolean>)[menuItemId]
      menu.value?.menuItems.splice(index, 1)
      notifier.notifySuccess('removed', 'menuItem')
    }
    if (menuItemBoundCategories.length > 0 || menuItemBoundBundleCategories.length > 0 || menuSuggested.length > 0) {
      showConfirm('itemsConnectedProceedQuestion', () => {
        // notifier.notifyError('removing', undefined, 'attributeGroup')
        // toast.error(`Cannot remove group because is being used by ${menuItemBoundGroup.length} elements\n(${menuItemBoundGroup.map(g => g.languageInfo[defaultLang.value].name).join(', ')})`)
        deleteItem()
      })
    } else
      deleteItem()
  })
}

const onCategoryRemove = (categoryId: string) => {
  showConfirm('proceedQuestion', () => {
    const index = menu.value?.categories.findIndex(c => c.id === categoryId) ?? -1
    if (index === -1) return
    delete (validationMap.categories as Record<string, boolean>)[categoryId]
    menu.value?.categories.splice(index, 1)
    selectedCategory.value = menu.value?.categories[0]
  })
}

const onUpdateCategoryValidity = ({ valid, category }: { valid: boolean, category: MenuCategoryViewModel }) => {
  (validationMap.categories as Record<string, boolean>)[category.id!] = valid
  validateMenuBasics()
}

const onUpdateMenuItemValidity = ({ valid, menuItem }: { valid: boolean, menuItem: MenuItemViewModel }) => {
  (validationMap.menuItems as Record<string, boolean>)[menuItem.id!] = valid
  validateMenuBasics()
}

const onUpdateAttributeGroupValidity = ({ valid, group }: { valid: boolean, group: FeMenuAttributeGroup }) => {
  (validationMap.attributeGroups as Record<string, boolean>)[group.id!] = valid
  validateMenuBasics()
}

const onUpdateAttributeItemValidity = ({ valid, attribute }: { valid: boolean, attribute: MenuAttributeItemViewModel }) => {
  (validationMap.attributeItems as Record<string, boolean>)[attribute.id!] = valid
  validateMenuBasics()
}

const onUpdateBundleValidity = ({ valid, bundle }: { valid: boolean, bundle: MenuBundleViewModel }) => {
  (validationMap.bundles as Record<string, boolean>)[bundle.id!] = valid
  validateMenuBasics()
}

const downloadMenu = () => {
  if (!menu.value) return
  download(JSON.stringify(menu.value!.toJSON()), `menu_${menu.value!.id}.json`, 'json')
}

const importMenu = (json: string) => {
  validationMap.categories = {}
  menu.value = new FeMenuViewModel(JSON.parse(json))
  menu.value.updatedAt = undefined as any
  menu.value.createdAt = undefined as any
  menu.value.id = undefined
  const attributeItemsIdMap: any = {}
  const attributeGroupsIdMap: any = {}
  const bundlesIdMap: any = {}
  menu.value.attributes = menu.value.attributes.map(g => {
    const newId = `#${Math.random().toString().replace('.', '')}`
    attributeItemsIdMap[g.id!] = newId
    g.id = newId
    return g
  })
  menu.value.attributeGroups = menu.value.attributeGroups.map(g => {
    const newId = `#${Math.random().toString().replace('.', '')}`
    attributeGroupsIdMap[g.id!] = newId
    g.id = newId
    g.defaultVariantAttributeItemId = g.defaultVariantAttributeItemId ? attributeItemsIdMap[g.defaultVariantAttributeItemId] : undefined
    g.attributeItemIds = g.attributeItemIds?.map(a => attributeItemsIdMap[a]) ?? []
    return g
  })
  const menuItemsIdMap: any = {}
  menu.value.menuItems = menu.value.menuItems.map(i => {
    const newId = `#${Math.random().toString().replace('.', '')}`
    menuItemsIdMap[i.id!] = newId
    i.id = newId
    i.variantAttributeGroupId = i.variantAttributeGroupId ? attributeGroupsIdMap[i.variantAttributeGroupId] : undefined
    i.attributeGroupIds = i.attributeGroupIds?.map(g => attributeGroupsIdMap[g]) ?? []
    return i
  })
  menu.value.bundles = menu.value.bundles.map(i => {
    const newId = `#${Math.random().toString().replace('.', '')}`
    bundlesIdMap[i.id!] = newId
    i.id = newId
    i.bundleCategories = i.bundleCategories.map(c => {
      c.menuItems = c.menuItems.map(i => menuItemsIdMap[i.id!])
      return c
    })
    return i
  })
  menu.value.categories = menu.value.categories.map(c => {
    c.id = `#${Math.random().toString().replace('.', '')}`
    c.menuItemIds = c.menuItemIds?.map(i => menuItemsIdMap[i]) ?? []
    return c
  })
  menu.value.suggestedItems = menu.value.suggestedItems?.map(i => menuItemsIdMap[i]) ?? []
  menu.value.menuItems = menu.value.menuItems.map(i => {
    i.recommended = i.recommended?.map(r => menuItemsIdMap[r]) ?? []
    return i
  })
  validateMenuBasics()
  setMenuName()
  if (menu.value.categories.length > 0)
    selectedCategory.value = menu.value.categories[0]
}

const validateMenuBasics = async () => {
  const response = await form.validate()
  validationMap.basicInfo = response.valid
}

// This is a caveat cause for some reason name field is not working as expected
const setMenuName = () => {
  if (!menu.value!.languageInfo[currentLanguage.value])
    currentLanguage.value = defaultLang.value = Object.keys(menu.value!.languageInfo)[0]
  form.setFieldValue('name', menu.value!.languageInfo[currentLanguage.value].name)
  validateMenuBasics()
}

const changeCurrentLanguage = (lang: string) => {
  addLanguage(lang)
  menu.value!.menuItems.forEach(i => {
    if (!i.languageInfo[lang])
      i.languageInfo[lang] = new LanguageInfoViewModel()
  })
  menu.value!.categories.forEach(c => {
    if (!c.languageInfo[lang])
      c.languageInfo[lang] = new LanguageInfoViewModel()
  })
  menu.value!.attributeGroups.forEach(g => {
    if (!g.languageInfo[lang])
      g.languageInfo[lang] = new LanguageInfoViewModel()
  })
  menu.value!.attributes.forEach(g => {
    if (!g.languageInfo[lang])
      g.languageInfo[lang] = new LanguageInfoViewModel()
  })
  menu.value!.bundles.forEach(b => {
    if (!b.languageInfo[lang])
      b.languageInfo[lang] = new LanguageInfoViewModel()
    b.bundleCategories.forEach(g => {
      if (!g.languageInfo[lang])
        g.languageInfo[lang] = new LanguageInfoViewModel()
    })
  })
  currentLanguage.value = lang
  setMenuName()
}

const menuFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<MenuViewModel>(m => m.imageUrl)]: {
      type: 'image',
      name: 'image',
      rules: string().required(),
      imageSize: 'big'
    }
  },
  {
    '[class]': 'flex flex-col gap-1 flex-1',
    'languageInfo[currentLanguage].name': {
      type: 'text',
      rules: string().required().min(3),
      name: '@',
      inputEvt: () => setMenuName(),
      placeholder: (model: MenuViewModel) => model.languageInfo[defaultLang.value].name,
      propsObject: () => ({ currentLanguage: currentLanguage.value })
    },
    'languageInfo[currentLanguage].description': {
      type: 'textarea',
      class: 'resize-none',
      name: '@',
      placeholder: (model: MenuViewModel) => model.languageInfo[defaultLang.value].description,
      propsObject: () => ({ currentLanguage: currentLanguage.value })
    }
  } as FormBuilderFieldGroupDefinition
])
const defaultLang = ref(store.selectedRestaurant.value!.defaultLangCode)
const showNewRecommended = ref(false)
const recommendedColumnDefinition = ref<TableBuilderFieldDefinition>({
  selector: {
    type: 'selector',
    isChecked: (item: any) => menu.value!.suggestedItems!.includes(item.id),
    changeEvt: (item: any, val: boolean) => {
      const idx = menu.value!.suggestedItems!.indexOf(item.id)
      if (idx > -1)
        menu.value!.suggestedItems!.splice(idx, 1)
      else
        menu.value!.suggestedItems!.push(item.id)
    }
  },
  name: {
    type: 'slot',
    name: '@'
  }
})

const saveMenuItemModal = () => {
  const idx = menu.value!.menuItems.findIndex(x => x.id === menuItemEdit.value!.id!)
  if (idx > -1)
    menu.value!.menuItems[idx] = menuItemEdit.value!
  else
    menu.value?.menuItems.unshift(menuItemEdit.value!)
  menuItemEdit.value = undefined
  menuEditConfirmCallback?.()
}

const saveAttributeItemModal = () => {
  const idx = menu.value!.attributes.findIndex(x => x.id === attributeItemEdit.value!.id!)
  if (idx > -1)
    menu.value!.attributes[idx] = attributeItemEdit.value!
  else
    menu.value!.attributes.unshift(attributeItemEdit.value!)
  attributeItemEdit.value = undefined
  attibuteItemEditConfirmCallback?.()
}

const saveAttributeGroupModal = () => {
  const idx = menu.value!.attributeGroups.findIndex(x => x.id === attributeGroupEdit.value!.id!)
  if (idx > -1)
    menu.value!.attributeGroups[idx] = attributeGroupEdit.value!
  else
    menu.value!.attributeGroups.unshift(attributeGroupEdit.value!)
  attributeGroupEdit.value = undefined
  attibuteGroupEditConfirmCallback?.()
}

const editMenuItem = (item: MenuItemViewModel, confirmCallback?: () => void) => {
  menuEditConfirmCallback = confirmCallback
  menuItemEdit.value = new FeMenuItemViewModel(clone(item))
}
const editAttributeItem = (item: MenuAttributeItemViewModel, confirmCallback?: () => void) => {
  attibuteItemEditConfirmCallback = confirmCallback
  attributeItemEdit.value = new FeMenuAttributeItem(clone(item))
}
const editAttributeGroup = (item: MenuAttributeGroupViewModel, confirmCallback?: () => void) => {
  attibuteGroupEditConfirmCallback = confirmCallback
  attributeGroupEdit.value = new FeMenuAttributeGroup(clone(item))
}

const addNewInventoryProduct = () => {
  selectedInventoryProduct.value = InventoryProductViewModel.fromJS({ product: new SupplierProductViewModel() })!
}

watch(store.selectedRestaurant, () => router.push({ name: 'menus' }))
const currentSchedules = ref<VisibilityScheduleViewModel[]>([])
const editVisibilityScheduleFn = ref<((schedules: VisibilityScheduleViewModel[]) => void) | undefined>()
const setSchedules = (fn: ((schedules: VisibilityScheduleViewModel[]) => void), schedules: VisibilityScheduleViewModel[]) => {
  editVisibilityScheduleFn.value = fn
  currentSchedules.value = schedules
}
const clearCurrentSchedule = () => {
  editVisibilityScheduleFn.value = undefined
  currentSchedules.value = []
}
onMounted(async () => {
  loadMenu(route.params.id as string)
  loadInventoryProducts()
  loadInventoryProductCategories()
})
</script>

<template>
  <div class="w-full">
    <template v-if="menu && store.selectedRestaurant && !isLoading">
      <VisibilityScheduleModal :schedules="currentSchedules" @close="clearCurrentSchedule"
        @confirm="($event) => { editVisibilityScheduleFn!($event); clearCurrentSchedule() }"
        v-if="editVisibilityScheduleFn">
      </VisibilityScheduleModal>
      <InventoryProductModal :restaurant-id="restaurantId" :categories-map="inventoryProductCategoriesMap"
        :product="selectedInventoryProduct" v-if="selectedInventoryProduct" @closed="selectedInventoryProduct = undefined"
        @deleted="() => { selectedInventoryProduct = undefined; loadInventoryProducts() }"
        @saved="() => { selectedInventoryProduct = undefined; loadInventoryProducts() }"></InventoryProductModal>
      <MediaManager v-model="menuItemMedia.medias" v-if="menuItemMedia" @close="menuItemMedia = undefined" />
      <Modal
        v-if="menuItemEdit && !menuItemMedia && !attributeGroupEdit && !selectedInventoryProduct && !editVisibilityScheduleFn"
        @close="menuItemEdit = undefined" :content-padding-disabled="true"
        :action-buttons="[{ text: 'confirm', colorClass: 'success-fill', disabled: () => !menuItemEditValid, iconName: 'content-save', action: () => saveMenuItemModal() }, ...(menuItemsMap[menuItemEdit!.id!] ? [{ text: 'delete', iconName: 'delete', colorClass: 'danger', action: () => { onMenuItemRemove(menuItemEdit!.id!); menuItemEdit = undefined } }] : [])]"
        :title="menuItemsMap[menuItemEdit!.id!] ? 'updateItem' : 'createItem'">
        <template v-slot:content>
          <MenuItemDetail :attribute-item-bound-groups="attributeItemBoundGroups"
            :attribute-group-bound-items="attributeGroupBoundItems" @edit:attribute-item="editAttributeItem"
            :menu-attribute-items-map="attributeItemsMap" @edit:visibilitySchedule="setSchedules"
            @update:menu-attribute-group:validity="onUpdateAttributeGroupValidity"
            @created:attribute-group="menu!.attributeGroups.push($event)"
            @update:attribute-group-item="attributeGroupsMap[$event.id] = $event"
            @update:attribute-item="attributeItemsMap[$event.id] = $event" :is-modal="true"
            :inventory-products-map="inventoryProductsMap" :is-loading="isLoading"
            @reload:inventory-products="loadInventoryProducts()" @add:inventory-product="addNewInventoryProduct"
            @show:media-manager="menuItemMedia = $event" @edit:attribute-group="editAttributeGroup" :hide-options="true"
            @update:menu-item:validity="menuItemEditValid = $event.valid" @remove:menu-item="onMenuItemRemove"
            v-model:menu-item="menuItemEdit" :menu-items-map="menuItemsMap" :current-language="currentLanguage"
            :default-language="defaultLang" :languages="Object.keys(menu.languages)"
            :menu-attribute-groups-map="attributeGroupsMap" />
        </template>
      </Modal>
      <Modal v-if="attributeGroupEdit && !attributeItemEdit" @close="attributeGroupEdit = undefined"
        :content-padding-disabled="true"
        :action-buttons="[{ text: 'confirm', colorClass: 'success-fill', disabled: () => !attributeGroupEditValid, iconName: 'content-save', action: () => saveAttributeGroupModal() }, ...(attributeGroupsMap[attributeGroupEdit!.id!] ? [{ text: 'delete', iconName: 'delete', colorClass: 'danger', action: () => { onRemoveAttributeGroup(attributeGroupEdit!.id!); attributeGroupEdit = undefined } }] : [])]"
        :title="attributeGroupsMap[attributeGroupEdit!.id!] ? 'updateItem' : 'createItem'">
        <template v-slot:content>
          <MenuAttributeGroupDetail :attribute-item-bound-groups="attributeItemBoundGroups"
            :menu-attribute-groups-map="attributeGroupsMap" :menu-items-map="menuItemsMap"
            :attribute-group-bound-items="attributeGroupBoundItems"
            @update:attribute-item="attributeItemsMap[$event.id] = $event" :is-from-modal="true" :is-loading="isLoading"
            :menu-attribute-items-map="attributeItemsMap"
            @update:menu-attribute-group:validity="attributeGroupEditValid = $event.valid"
            :languages="Object.keys(menu.languages)" :current-language="currentLanguage" :default-language="defaultLang"
            @edit:attribute-item="editAttributeItem" @remove:menu-attribute-group="onRemoveAttributeGroup($event.id)"
            v-model:menu-attribute-group="attributeGroupEdit" />
        </template>
      </Modal>
      <Modal v-if="attributeItemEdit && !selectedInventoryProduct" @close="attributeItemEdit = undefined"
        :content-padding-disabled="true"
        :action-buttons="[{ text: 'confirm', colorClass: 'success-fill', disabled: () => !attributeItemEditValid, iconName: 'content-save', action: () => saveAttributeItemModal() }, ...(attributeItemsMap[attributeItemEdit!.id!] ? [{ text: 'delete', iconName: 'delete', colorClass: 'danger', action: () => { onRemoveAttributeItem(attributeItemEdit!.id!); attributeItemEdit = undefined } }] : [])]"
        :title="attributeItemsMap[attributeItemEdit!.id!] ? 'updateItem' : 'createItem'">
        <template v-slot:content>
          <MenuAttributeDetail :menu-attribute-groups-map="attributeGroupsMap"
            :attribute-item-bound-groups="attributeItemBoundGroups" :inventory-products-map="inventoryProductsMap"
            :is-loading="isLoading" @reload:inventory-products="loadInventoryProducts()"
            @add:inventory-product="addNewInventoryProduct"
            @update:menu-attribute-item:validity="attributeItemEditValid = $event.valid"
            :languages="Object.keys(menu.languages)" :current-language="currentLanguage" :default-language="defaultLang"
            @remove:menu-attribute-item="onRemoveAttributeItem($event.id)"
            v-model:menu-attribute-item="attributeItemEdit" />
        </template>
      </Modal>
      <InputModal :is-textarea="true" v-if="inputModalFn"
        @confirm="($event) => { inputModalFn!($event); inputModalFn = null }" @cancel="inputModalFn = null" />
      <ScrollableDiv class="page-content flex flex-col relative" :height="pageContentHeight">
        <div class="card flex justify-between mb-4 overflow-x-auto overflow-y-hidden min-h-[50px] gap-1">
          <div class="flex gap-1">
            <LoadingButton v-if="menu?.id" @click="deleteMenu" class="btn-action danger"
              :is-loading="loadingState == 'DELETING'" :is-disabled="loadingState != 'IDLE'">
              <span class="mdi mdi-delete"></span>
              <span>{{ $tc('delete') }}</span>
            </LoadingButton>
            <LoadingButton class="btn-action success-fill" :is-loading="loadingState == 'SAVING'"
              :is-disabled="!isFormValid || loadingState != 'IDLE'" @click="saveMenu">
              <span class="mdi mdi-content-save"></span>
              <span>{{ $tc('save') }}</span>
            </LoadingButton>
            <button v-if="menu?.id" @click="downloadMenu" class="btn-action primary-fill">
              <span class="mdi mdi-download"></span>
              <span>{{ $tc('download') }}</span>
            </button>
            <button @click="inputModalFn = importMenu" class="btn-action primary-fill">
              <span class="mdi mdi-upload"></span>
              <span>{{ $tc('import') }}</span>
            </button>
          </div>
          <div class="flex gap-1">
            <div class="flex items-center juistify-end gap-2">
              <label class="form-label row">
                <span>{{ $tc('tableMode') }}</span>
                <Toggle v-model="isTableMode"></Toggle>
              </label>
              <DropdownButton placement="bottom" :items="store.languages.value" btn-class="w-full btn-action">
                <template v-slot:btn>
                  <div class="flex flex-nowrap">
                    <span class="fi mr-2" :class="['fi-' + currentLanguage]"></span>
                    <span>{{ currentLanguage }}</span>
                  </div>
                </template>
                <template v-slot:item="{ item }">
                  <div class="flex justify-between">
                    <a class="text-base w-full block" @click="changeCurrentLanguage(item.code)">
                      <span class="fi mr-2" :class="['fi-' + item.code]"></span>
                      <span>{{ item.code }}</span>
                    </a>
                    <div class="w-24 flex justify-end">
                      <Toggle :model-value="menu.languages[item.code]" @update:model-value="addLanguage(item.code)">
                      </Toggle>
                    </div>
                  </div>
                </template>
              </DropdownButton>
            </div>
            <button v-if="false" @click="showPreview = !showPreview" class="btn-action primary-fill">
              <span class="mdi mdi-magnify-scan"></span>
              <span v-if="!showPreview">{{ $tc('preview') }}</span>
              <span v-else>{{ $tc('closePreview') }}</span>
            </button>
          </div>
        </div>
        <div class="w-full">
          <div class="card flex flex-col gap-2">
            <div class="flex gap-2">
              <FormBuilder :is-loading="isLoading" v-model="menu" :fields-groups="menuFieldsGroups"
                :display-as-column="true">
              </FormBuilder>
            </div>
            <div class="-mx-2 -mb-2">
              <Collapse title="suggestedItems" :is-last="true">
                <TableBuilder v-if="showNewRecommended" :carded="false" :fixed-page-size="5" :show-search-input="true"
                  :is-loading="isLoading" :show-search-button="false" :items="menu.menuItems"
                  :columns="recommendedColumnDefinition"
                  :filter-fn="(item, query) => (item.languageInfo[defaultLang].name ?? '').toLowerCase().indexOf(query.toLowerCase()) > -1">
                  <template v-slot:action-buttons-right>
                    <button class="btn-action gray" @click="showNewRecommended = false">
                      <span class="mdi mdi-close"></span>
                      <span>{{ $tc('close') }}</span>
                    </button>
                  </template>
                  <template v-slot:name="{ item }">
                    {{ item.languageInfo[defaultLang].name }}
                  </template>
                  <template v-slot:delete="{ item }">
                    <span class="mdi mdi-delete" @click="onRemoveRecommendedItem(item)"></span>
                  </template>
                </TableBuilder>
                <DraggableTable v-else v-model="menu.suggestedItems"
                  :columns="{ img: { class: 'w-10' }, name: { name: '@' }, price: { name: '@' }, edit: { class: 'w-10' }, delete: { class: 'w-10' } }">
                  <template v-slot:action-buttons>
                    <button class="btn-action primary-fill" @click="showNewRecommended = true">
                      <span class="mdi mdi-plus"></span>
                      <span>{{ $tc('add') }}</span>
                    </button>
                  </template>
                  <template v-slot:name="{ item: itemId }">
                    {{
                      menuItemsMap[itemId].languageInfo[defaultLang].name
                    }}
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
                  <template v-slot:delete="{ item: itemId }">
                    <span class="mdi mdi-delete" @click="onRemoveRecommendedItem(itemId)"></span>
                  </template>
                  <template v-slot:edit="{ item: itemId }">
                    <span class="mdi mdi-pencil" @click="editMenuItem(menuItemsMap[itemId])"></span>
                  </template>
                </DraggableTable>
              </Collapse>
            </div>
          </div>

          <div class="flex flex-1 my-2">
            <ul>
              <li @click="selectTab(tab)" v-for="tab of sectionsTab" :key="tab"
                :class="{ 'text-primary': SectionsTab[tab] == selectedTab, 'text-gray-body': SectionsTab[tab] != selectedTab }"
                class="inline-block relative cursor-pointer rounded px-3 pb-3 p-2 mx-2 items-center uppercase text-sm transition-colors duration-150 font-semibold">
                <div class="flex items-center">
                  <div>
                    <span>
                      {{ $tc(tab) }}
                      <span v-if="!Object.values(validationMap[tab] ?? {}).every(c => c === true)"
                        class="mdi mdi-exclamation-thick text-red-pnp"></span>
                    </span>
                  </div>
                  <span v-if="SectionsTab[tab] == selectedTab"
                    class="absolute left-0 right-0 mx-auto bottom-0 w-10 h-0.5 bg-red-pnp"></span>
                </div>
              </li>
            </ul>
          </div>
          <template v-if="selectedTab === SectionsTab.categories">
            <div class="flex my-2 flex-col md:flex-row">
              <template v-if="!isTableMode">
                <div class="flex relative flex-col w-full md:w-1/5">
                  <button class="btn-action primary-fill w-full" @click="addCategory">
                    <span class="mdi mdi-plus"></span>
                    <span>{{ $tc('add') }}</span>
                  </button>
                  <div class="overflow-y-auto mt-2">
                    <draggable tag="ul" v-model="menu.categories" item-key="id" handle=".handle">
                      <template #item="{ element }">
                        <li @click="selectedCategory = element"
                          :class="{ 'text-red-pnp': element.id === selectedCategory?.id, 'text-gray-body': element.id !== selectedCategory?.id }"
                          class="w-full mt-0.6 hover:bg-gray-200 relative cursor-pointer rounded p-2 items-center uppercase text-sm font-semibold transition-colors duration-150">
                          <div class="flex items-center relative">
                            <span class="mdi mdi-reorder-horizontal cursor-move mr-2 handle"></span>
                            <div class="">
                              <span class="font-semibold" v-if="element.languageInfo[defaultLang]?.name">{{
                                element.languageInfo[defaultLang].name
                              }}</span>
                              <span v-else class="italic">{{ $tc('unnamed') }}</span>
                              <span v-if="element.id === selectedCategory?.id"
                                class="absolute -left-2 top-0 bottom-0 my-auto h-6 w-0.5 rounded-r-lg bg-red-pnp"></span>
                            </div>
                          </div>
                        </li>
                      </template>
                    </draggable>
                  </div>
                </div>
                <div class="w-full pl-2">
                  <CategoryItemDetail v-if="selectedCategory" @edit:visibilitySchedule="setSchedules"
                    :is-loading="isLoading" :key="selectedCategory.id" v-model:category="selectedCategory"
                    :default-language="defaultLang" :menu-attribute-groups="menu.attributeGroups"
                    :languages="Object.keys(menu.languages)"
                    :categories="menu.categories.filter(x => x.id != selectedCategory?.id)"
                    v-model:menu-items-map="menuItemsMap" :current-language="currentLanguage"
                    @edit:menu-item="editMenuItem" @add:menu-item="addMenuItem($event)"
                    @update:category:validity="onUpdateCategoryValidity" @remove:category="onCategoryRemove"
                    @clone:category="onCategoryClone" @add:group="addAttributeGroup($event)" />
                </div>
              </template>
              <TranslationTable v-else :languages="Object.keys(menu.languages)" :show-description="true"
                :items="menu.categories">
              </TranslationTable>
            </div>
          </template>
          <template v-else-if="selectedTab === SectionsTab.menuItems">
            <div class="w-full flex flex-col relative my-2">
              <PaginatedList item-key="id" v-if="!isTableMode" :items="sortedItems" :show-search-input="true"
                :filter-fn="(item, query) => (item.languageInfo[defaultLang].name ?? '').toLowerCase().indexOf(query.toLowerCase()) > -1">
                <template v-slot:head>
                  <div class="flex items-end justify-end">
                    <button class="btn-action primary-fill" @click="addMenuItem()">
                      <span class="mdi mdi-plus"></span>
                      <span>{{ $tc('add') }}</span>
                    </button>
                  </div>
                </template>
                <template v-slot="{ item }">
                  <MenuItemDetail :attribute-item-bound-groups="attributeItemBoundGroups"
                    :attribute-group-bound-items="attributeGroupBoundItems" @edit:attribute-item="editAttributeItem"
                    @edit:visibilitySchedule="setSchedules"
                    @update:menu-attribute-group:validity="onUpdateAttributeGroupValidity"
                    @created:attribute-group="menu!.attributeGroups.push($event)"
                    :menu-attribute-items-map="attributeItemsMap"
                    @update:attribute-group-item="attributeGroupsMap[$event.id] = $event"
                    @update:attribute-item="attributeItemsMap[$event.id] = $event"
                    @show:media-manager="menuItemMedia = $event" :inventory-products-map="inventoryProductsMap"
                    :is-loading="isLoading" @update:menu-item:validity="onUpdateMenuItemValidity"
                    @reload:inventory-products="loadInventoryProducts()" @add:inventory-product="addNewInventoryProduct"
                    @edit:attribute-group="editAttributeGroup" @remove:menu-item="onMenuItemRemove"
                    :menu-item="menuItemsMap[item.id]" :menu-items-map="menuItemsMap" :current-language="currentLanguage"
                    :default-language="defaultLang" :languages="Object.keys(menu.languages)"
                    :menu-attribute-groups-map="attributeGroupsMap" />
                </template>
              </PaginatedList>
              <TranslationTable v-else :languages="Object.keys(menu.languages)" :show-description="true"
                :items="sortedItems">
              </TranslationTable>
            </div>
          </template>
          <template v-else-if="selectedTab === SectionsTab.attributeItems">
            <div class="w-full flex flex-col relative my-2">
              <PaginatedList item-key="id" v-if="!isTableMode" :items="sortedAttributes" :show-search-input="true"
                :filter-fn="(item, query) => (item.languageInfo[defaultLang].name ?? '').toLowerCase().indexOf(query.toLowerCase()) > -1">
                <template v-slot:head>
                  <div class="flex items-end justify-end">
                    <button class="btn-action primary-fill" @click="addAttributeItem()">
                      <span class="mdi mdi-plus"></span>
                      <span>{{ $tc('add') }}</span>
                    </button>
                  </div>
                </template>
                <template v-slot="{ item }">
                  <MenuAttributeDetail :menu-attribute-groups-map="attributeGroupsMap"
                    :attribute-item-bound-groups="attributeItemBoundGroups" :inventory-products-map="inventoryProductsMap"
                    :is-loading="isLoading" @update:menu-attribute-item:validity="onUpdateAttributeItemValidity"
                    @reload:inventory-products="loadInventoryProducts()" @add:inventory-product="addNewInventoryProduct"
                    :languages="Object.keys(menu.languages)" :current-language="currentLanguage"
                    :default-language="defaultLang" @remove:menu-attribute-item="onRemoveAttributeItem($event.id)"
                    v-model:menu-attribute-item="attributeItemsMap[item.id]" />
                </template>
              </PaginatedList>
              <TranslationTable v-else :languages="Object.keys(menu.languages)" :items="sortedAttributes">
              </TranslationTable>
            </div>
          </template>
          <template v-else-if="selectedTab === SectionsTab.attributeGroups">
            <div class="w-full flex flex-col relative my-2 gap-2">
              <PaginatedList item-key="id" v-if="!isTableMode" :items="sortedGroups" :show-search-input="true"
                :filter-fn="(item, query) => (item.languageInfo[defaultLang].name ?? '').toLowerCase().indexOf(query.toLowerCase()) > -1">
                <template v-slot:head>
                  <div class="flex justify-end items-end w-full">
                    <button class="btn-action primary-fill" @click="addAttributeGroup()">
                      <span class="mdi mdi-plus"></span>
                      <span>{{ $tc('add') }}</span>
                    </button>
                  </div>
                </template>
                <template v-slot="{ item }">
                  <MenuAttributeGroupDetail :menu-attribute-groups-map="attributeGroupsMap"
                    :attribute-item-bound-groups="attributeItemBoundGroups" :menu-items-map="menuItemsMap"
                    :attribute-group-bound-items="attributeGroupBoundItems"
                    @update:attribute-item="attributeItemsMap[$event.id] = $event" :is-loading="isLoading"
                    :menu-attribute-items-map="attributeItemsMap"
                    @update:menu-attribute-group:validity="onUpdateAttributeGroupValidity"
                    :languages="Object.keys(menu.languages)" :current-language="currentLanguage"
                    :default-language="defaultLang" @edit:attribute-item="editAttributeItem"
                    @remove:menu-attribute-group="onRemoveAttributeGroup($event.id)"
                    v-model:menu-attribute-group="attributeGroupsMap[item.id]" />
                </template>
              </PaginatedList>
              <TranslationTable v-else :languages="Object.keys(menu.languages)" :items="sortedGroups">
              </TranslationTable>
            </div>
          </template>
          <template v-else-if="selectedTab === SectionsTab.bundles">
            <div class="flex my-2">
              <template v-if="!isTableMode">
                <div class="flex relative flex-col w-1/5">
                  <button class="btn-action primary-fill w-full" @click="addBundle()">
                    <span class="mdi mdi-plus"></span>
                    <span>{{ $tc('add') }}</span>
                  </button>
                  <div class="overflow-y-auto mt-2">
                    <ul>
                      <li v-for="element of menu.bundles" @click="selectedBundle = element" :key="element.id"
                        :class="{ 'text-red-pnp': element.id == selectedBundle?.id, 'text-gray-body': element.id != selectedBundle?.id }"
                        class="w-full mt-0.6 hover:bg-gray-200 relative cursor-pointer rounded p-2 items-center uppercase text-sm font-semibold transition-colors duration-150">
                        <div class="flex items-center relative">
                          <div class="">
                            <span class="font-semibold" v-if="element.languageInfo[defaultLang].name">{{
                              element.languageInfo[defaultLang].name
                            }}</span>
                            <span v-else class="italic">{{ $tc('unnamed') }}</span>
                            <span v-if="element.id == selectedBundle?.id"
                              class="absolute -left-2 top-0 bottom-0 my-auto h-6 w-0.5 rounded-r-lg bg-red-pnp"></span>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
                <div class="w-full pl-2">
                  <MenuBundleDetail v-if="selectedBundle" :is-loading="isLoading" :menu-items-map="menuItemsMap"
                    @update:bundle:validity="onUpdateBundleValidity" :languages="Object.keys(menu.languages)"
                    :current-language="currentLanguage" :default-language="defaultLang"
                    @edit:menu-item="menuItemEdit = menuItemsMap[$event]" @remove:menu-bundle="onRemoveBundle($event.id)"
                    v-model:bundle="selectedBundle" />
                </div>
              </template>
              <TranslationTable v-else :languages="Object.keys(menu.languages)" :show-description="true"
                :items="menu.bundles">
              </TranslationTable>
            </div>
          </template>
        </div>
        <div v-if="showPreview"
          class="w-1/3 top-2 sticky shadow flex my-4 ml-2 p-3 bg-white dark:bg-gray-800 h-full dark:border-gray-700 border rounded-md">
          <iframe :style="{ 'height': (windowHeight - 130) + 'px' }" :src="previewUrl" height="100%" width="100%"
            class="w-screen max-h-full max-w-sm rounded overflow-hidden" frameborder="0" />
        </div>
      </ScrollableDiv>
    </template>
    <div class="flex items-center justify-center w-full" :style="{ height: pageContentHeightPx }" v-else>
      <SimpleSpinner />
    </div>
  </div>
</template>
