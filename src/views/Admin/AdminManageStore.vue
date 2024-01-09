<script lang="ts" setup>
import { computed, onMounted, reactive, Ref, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '../../services/api'
import {
  AddressViewModel,
  CompanyViewModel,
  DocumentViewModel,
  ExternalLinkTypeEnum,
  ExternalLinkViewModel,
  ExternalScriptTypeEnum,
  ExternalScriptViewModel,
  OrderTypeEnum,
  PaginatedResultOfPlatformUserViewModel,
  PaymentProviderEnum,
  PaymentProviderViewModel,
  PersonViewModel,
  PlatformUserSearchRequest,
  PlatformUserViewModel,
  StoreFullViewModel,
  RoleViewModel,
  StorePlatformFeatureViewModel,
  PlatformFeatureTypeEnum,
  OrderChannelViewModel
} from '../../services/api.client'
import { enumToArray, pageContentHeight, pageContentHeightPx, slugify } from '../../services/utils'
import { store } from '../../services/store'
import { FormBuilderFieldDefinition, FormBuilderFieldGroupDefinition, TableBuilderFieldDefinition, ModalSize } from '../../components/ui/types'
import { FeStoreFullViewModel } from '../../types'
import Datepicker from '@vuepic/vue-datepicker'
import { useForm } from 'vee-validate'
import { object, string, number } from 'yup'
import Modal from '../../components/ui/Modal.vue'
import Address from '../../components/shared/Address.vue'
import Person from '../../components/shared/Person.vue'
import BankAccount from '../../components/shared/BankAccount.vue'
import Schedules from '../../components/shared/Schedules.vue'
import SimpleSpinner from '../../components/ui/SimpleSpinner.vue'
import Toggle from '../../components/ui/Toggle.vue'
import LoadingButton from '../../components/ui/LoadingButton.vue'
import { notifier } from '../../services/notification'
import { nameof } from 'ts-simple-nameof'
import TableBuilder from '../../components/ui/TableBuilder.vue'
import FormBuilder from '../../components/ui/FormBuilder.vue'
import Collapse from '../../components/ui/Collapse.vue'
import UserModal from '../../components/user/UserModal.vue'
import ScrollableDiv from '../../components/ui/ScrollableDiv.vue'
import Company from '../../components/shared/Company.vue'
import { environment } from '../../environment'
import GMap from '../../components/shared/GMap.vue'
import TinyMceEditor from '../../components/ui/TinyMceEditor.vue'

enum SettingsTab {
  General = 1,
  Users = 2,
  Profile = 3,
  Company = 4,
  Orders = 5
}

let id = 0
const cost: Ref<number[]> = ref([])
const estimatedTime: Ref<{ hours: number, minutes: number }[]> = ref([])
const paymentProviders = ref(enumToArray<string>(PaymentProviderEnum))
const features = ref(enumToArray<string>(PlatformFeatureTypeEnum))
const route = useRoute()
const router = useRouter()
const isLoading = ref(false)
const restaurant: Ref<FeStoreFullViewModel | undefined> = ref(undefined)
const restaurantId = ref('')
const roles: Ref<RoleViewModel[]> = ref([])
const filter = ref(PlatformUserSearchRequest.fromJS({ pageIdx: 0, pageSize: 20, restaurantId: '', isActive: true })!)
const settingsTabs = ref(enumToArray<keyof typeof SettingsTab>(SettingsTab))
const selectedTab = ref(SettingsTab.General)
const imageUrl = (provider: string) => new URL(`../../assets/images/payment-providers/${provider}.png`, import.meta.url).href
const selectedUser: Ref<PlatformUserViewModel | undefined> = ref(undefined)
const usersResponse: Ref<PaginatedResultOfPlatformUserViewModel | undefined> = ref()
const paymentProviderModalVisible = ref(false)
const featuresModalVisible = ref(false)
const selectedExternalLink: Ref<ExternalLinkViewModel | undefined> = ref(undefined)
const selectedExternalScript: Ref<ExternalScriptViewModel | undefined> = ref(undefined)
const polygonArray: Ref<{ lat: number, lng: number }[]> = ref([])
const polygonCenter: Ref<{ lat: number, lng: number } | undefined> = ref()
const circle: Ref<{ center: { lat: number, lng: number }, radius: number } | undefined> = ref(undefined)
const circles: Ref<{ restaurantId: Ref<string>, circle: { center: { lat: number, lng: number }, radius: number }, id: number, cost: number | undefined, estimatedTime: { hours: number, minutes: number } | undefined }[]> = ref([])
const polygons: Ref<{ restaurantId: Ref<string>, center: { lat: number, lng: number }, polygon: { lat: number, lng: number }[], id: number, cost: number | undefined, estimatedTime: { hours: number, minutes: number } | undefined }[]> = ref([])

watch([filter, polygons, circles], () => {
  localStorage.setItem('polygon', JSON.stringify(polygons.value))
  localStorage.setItem('circle', JSON.stringify(circles.value))
  console.log('~~~~~~~ParentPolygon~~~~~~', polygons.value)
  console.log('~~~~~~~ParentCircle~~~~~~', circles.value)
  return loadUsers()
})

watch([polygonArray], () => {
  polygons.value.push({ restaurantId, polygon: polygonArray.value, id: (id++), cost: undefined, estimatedTime: undefined, center: polygonCenter })
  cost.value.push(0)
  estimatedTime.value.push()
})

watch([circle], () => {
  circles.value.push({ restaurantId, circle: circle.value!, id: (id++), cost: undefined, estimatedTime: undefined })
  cost.value.push(0)
  estimatedTime.value.push()
})

const updateEstimate = (id: number) => {
  console.log('asdfasdfasdf ', estimatedTime.value[id])
  const updatedPolygon = polygons.value.map((value) => {
    if (id === value.id) {
      return { ...value, ...{ estimatedTime: estimatedTime.value[id] } }
    }
    return value
  })
  const updatedCircle = circles.value.map((value) => {
    if (id === value.id) {
      return { ...value, ...{ estimatedTime: estimatedTime.value[id] } }
    }
    return value
  })
  polygons.value = updatedPolygon
  circles.value = updatedCircle
  console.log('~~~~~~~esti~~~~~~', polygons.value)
  return 0
}

const updateCost = (id: number) => {
  const updatedPolygon = polygons.value.map((value) => {
    if (id === value.id) {
      return { ...value, ...{ cost: cost.value[id] } }
    }
    return value
  })
  const updatedCircle = circles.value.map((value) => {
    if (id === value.id) {
      return { ...value, ...{ cost: cost.value[id] } }
    }
    return value
  })
  polygons.value = updatedPolygon
  circles.value = updatedCircle
  console.log('~~~~~~~cost~~~~~~', polygons.value)
  return 0
}

const handleDelete = (id: number) => {
  // eslint-disable-next-line array-callback-return
  const updatedPolygon = polygons.value.filter((value) => {
    if (id !== value.id) {
      return value
    }
  })
  // eslint-disable-next-line array-callback-return
  const updatedCircle = circles.value.filter((value) => {
    if (id !== value.id) {
      return value
    }
  })
  polygons.value = updatedPolygon
  circles.value = updatedCircle
  return 0
}

const orderChannelsColumnDefinition = ref<TableBuilderFieldDefinition>({
  img: {
    type: 'slot',
    name: ''
  },
  name: {
    type: 'slot',
    name: '@'
  },
  isEnabled: {
    type: 'slot',
    name: '@'
  }
})

const featuresColumnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<StorePlatformFeatureViewModel>((m) => m.platformFeatureTypeId)]: {
    type: 'enum',
    enumValue: PlatformFeatureTypeEnum,
    enumName: 'PlatformFeatureTypeEnum',
    name: '@'
  },
  [nameof<StorePlatformFeatureViewModel>((m) => m.startAt)]: {
    type: 'datetimepicker',
    name: '@'
  },
  [nameof<StorePlatformFeatureViewModel>((m) => m.expireAt)]: {
    type: 'datetimepicker',
    name: '@'
  },
  [nameof<StorePlatformFeatureViewModel>((m) => m.renewAutomatically)]: {
    type: 'checkbox',
    name: '@'
  },
  [nameof<StorePlatformFeatureViewModel>((m) => m.price)]: {
    type: 'number',
    name: '@'
  },
  [nameof<StorePlatformFeatureViewModel>((m) => m.renewalPrice)]: {
    type: 'number',
    name: '@'
  }
})

