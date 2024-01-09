import {
  AddressViewModel,
  DocumentViewModel,
  BankAccountHolderViewModel,
  BankAccountViewModel,
  CompanyViewModel,
  ITableGroupViewModel,
  PersonViewModel,
  TableGroupViewModel,
  IStoreViewModel,
  StoreViewModel,
  StoreFullViewModel,
  IStoreFullViewModel,
  PaymentProviderEnum,
  PaymentProviderViewModel,
  IPaymentProviderViewModel,
  RoleViewModel,
  TableViewModel,
  ITableViewModel,
  IMenuCategoryViewModel,
  IMenuItemMediaViewModel,
  IMenuItemViewModel,
  IMenuViewModel,
  IPlatformUserViewModel,
  LanguageInfoViewModel,
  MenuCategoryViewModel,
  MenuItemMediaViewModel,
  MenuItemViewModel,
  MenuViewModel,
  OrderViewModel,
  PlatformUserViewModel,
  IMenuAttributeItemViewModel,
  MenuAttributeItemViewModel,
  MenuAttributeGroupViewModel,
  IMenuAttributeGroupViewModel,
  MenuBundleViewModel,
  MenuBundleCategoryViewModel,
  IMenuBundleViewModel,
  MenuBundleCategoryItemViewModel,
  IMenuBundleCategoryViewModel,
  ItemInventoryProductViewModel,
  NotificationViewModel,
  INotificationViewModel,
  ScheduleViewModel,
  VisibilityScheduleViewModel
} from '../services/api.client'
import { clone, enumToArray } from '../services/utils'

export class FeMenuAttributeItem extends MenuAttributeItemViewModel {
  languageInfo: { [key: string]: LanguageInfoViewModel; }
  constructor(data: Partial<IMenuAttributeItemViewModel>) {
    super(data as any)
    this.id = data.id ?? `#${Math.random().toString().replace('.', '')}`
    this.labels = data.labels ?? []
    const languageInfo = data?.languageInfo ?? {}
    this.inventoryProducts = data.inventoryProducts?.map(p => new ItemInventoryProductViewModel(p)) ?? []
    this.languageInfo = Object.keys(languageInfo).reduce((map, lang) => ({ ...map, [lang]: new LanguageInfoViewModel(languageInfo[lang]) }), {})
    this.price = data.price ?? 0
  }

  initialize(defaultLanguage?: string): FeMenuAttributeItem {
    if (!this.languageInfo && defaultLanguage)
      this.languageInfo = { [defaultLanguage]: new LanguageInfoViewModel() }
    this.isVisible = true
    return this
  }
}

export class FeMenuBundleCategoryViewModel extends MenuBundleCategoryViewModel {
  languageInfo: { [key: string]: LanguageInfoViewModel; }
  menuItems: MenuBundleCategoryItemViewModel[]
  constructor(data: Partial<IMenuBundleCategoryViewModel>) {
    super(data as any)
    this.id = data.id ?? `#${Math.random().toString().replace('.', '')}`
    this.menuItems = data.menuItems?.map((b) => new MenuBundleCategoryItemViewModel(b)) ?? []
    const languageInfo = data?.languageInfo ?? {}
    this.languageInfo = Object.keys(languageInfo).reduce((map, lang) => ({ ...map, [lang]: new LanguageInfoViewModel(languageInfo[lang]) }), {})
  }
}

export class FeMenuBundleViewModel extends MenuBundleViewModel {
  languageInfo: { [key: string]: LanguageInfoViewModel; }
  bundleCategories: FeMenuBundleCategoryViewModel[]
  constructor(data: Partial<IMenuBundleViewModel>) {
    super(data as any)
    this.id = data.id ?? `#${Math.random().toString().replace('.', '')}`
    this.bundleCategories = data.bundleCategories?.map((b, ai) => new FeMenuBundleCategoryViewModel(b)) ?? []
    const languageInfo = data?.languageInfo ?? {}
    this.languageInfo = Object.keys(languageInfo).reduce((map, lang) => ({ ...map, [lang]: new LanguageInfoViewModel(languageInfo[lang]) }), {})
  }
}
export class FeMenuAttributeGroup extends MenuAttributeGroupViewModel {
  languageInfo: { [key: string]: LanguageInfoViewModel; }
  constructor(data: Partial<IMenuAttributeGroupViewModel>) {
    super(data as any)
    this.id = data.id ?? `#${Math.random().toString().replace('.', '')}`
    this.attributeItemIds = data.attributeItemIds ?? []
    const languageInfo = data?.languageInfo ?? {}
    this.languageInfo = Object.keys(languageInfo).reduce((map, lang) => ({ ...map, [lang]: new LanguageInfoViewModel(languageInfo[lang]) }), {})
  }

