import { OrderStatusEnum } from '../../services/api.client'

const ORDER_SETTINGS_KEY = 'ORDER_SETTINGS_KEY'

export enum AudioSource {
  Default = 1,
  DingDong = 2
}

export class OrdersSettings {
  public showSelectorAsGrid = false
  public categoryFilters: string[] = []
  public favoriteItems: string[] = []
  public tableGroupsFilters: string[] = []
  public statusFilters: OrderStatusEnum[] = []
  public notificationIntervalSeconds?: number
  public printReceiptOnSettle = false
  public audioSource: AudioSource = AudioSource.Default
  public automaticPrintDevices: { [menuId: string]: { [printerId: string]: string[] } } = {}
  public static LoadOrCreate(): OrdersSettings {
    try {
      const settings = localStorage.getItem(ORDER_SETTINGS_KEY) ?? ''
      const parsedSettings = new OrdersSettings(JSON.parse(settings))
      if (typeof parsedSettings.automaticPrintDevices !== 'object') {
        parsedSettings.automaticPrintDevices = {}
        parsedSettings.save()
      }
      return parsedSettings
    } catch (error) {
      return new OrdersSettings()
    }
  }

  constructor(data?: Partial<OrdersSettings>) {
    Object.assign(this, data ?? {})
  }

  public save() {
    localStorage.setItem(ORDER_SETTINGS_KEY, JSON.stringify(this))
  }
}