const paymentProviderColumnDefinition = ref<TableBuilderFieldDefinition>({
  img: {
    type: 'slot',
    name: ''
  },
  [nameof<PaymentProviderViewModel>((m) => m.paymentProviderId)]: {
    type: 'enum',
    name: 'name',
    skipTranslation: true,
    enumValue: PaymentProviderEnum
  },
  [nameof<PaymentProviderViewModel>((m) => m.accountId)]: {
    type: 'text',
    name: '@',
    disabled: (model: PaymentProviderViewModel) => !!model.accountId
  },
  [nameof<PaymentProviderViewModel>((m) => m.percentageFee)]: {
    type: 'number',
    name: '@',
    class: 'w-20'
  },
  [nameof<PaymentProviderViewModel>((m) => m.fixedFee)]: {
    type: 'number',
    name: '@',
    class: 'w-20'
  },
  [nameof<PaymentProviderViewModel>((m) => m.minAmount)]: {
    type: 'number',
    name: '@',
    class: 'w-20'
  },
  [nameof<PaymentProviderViewModel>((m) => m.isActive)]: {
    type: 'toggle',
    name: '@'
  },
  [nameof<PaymentProviderViewModel>((m) => m.isEnabled)]: {
    type: 'toggle',
    name: '@'
  },
  createSubEntity: {
    type: 'icon',
    name: '@',
    iconName: 'account-plus-outline',
    if: (model: PaymentProviderViewModel) => !!restaurant.value?.id && !model.accountId,
    clicked: (model: PaymentProviderViewModel) => createEntity(restaurant.value!.id!, model.paymentProviderId)
  }
})