  initialize(defaultLanguage: string): void {
    this.languageInfo = { [defaultLanguage]: new LanguageInfoViewModel() }
  }

  clone(idx: number): FeMenuAttributeGroup {
    const clonedItem = clone(this)
    clonedItem.id = undefined
    clonedItem.languageInfo = Object.keys(clonedItem.languageInfo).reduce((map, k) => ({ ...map, [k]: new LanguageInfoViewModel(clonedItem.languageInfo[k]) }), {})
    return new FeMenuAttributeGroup(clonedItem)
  }
}

export class FeMenuItemMediaViewModel extends MenuItemMediaViewModel {
  _idx: number
  constructor(idx: number, data: IMenuItemMediaViewModel) {
    super(data)
    this._idx = idx
  }
}

export class FeMenuItemViewModel extends MenuItemViewModel {
  medias: FeMenuItemMediaViewModel[]
  attributeGroupIds: string[]
  languageInfo: { [key: string]: LanguageInfoViewModel; }
  constructor(data: Partial<IMenuItemViewModel>) {
    super(data as any)
    this.id = data.id ?? `#${Math.random().toString().replace('.', '')}`
    this.labels = data.labels ?? []
    this.schedules = data.schedules?.map(s => new VisibilityScheduleViewModel(s)) ?? []
    this.medias = data.medias?.map((m, mi) => new FeMenuItemMediaViewModel(mi, m)) ?? []
    this.attributeGroupIds = data.attributeGroupIds ?? []
    const languageInfo = data?.languageInfo ?? {}
    this.languageInfo = Object.keys(languageInfo).reduce((map, lang) => ({ ...map, [lang]: new LanguageInfoViewModel(languageInfo[lang]) }), {})
    this.price = data.price ?? 0
    this.inventoryProducts = data.inventoryProducts?.map(p => new ItemInventoryProductViewModel(p)) ?? []
    this.recommended = data.recommended ?? []
    this.createdAt = data.createdAt !== undefined ? new Date(data.createdAt.toString()) : new Date()
    this.taxPercentage = data.taxPercentage ?? 0
  }

  initialize(defaultLanguage?: string): FeMenuItemViewModel {
    this.isVisible = true
    if (!this.languageInfo && defaultLanguage)
      this.languageInfo = { [defaultLanguage]: new LanguageInfoViewModel() }
    return this
  }
}

export class FeCategoryViewModel extends MenuCategoryViewModel {
  collapsed: boolean
  languageInfo: { [key: string]: LanguageInfoViewModel; }
  constructor(data: Partial<IMenuCategoryViewModel>) {
    super(data as any)
    this.id = data?.id ?? `#${Math.random().toString().replace('.', '')}`
    this.collapsed = false
    this.schedules = data.schedules?.map(s => new VisibilityScheduleViewModel(s)) ?? []
    this.isVisible = data?.isVisible ?? false
    const languageInfo = data?.languageInfo ?? {}
    this.languageInfo = Object.keys(languageInfo).reduce((map, lang) => ({ ...map, [lang]: new LanguageInfoViewModel(languageInfo[lang]) }), {})
    this.menuItemIds = data?.menuItemIds ?? []
    this.createdAt = data?.createdAt !== undefined ? new Date(data.createdAt.toString()) : new Date()
    this.taxPercentage = data?.taxPercentage ?? 0
  }

  initialize(defaultLanguage?: string): FeCategoryViewModel {
    this.isVisible = true
    if (!this.languageInfo && defaultLanguage)
      this.languageInfo = { [defaultLanguage]: new LanguageInfoViewModel() }
    return this
  }

  clone(): this {
    const clonedCategory = clone(this)
    clonedCategory.id = undefined
    clonedCategory.createdAt = new Date(clonedCategory.createdAt! as unknown as string)
    clonedCategory.languageInfo = Object.keys(clonedCategory.languageInfo).reduce((map, k) => ({ ...map, [k]: new LanguageInfoViewModel(clonedCategory.languageInfo[k]) }), {})
    return clonedCategory
  }
}