const createEntity = async (restaurantId: string, paymentProviderId: PaymentProviderEnum) => {
  try {
    await apiClient.restaurantPaymententityCreate(restaurantId, paymentProviderId)
  } catch (error) {
    notifier.notifyError('printing', error, 'receipt')
  }
}

const externalLinksColumnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<ExternalLinkViewModel>((m) => m.externalLinkTypeId)]: {
    type: 'enum',
    name: 'name',
    skipTranslation: true,
    enumValue: ExternalLinkTypeEnum
  },
  [nameof<ExternalLinkViewModel>((m) => m.value)]: {
    type: 'text',
    name: '@'
  },
  [nameof<ExternalLinkViewModel>((m) => m.isVisible)]: {
    type: 'toggle',
    name: '@'
  },
  action: {
    type: 'slot',
    name: ''
  }
})

const externalScriptsColumnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<ExternalScriptViewModel>((m) => m.externalScriptTypeId)]: {
    type: 'enum',
    name: 'name',
    skipTranslation: true,
    enumValue: ExternalScriptTypeEnum
  },
  [nameof<ExternalScriptViewModel>((m) => m.identifier)]: {
    type: 'text',
    name: '@'
  },
  [nameof<ExternalScriptViewModel>((m) => m.isActive)]: {
    type: 'toggle',
    name: '@'
  },
  action: {
    type: 'slot',
    name: ''
  }
})

const usersColumnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<PlatformUserViewModel>((m) => m.id)]: {
    type: 'id',
    name: '@'
  },
  [nameof<PlatformUserViewModel>((m) => m.username)]: {
    type: 'string',
    name: '@'
  },
  [nameof<PlatformUserViewModel>((m) => m.role.name)]: {
    type: 'string',
    name: 'role'
  },
  [nameof<PlatformUserViewModel>((m) => m.parentName)]: {
    type: 'string',
    name: '@'
  },
  isAllowed: {
    type: 'slot',
    name: '@'
  }
})

const form = useForm({})

const isFormValid = computed(() => Object.values(tabsForms).every((tab) => tab.isValid))
const timezones: Ref<{ [timeZoneId: string]: string }[]> = ref([])

const tabsForms: Record<
  SettingsTab,
  {
    isValid: boolean
    componentsForms: any
    forms: { [formName: string]: FormBuilderFieldGroupDefinition[] }
  }
> = reactive({
  [SettingsTab.General]: {
    forms: {
      main: [
        {
          '[class]': 'grid grid-cols-3 gap-2',
          [nameof<StoreFullViewModel>((m) => m.displayName)]: {
            type: 'text',
            inputEvt: () => onUpdateDisplayName(),
            name: '@',
            rules: string().required().min(5)
          },
          [nameof<StoreFullViewModel>((m) => m.slug)]: {
            type: 'text',
            disabled: (model: StoreFullViewModel) => !!model.id,
            name: '@',
            rules: string().required().min(4),
            keydownEvt: (e: KeyboardEvent) => {
              // eslint-disable-next-line prefer-regex-literals
              if (!new RegExp('[a-z0-9-]+', 'g').test(e.key)) e.preventDefault()
            }
          },
          [nameof<StoreFullViewModel>((m) => m.percentageFee)]: {
            type: 'number',
            name: '@',
            rules: number().required().min(0),
            if: () => store.isUserAdmin()
          },
          [nameof<StoreFullViewModel>((m) => m.isActive)]: {
            type: 'toggle',
            name: '@'
          },
          [nameof<StoreFullViewModel>((m) => m.defaultLangCode)]: {
            type: 'language',
            name: '@'
          },
          [nameof<StoreFullViewModel>((m) => m.currencyCode)]: {
            type: 'select',
            options: () => environment.currencies,
            name: 'currency'
          },
          [nameof<StoreFullViewModel>((m) => m.socialShareDiscountPercentage)]: {
            type: 'number',
            name: '@'
          },
          [nameof<StoreFullViewModel>((m) => m.logoUrl)]: {
            type: 'image',
            name: 'logo',
            imageDisplayMode: 'contain',
            rules: string().required()
          },
          [nameof<StoreFullViewModel>((m) => m.receiptMessage)]: {
            type: 'text',
            name: '@'
          },
          [nameof<StoreFullViewModel>((m) => m.timeZoneId)]: {
            type: 'select',
            name: '@',
            options: () => timezones.value,
            optionValue: 'key',
            optionLabel: 'label'
          }
        } as FormBuilderFieldGroupDefinition
      ],
      flags: [
        {
          '[class]': 'grid grid-cols-2 md:grid-cols-3 gap-2',
          [nameof<StoreFullViewModel>((m) => m.hasPaymentBeforeOrder)]: {
            type: 'toggle',
            name: '@'
          },
          [nameof<StoreFullViewModel>((m) => m.hasPaylater)]: {
            type: 'toggle',
            name: '@'
          },
          [nameof<StoreFullViewModel>((m) => m.displayServiceButton)]: {
            type: 'toggle',
            name: '@'
          },
          [nameof<StoreFullViewModel>((m) => m.tipsEnabled)]: {
            type: 'toggle',
            name: '@'
          },
          [nameof<StoreFullViewModel>((m) => m.skipReadyOrderStatus)]: {
            type: 'toggle',
            name: '@'
          }
        } as FormBuilderFieldGroupDefinition
      ]
    },
    componentsForms: {},
    isValid: false
  },
  [SettingsTab.Users]: {
    forms: {},
    componentsForms: {},
    isValid: false
  },
  [SettingsTab.Profile]: {
    forms: {
      main: [
        {
          [nameof<StoreFullViewModel>((m) => m.menuImageUrl)]: {
            type: 'image',
            name: 'menuDefaultImage'
          },
          [nameof<StoreFullViewModel>((m) => m.phoneNumber)]: {
            type: 'text',
            name: '@'
          },
          [nameof<StoreFullViewModel>((m) => m.emailAddress)]: {
            type: 'text',
            name: '@'
          },
          [nameof<StoreFullViewModel>((m) => m.welcomeMessage)]: {
            type: 'text',
            name: '@'
          },
          [nameof<StoreFullViewModel>((m) => m.description)]: {
            type: 'editor',
            name: '@'
          }
        }
      ]
    },
    componentsForms: {},
    isValid: false
  },
  [SettingsTab.Company]: {
    forms: {
      baseInfo: [
        {
          '[class]': 'grid grid-cols-3 gap-2',
          [nameof<CompanyViewModel>((m) => m.registrationNumber)]: {
            type: 'text',
            name: '@'
          },
          [nameof<CompanyViewModel>((m) => m.legalName)]: {
            type: 'text',
            name: '@'
          },
          [nameof<CompanyViewModel>((m) => m.tradingName)]: {
            type: 'text',
            name: '@'
          }
        } as FormBuilderFieldGroupDefinition,
        {
          [nameof<CompanyViewModel>((m) => m.phoneNumber)]: {
            type: 'text',
            name: '@'
          },
          [nameof<CompanyViewModel>((m) => m.emailAddress)]: {
            type: 'text',
            name: '@'
          }
        } as FormBuilderFieldGroupDefinition
      ]
    },
    componentsForms: {
      bankAccount: true,
      company: true
    },
    isValid: false
  },
  [SettingsTab.Orders]: {
    forms: {},
    componentsForms: {},
    isValid: false
  }
})

const validateForm = async () => {
  for (const tab in tabsForms) {
    const tabForm = tabsForms[tab as unknown as SettingsTab]
    let isValid = Object.values(tabForm.componentsForms).every((x) => !!x)
    if (isValid) {
      const formsToValidate = Object.values(tabForm.forms)
      const validationSchema: any = {}
      for (const form of formsToValidate) {
        for (const formGroup of form) {
          for (const key of Object.keys(formGroup).filter((key) => key.indexOf('[') === -1)) {
            if ((formGroup[key] as FormBuilderFieldDefinition).rules) validationSchema[key] = (formGroup[key] as FormBuilderFieldDefinition).rules
          }
        }
      }
      const yupSchema = object(validationSchema)
      try {
        await yupSchema.validate(restaurant.value)
      } catch (error) {
        isValid = false
      }
    }
    tabsForms[tab as unknown as SettingsTab].isValid = isValid
  }
}

const loadTimeZones = async () => {
  isLoading.value = true
  try {
    const timezonesMap = await apiClient.globalTimezones()
    timezones.value = Object.keys(timezonesMap).map((k) => ({ key: k, label: timezonesMap[k] }))
  } catch (error) {
    notifier.notifyError('loading', error, 'timezones')
  }
  isLoading.value = false
}

const onUpdateDisplayName = () => {
  if (!restaurant.value) return
  if (!restaurant.value.id) restaurant.value.slug = slugify(restaurant.value.displayName)
}

const selectTab = (tab: keyof typeof SettingsTab) => {
  selectedTab.value = SettingsTab[tab]
  router.push({ hash: `#${selectedTab.value}` })
}

const loadRestaurant = async () => {
  if (restaurantId.value === 'new') {
    restaurant.value = new FeStoreFullViewModel()
    return
  }
  try {
    isLoading.value = true
    filter.value.restaurantId = restaurantId.value
    loadRoles()
    loadUsers()
    restaurant.value = await apiClient.restaurantFull(restaurantId.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'restaurant')
  }
  isLoading.value = false
}

const save = async () => {
  isLoading.value = true
  try {
    restaurant.value = await apiClient.restaurantPut(restaurant.value!)
    restaurantId.value = restaurant.value.id!
    notifier.notifySuccess('saved', 'restaurant')
  } catch (error) {
    notifier.notifyError('saving', error, 'restaurant')
  }
  isLoading.value = false
}

const createUser = () => (selectedUser.value = new PlatformUserViewModel())

const loadUsers = async (pageNumber = 0, pageSize = 10, query = '') => {
  try {
    isLoading.value = true
    filter.value.username = query
    filter.value.pageIdx = pageNumber
    filter.value.pageSize = pageSize
    usersResponse.value = await apiClient.userAll(filter.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'users')
  }
  isLoading.value = false
}