export class FeMenuViewModel extends MenuViewModel {
  categories: FeCategoryViewModel[]
  bundles: FeMenuBundleViewModel[]
  constructor(data?: Partial<IMenuViewModel>) {
    super(data as any)
    this.id = data?.id
    const languageInfo = data?.languageInfo ?? {}
    this.languageInfo = Object.keys(languageInfo).reduce((map, lang) => ({ ...map, [lang]: new LanguageInfoViewModel(languageInfo[lang]) }), {})
    this.categories = data?.categories?.map((c, ci) => new FeCategoryViewModel(c)) ?? []
    this.bundles = data?.bundles?.map(i => new FeMenuBundleViewModel(i)) ?? []
    this.menuItems = data?.menuItems?.map(i => new FeMenuItemViewModel(i)) ?? []
    this.attributes = data?.attributes?.map(i => new FeMenuAttributeItem(i)) ?? []
    this.languages = data?.languages ?? {}
    this.attributeGroups = data?.attributeGroups?.map(g => new FeMenuAttributeGroup(g)) ?? []
    this.isActive = data?.isActive ?? false
    this.createdAt = data?.createdAt !== undefined ? new Date(data.createdAt.toString()) : new Date()
    this.suggestedItems = data?.suggestedItems ?? []
    this.taxPercentage = data?.taxPercentage ?? 0
  }

  initialize(defaultLanguage: string): this {
    this.languageInfo = { [defaultLanguage]: new LanguageInfoViewModel() }
    const newCategory = new FeCategoryViewModel({ languageInfo: { [defaultLanguage]: new LanguageInfoViewModel() } })
    newCategory.initialize(defaultLanguage)
    this.categories.push(newCategory)
    this.isActive = true
    return this
  }
}

export class FeOrderViewModel extends OrderViewModel {
  isLoading?: boolean
}

export class FeStoreViewModel extends StoreViewModel {
  constructor(data: Partial<IStoreViewModel>) {
    super({ connectedUsers: [], ...data } as any)
  }
}

export class FePlatformUserViewModel extends PlatformUserViewModel {
  declare restaurants: FeStoreViewModel[]
  constructor(data: Partial<IPlatformUserViewModel>) {
    super({ id: '', ...data } as any)
    if (!this.role)
      this.role = new RoleViewModel()
    if (!this.mappedRestaurants)
      this.mappedRestaurants = {}
  }
}

export class FePaymentProviderViewModel extends PaymentProviderViewModel {
  constructor(data: Partial<IPaymentProviderViewModel>) {
    super(data as any)
  }
}

export class FeStoreFullViewModel extends StoreFullViewModel {
  constructor(data?: IStoreFullViewModel) {
    super(data)
    this.displayName = data?.displayName ?? ''
    this.slug = data?.slug ?? ''
    this.percentageFee = data?.percentageFee ?? 0
    this.currencyCode = data?.currencyCode ?? 'eur'
    this.logoUrl = data?.logoUrl ?? ''
    this.activeFeatures = data?.activeFeatures ?? []
    this.defaultLangCode = data?.defaultLangCode ?? 'en'
    if (!this.paymentProviders || this.paymentProviders.length === 0)
      this.paymentProviders = enumToArray(PaymentProviderEnum).map((x: any) => new FePaymentProviderViewModel({ paymentProviderId: PaymentProviderEnum[x] as unknown as number }))
    if (!this.company)
      this.company = CompanyViewModel.fromJS({
        bankAccount: BankAccountViewModel.fromJS({
          bankAccountHolder: BankAccountHolderViewModel.fromJS({
            billingAddress: new AddressViewModel(),
            person: PersonViewModel.fromJS({
              address: new AddressViewModel()
            })
          })
        }),
        principalAddress: new AddressViewModel(),
        registeredAddress: new AddressViewModel(),
        owners: [],
        registrationDocument: new DocumentViewModel()
      })!
    if (!this.address)
      this.address = new AddressViewModel()
    if (!this.externalLinks)
      this.externalLinks = []
    if (!this.externalScripts)
      this.externalScripts = []
    if (!this.closingSchedules)
      this.closingSchedules = []
    if (!this.openingSchedules)
      this.openingSchedules = []
    if (!this.deliverySchedules)
      this.deliverySchedules = []
    if (!this.takeAwaySchedules)
      this.takeAwaySchedules = []
    if (!this.orderChannels)
      this.orderChannels = []
  }
}

export class FeTableViewModel extends TableViewModel {
  constructor(data?: Partial<ITableViewModel>) {
    super(data as any)
    this.id = data?.id ?? `#${Math.random()}`
  }
}

export class FeTableGroupViewModel extends TableGroupViewModel {
  constructor(data?: Partial<ITableGroupViewModel>) {
    super(data as any)
    this.id = data?.id ?? `#${Math.random()}`
    if (!data?.tables)
      this.tables = []
  }
}

export class FeNotificationViewModel extends NotificationViewModel {
  declare data: any
  constructor(data?: Partial<INotificationViewModel>) {
    super(data as any)
    this.data = JSON.parse(data?.data ?? '')
  }
}