const saveUser = async () => {
  if (!selectedUser.value) return

  try {
    isLoading.value = true
    selectedUser.value.mappedRestaurants[store.selectedRestaurantId!] = store.selectedRestaurant.value!.displayName
    await apiClient.userPost(selectedUser.value!)
    selectedUser.value = undefined
    notifier.notifySuccess('saved', 'user')
    await loadUsers()
  } catch (error) {
    notifier.notifyError('saving', error, 'user')
  }
  isLoading.value = false
}

const loadRoles = async () => {
  try {
    isLoading.value = true
    roles.value = await apiClient.userRestaurantRoles(restaurantId.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'roles')
  }
  isLoading.value = false
}

const toggleUser = (user: PlatformUserViewModel) => {
  const idx = restaurant.value!.connectedUsers!.indexOf(user.id!)
  if (idx === -1) restaurant.value!.connectedUsers!.push(user.id!)
  else restaurant.value!.connectedUsers!.splice(idx, 1)
}

const addPaymentProvider = (paymentProviderId: PaymentProviderEnum) => {
  restaurant.value?.paymentProviders?.push(PaymentProviderViewModel.fromJS({ paymentProviderId, isLiveMode: restaurant.value.isLiveMode })!)
  paymentProviderModalVisible.value = false
}

const addFeature = (platformFeatureTypeId: PlatformFeatureTypeEnum) => {
  restaurant.value?.activeFeatures?.push(StorePlatformFeatureViewModel.fromJS({ platformFeatureTypeId })!)
  featuresModalVisible.value = false
}

const addExternalLink = () => {
  selectedExternalLink.value = new ExternalLinkViewModel()
}
const addExternalScript = () => {
  selectedExternalScript.value = new ExternalScriptViewModel()
}

const saveExternalScript = () => {
  if (selectedExternalScript.value!.id) {
    const idx = restaurant.value!.externalScripts!.findIndex((l) => l.id === selectedExternalScript.value!.id)
    restaurant.value!.externalScripts![idx] = selectedExternalScript.value!
  } else restaurant.value!.externalScripts!.push(selectedExternalScript.value!)

  selectedExternalScript.value = undefined
}
const saveExternalLink = () => {
  if (selectedExternalLink.value!.id) {
    const idx = restaurant.value!.externalLinks!.findIndex((l) => l.id === selectedExternalLink.value!.id)
    restaurant.value!.externalLinks![idx] = selectedExternalLink.value!
  } else restaurant.value!.externalLinks!.push(selectedExternalLink.value!)

  selectedExternalLink.value = undefined
}

const togglePrincipalAddress = () => {
  restaurant.value!.company!.principalAddress = restaurant.value!.company!.principalAddress == null ? new AddressViewModel() : undefined
}

const toggleOrderChannel = (orderTypeId: OrderTypeEnum) => {
  if (hasOrderChannel(orderTypeId)) {
    const orderChannelIdx = restaurant.value!.orderChannels!.findIndex((x) => x.orderTypeId === orderTypeId)!
    const orderChannel = restaurant.value!.orderChannels![orderChannelIdx]!
    orderChannel.isEnabled = !orderChannel.isEnabled
  } else restaurant.value!.orderChannels!.push(OrderChannelViewModel.fromJS({ orderTypeId, isEnabled: true })!)
}

const hasOrderChannel = (orderTypeId: OrderTypeEnum) => !!restaurant.value?.orderChannels?.find((x) => x.orderTypeId === orderTypeId) ?? false

const addOwner = () =>
  restaurant.value?.company?.owners?.push(
    PersonViewModel.fromJS({
      address: new AddressViewModel(),
      registrationDocument: new DocumentViewModel()
    })!
  )

onMounted(async () => {
  if (route.hash === '') router.push({ hash: `#${selectedTab.value}` })
  else selectedTab.value = Number(route.hash.replace('#', ''))

  restaurantId.value = route.params.id as string
  await loadRestaurant()
  await loadTimeZones()
  await validateForm()
})

const externalLinkFieldGroup = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<ExternalLinkViewModel>((m) => m.externalLinkTypeId)]: {
      type: 'enum',
      enumValue: ExternalLinkTypeEnum,
      skipTranslation: true,
      name: 'externalLinkType'
    },
    [nameof<ExternalLinkViewModel>((m) => m.value)]: {
      type: 'text',
      name: '@'
    },
    [nameof<ExternalLinkViewModel>((m) => m.isVisible)]: {
      type: 'toggle',
      name: '@'
    }
  } as FormBuilderFieldGroupDefinition
])

const externalScriptFieldGroup = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<ExternalScriptViewModel>((m) => m.externalScriptTypeId)]: {
      type: 'enum',
      enumValue: ExternalScriptTypeEnum,
      skipTranslation: true,
      name: 'externalLinkType'
    },
    [nameof<ExternalScriptViewModel>((m) => m.identifier)]: {
      type: 'text',
      name: '@'
    },
    [nameof<ExternalScriptViewModel>((m) => m.isActive)]: {
      type: 'toggle',
      name: '@'
    }
  } as FormBuilderFieldGroupDefinition
])
</script>

<template>
  <div class="w-full">
    <UserModal :timezones="timezones" v-if="selectedUser" :parent-id="store.user.value?.id" v-model="selectedUser"
               @saved="saveUser()" @close="selectedUser = undefined" :roles="roles"></UserModal>
    <Modal v-if="selectedExternalLink" @close="selectedExternalLink = undefined" @confirm="saveExternalLink"
           :show-close-only="!!selectedExternalLink.id">
      <template v-slot:content>
        <FormBuilder :is-loading="isLoading" v-model="selectedExternalLink" :fields-groups="externalLinkFieldGroup"
                     :display-as-column="true"> </FormBuilder>
      </template>
    </Modal>
    <Modal v-if="selectedExternalScript" @close="selectedExternalScript = undefined" @confirm="saveExternalScript"
           :show-close-only="!!selectedExternalScript.id">
      <template v-slot:content>
        <FormBuilder :is-loading="isLoading" v-model="selectedExternalScript" :fields-groups="externalScriptFieldGroup"
                     :display-as-column="true">
        </FormBuilder>
      </template>
    </Modal>
    <Modal @close="paymentProviderModalVisible = false" :size="ModalSize.Adapt" v-if="paymentProviderModalVisible"
           :show-close-only="true" :show-footer="false">
      <template v-slot:content>
        <ul>
          <template v-for="provider of paymentProviders" :key="provider">
            <li v-if="!restaurant?.paymentProviders?.find(p => p.paymentProviderId === (PaymentProviderEnum[(provider as any)] as any) && p.isLiveMode == restaurant?.isLiveMode)"
                @click="addPaymentProvider(PaymentProviderEnum[provider as any] as any)">
              <div class="flex p-2 py-4 cursor-pointer hover:bg-gray-100 transition-colors rounded-default duration-150">
                <div class="w-28 flex items-center justify-center">
                  <img :src="imageUrl(provider.toLowerCase())" style="max-height: 30px; max-width: 200px" />
                </div>
                <div class="text-red-pnp font-bold text-xl w-1/3">{{ provider }}</div>
              </div>
            </li>
          </template>
        </ul>
      </template>
    </Modal>
    <Modal @close="featuresModalVisible = false" :size="ModalSize.Adapt" v-if="featuresModalVisible"
           :show-close-only="true" :show-footer="false">
      <template v-slot:content>
        <ul>
          <template v-for="feature of features" :key="feature">
            <li @click="addFeature(PlatformFeatureTypeEnum[feature as any] as any)">
              <div class="flex p-2 py-4 cursor-pointer hover:bg-gray-100 transition-colors rounded-default duration-150">
                <div class="text-red-pnp font-bold text-xl w-1/3">{{ feature }}</div>
              </div>
            </li>
          </template>
        </ul>
      </template>
    </Modal>
    <ScrollableDiv class="page-content" :height="pageContentHeight">
      <SimpleSpinner v-if="!restaurant" />
      <div class="flex flex-col w-full" v-else>
        <div class="card flex justify-between items-center mb-1 gap-2">
          <div>
            <LoadingButton :is-loading="isLoading" :is-disabled="!isFormValid || isLoading"
                           class="btn-action success-fill" @click="save">
              <span v-if="restaurantId != 'new'">Save</span>
              <span v-else>Create</span>
              <span class="mdi mdi-content-save ml-1"></span>
            </LoadingButton>
          </div>
          <div class="flex items-center text-sm justify-center gap-2">
            <label class="form-label row">
              <span class="font-semibold">{{ $tc('isLiveMode') }}</span>
              <Toggle v-model="restaurant.isLiveMode" :disabled="!store.isUserAdmin()" />
            </label>
            <span class="text-gray-body" v-if="restaurant.id">ID:&nbsp;{{ restaurant.id }}</span>
          </div>
        </div>
        <div class="flex flex-1 my-2">
          <ul>
            <li @click="selectTab(tab)" v-for="tab of settingsTabs" :key="tab" :class="{
              'text-primary': SettingsTab[tab] == selectedTab,
              'text-gray-body': SettingsTab[tab] != selectedTab
            }"
                class="inline-block relative cursor-pointer rounded px-3 pb-3 p-2 mx-2 items-center uppercase text-sm transition-colors duration-150 font-semibold">
              <div class="flex items-center">
                <div>
                  <span>
                    {{ tab }}
                    <span v-if="!tabsForms[SettingsTab[tab]].isValid"
                          class="mdi mdi-exclamation-thick text-red-pnp"></span>
                  </span>
                </div>
                <span v-if="SettingsTab[tab] == selectedTab"
                      class="absolute left-0 right-0 mx-auto bottom-0 w-10 h-0.5 bg-red-pnp"></span>
              </div>
            </li>
          </ul>
        </div>
        <div class="flex flex-col gap-2">
          <template v-if="selectedTab === SettingsTab.General">
            <div class="card">
              <FormBuilder :is-loading="isLoading" v-model="restaurant" @changed="validateForm"
                           :fields-groups="tabsForms[SettingsTab.General].forms.main">
              </FormBuilder>
              <Collapse title="flags" class="-mx-2">
                <div class="p-3">
                  <FormBuilder :is-loading="isLoading" v-model="restaurant" @changed="validateForm"
                               :fields-groups="tabsForms[SettingsTab.General].forms.flags">
                  </FormBuilder>
                </div>
              </Collapse>
              <Collapse title="channels" class="-mx-2">
                <div>
                  <TableBuilder :is-loading="isLoading" :show-search-button="false" :carded="false"
                                :items="enumToArray(OrderTypeEnum).filter(i => (OrderTypeEnum[(i as any)] as any) > -1)"
                                :columns="orderChannelsColumnDefinition">
                    <template v-slot:img="{ item }">
                      <div class="w-10 h-10 flex items-center justify-center">
                        <img :src="imageUrl(item.toLowerCase())" class="object-contain" />
                      </div>
                    </template>
                    <template v-slot:name="{ item }">
                      <div class="w-10 h-10 flex items-center justify-center">
                        {{ $tc(item) }}
                      </div>
                    </template>
                    <template v-slot:isEnabled="{ item }">
                      <div class="w-10 h-10 flex items-center justify-center">
                        <Toggle :model-value="hasOrderChannel(OrderTypeEnum[item] as any)"
                                @update:model-value="toggleOrderChannel(OrderTypeEnum[item] as any)">
                        </Toggle>
                      </div>
                    </template>
                  </TableBuilder>
                </div>
              </Collapse>
              <Collapse title="payments" v-if="store.isUserAdmin()" class="-mx-2">
                <div class="">
                  <TableBuilder :is-loading="isLoading" :show-search-button="false"
                                :items="(restaurant.paymentProviders ?? []).filter(x => x.isLiveMode === restaurant!.isLiveMode)"
                                :columns="paymentProviderColumnDefinition">
                    <template v-slot:action-buttons-right>
                      <button class="btn-action primary-fill" @click="paymentProviderModalVisible = true">
                        <span class="mdi mdi-plus"></span>
                        <span>{{ $tc('add') }}</span>
                      </button>
                    </template>
                    <template v-slot:img="{ item }">
                      <div class="w-10 h-10 flex items-center justify-center">
                        <img :src="imageUrl(PaymentProviderEnum[item.paymentProviderId!].toLowerCase())"
                             class="object-contain" />
                      </div>
                    </template>
                  </TableBuilder>
                </div>
              </Collapse>
              <Collapse title="features" v-if="store.isUserAdmin()" class="-mx-2 -mb-2" :is-last="true">
                <div class="">
                  <TableBuilder :is-loading="isLoading" :show-search-button="false"
                                :items="restaurant.activeFeatures ?? []" :columns="featuresColumnDefinition">
                    <template v-slot:action-buttons-right>
                      <button class="btn-action primary-fill" @click="featuresModalVisible = true">
                        <span class="mdi mdi-plus"></span>
                        <span>{{ $tc('add') }}</span>
                      </button>
                    </template>
                  </TableBuilder>
                </div>
              </Collapse>
            </div>
          </template>
          <template v-else-if="selectedTab === SettingsTab.Users">
            <TableBuilder :items="usersResponse?.items ?? []" :total-pages="usersResponse?.totalPages"
                          :total-records="usersResponse?.totalRecords" :is-loading="isLoading"
                          :change-page-callback="loadUsers" @clicked="selectedUser = $event" :show-pages="true"
                          :columns="usersColumnDefinition" :show-search-input="true" :show-search-button="true">
              <template v-slot:action-buttons-left>
                <button class="btn-action primary-fill" @click="createUser()">
                  <span class="mdi mdi-plus ml-1"></span>
                  <span>{{ $tc('add') }}</span>
                </button>
              </template>
              <template v-slot:isAllowed="{ item }">
                <Toggle @update:model-value="toggleUser(item)" @click="$event.stopPropagation()"
                        :model-value="restaurant.connectedUsers!.indexOf(item.id!) > -1" />
              </template>
            </TableBuilder>
          </template>
          <template v-else-if="selectedTab === SettingsTab.Profile">
            <div class="flex flex-col w-full card px-0 pb-0">
              <div class="px-2">
                <FormBuilder :is-loading="isLoading" v-model="restaurant" @changed="validateForm"
                             :fields-groups="tabsForms[SettingsTab.Profile].forms.main"></FormBuilder>
              </div>
              <Collapse title="openingHours">
                <div class="p-3">
                  <Schedules v-model="restaurant.openingSchedules" />
                </div>
              </Collapse>
              <Collapse title="externalLinks">
                <TableBuilder :items="restaurant.externalLinks!" :fixed-page-size="10" :show-search-button="false"
                              :is-loading="isLoading" :columns="externalLinksColumnDefinition">
                  <template v-slot:action-buttons-right>
                    <button class="btn-action primary-fill" @click="addExternalLink">
                      <span class="mdi mdi-plus"></span>
                      <span>{{ $tc('add') }}</span>
                    </button>
                  </template>
                  <template v-slot:action="{ idx }">
                    <button class="btn-action-icon"
                            @click="() => { $event.stopPropagation(); restaurant!.externalLinks!.splice(idx, 1) }">
                      <span class="mdi mdi-delete"></span>
                    </button>
                  </template>
                </TableBuilder>
              </Collapse>
              <Collapse title="externalScripts">
                <TableBuilder :items="restaurant.externalScripts!" :fixed-page-size="10" :show-search-button="false"
                              :is-loading="isLoading" :columns="externalScriptsColumnDefinition">
                  <template v-slot:action-buttons-right>
                    <button class="btn-action primary-fill" @click="addExternalScript">
                      <span class="mdi mdi-plus"></span>
                      <span>{{ $tc('add') }}</span>
                    </button>
                  </template>
                  <template v-slot:action="{ idx }">
                    <button class="btn-action-icon"
                            @click="() => { $event.stopPropagation(); restaurant!.externalScripts!.splice(idx, 1) }">
                      <span class="mdi mdi-delete"></span>
                    </button>
                  </template>
                </TableBuilder>
              </Collapse>
            </div>
          </template>
          <template v-else-if="selectedTab === SettingsTab.Company">
            <div class="card p-0">
              <Company :is-loading="isLoading"
                       @update:validation="tabsForms[SettingsTab.Company].componentsForms.company = $event"
                       v-model="restaurant.company"></Company>
            </div>
            <div class="flex flex-col gap-4">
              <h2 class="page-subtitle -mb-2 mt-2 flex justify-between items-center">
                <span>{{ $tc('owners') }}</span>
                <button class="btn-action primary-fill" @click="addOwner()">
                  <span class="mdi mdi-plus"></span>
                  {{ $tc('add') }}
                </button>
              </h2>
              <ul>
                <li class="card relative px-0 pb-0" v-for="( owner, idx ) of restaurant.company!.owners" :key="owner.id">
                  <Person :is-loading="isLoading" v-model="restaurant!.company!.owners![idx]" />
                  <div
                       class="bg-white absolute -top-2 shadow -right-2 rounded-full w-8 h-8 flex items-center justify-center">
                    <button class="btn-action-icon" @click="restaurant!.company!.owners!.splice(idx, 1)">
                      <span class="mdi mdi-delete"></span>
                    </button>
                  </div>
                </li>
              </ul>
              <div>
                <h2 class="page-subtitle my-2">{{ $tc('bankAccount') }}</h2>
                <div class="card">
                  <BankAccount :is-loading="isLoading" v-model="restaurant!.company!.bankAccount"
                               @update:validation="tabsForms[SettingsTab.Company].componentsForms.bankAccount = $event" />
                </div>
              </div>
            </div>
          </template>
          <template v-else-if="selectedTab === SettingsTab.Orders">
            <div class="card">
              <GMap @update:polygonArray="polygonArray = $event" @update:polygonCenter="polygonCenter = $event"
                    @update:circle="circle = $event" :polygons="polygons" :circles="circles"></GMap>
              <template v-for="polygon of polygons" :key="polygon.id">
                <div class="flex justify-between">
                  <label class="form-label flex justify-center mx-4">
                    <span>Polygon {{ polygon.id + 1 }}</span>
                  </label>
                  <label class="form-label mx-4">
                    <span>Cost</span>
                    <input v-model="cost[polygon.id]" @change="updateCost(polygon.id)" />
                  </label>
                  <label class="form-label mx-4">
                    <span>Estimated Time</span>
                    <Datepicker v-model="estimatedTime[polygon.id]" :auto-apply="true" :minutes-increment="15" time-picker
                                @update:model-value="updateEstimate(polygon.id)" />
                  </label>
                  <label class="form-label flex justify-center mx-4" @click="handleDelete(polygon.id)">
                    <span class="mdi mdi-delete !text-3xl"></span>
                  </label>
                </div>
              </template>
              <template v-for="circle of circles" :key="circle.id">
                <div class="flex justify-between">
                  <label class="form-label flex justify-center mx-4">
                    <span>Circle {{ circle.id + 1 }}</span>
                  </label>
                  <label class="form-label mx-4">
                    <span>Cost</span>
                    <input v-model="cost[circle.id]" @change="updateCost(circle.id)" />
                  </label>
                  <label class="form-label mx-4">
                    <span>Estimated Time</span>
                    <Datepicker v-model="estimatedTime[circle.id]" :auto-apply="true" :minutes-increment="15" time-picker
                                @update:model-value="updateEstimate(circle.id)" />
                  </label>
                  <label class="form-label flex justify-center mx-4" @click="handleDelete(circle.id)">
                    <span class="mdi mdi-delete !text-3xl"></span>
                  </label>
                </div>
              </template>
            </div>
          </template>
        </div>
      </div>
    </ScrollableDiv>
  </div>
</template>
