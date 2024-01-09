import { HubConnectionState } from '@microsoft/signalr'
import mitt, { Emitter } from 'mitt'
import { Ref, ref } from 'vue'
import { apiClient } from '../../services/api'
import { IOrdersAccountViewModel, IOrderViewModel, OrderStatusEnum, OrderTypeEnum, OrderViewModel } from '../../services/api.client'
import { store } from '../../services/store'
import { ITEM_REMOVE_TIMEOUT_MS, ORDERS_ACCOUNT_CHECK_INTERVAL } from '../../types/constants'

export type TableOrderMap = { [tableId: string]: { lastOrderId: string; orderIds: string[] } }
export type RemovedElementsMap = { [id: string]: { timeout: any, removedAt: Date, percentageCompleted: number } }
export type OrdersMap = { [orderId: string]: OrderViewModel }
export type OrdersAccountsMap = { [ordersAccountId: string]: IOrdersAccountViewModel }
export type OrderEmitterEvents = {
  ordersAccountRemoved: { ordersAccountId: string; lastId: string }
  ordersAccountClosed: string
  tableOrderRemoved: OrderViewModel
  newTableOrder: OrderViewModel
  removedAtMapUpdated: RemovedElementsMap
  tableOrderMapUpdated: TableOrderMap
  ordersUpdated: { updatedOrdersAccountsMap: OrdersAccountsMap, updatedOrdersMap: OrdersMap }
}

class OrderStore {
  private checkInterval: any
  private lastUpdate: Date | undefined = undefined
  private MINUTES_REFRESH = 3
  public ordersMap: Ref<OrdersMap> = ref({})
  private currentRestaurantId: string | undefined
  private removedAtMap: Ref<RemovedElementsMap> = ref({})
  private tableOrderMap: Ref<TableOrderMap> = ref({})
  public ordersAccountsMap: Ref<{ [ordersAccountId: string]: IOrdersAccountViewModel }> = ref({})
  private refreshSent = false
  private isConnectionInitialized = false
  private orderEmitter: Emitter<OrderEmitterEvents> = mitt<OrderEmitterEvents>()
  constructor() {
    store.connectionEmitter.on('reconnected', () => {
      console.log('Orders page reconnects to WS')
      this.startWsConnection(this.currentRestaurantId!)
    })
  }

  resetRefreshCounter() {
    this.refreshSent = false
  }

  public on = this.orderEmitter.on

  async unmount() {
    clearInterval(this.checkInterval)
    this.orderEmitter.all.clear()
    this.ordersMap.value = {}
    this.ordersAccountsMap.value = {}
    this.removedAtMap.value = {}
    this.lastUpdate = undefined
    this.isConnectionInitialized = false
    this.refreshSent = false
    store.connection?.off('ORDERS_UPDATED')
    store.connection?.off('ORDERS_ACCOUNT_CLOSED')
    if (store.connection?.state === HubConnectionState.Connected)
      try {
        store.connection?.invoke('Unsubscribe', 'ORDERS')
      } catch (err) {
        console.log(err)
      }
  }

  private ordersAccountShouldBeClosed(ordersAccount: IOrdersAccountViewModel, ordersMap: Record<string, OrderViewModel>) {
    const orders = ordersAccount.orders?.map(o => ordersMap[o.id!]) ?? []
    const totalAmount = orders.reduce((total, o) => total + o.amount, 0)
    const paidAmount = parseFloat((ordersAccount.receipts?.reduce((total, r) => total + r.amount, 0) ?? 0).toFixed(2))
    return orders
      ?.filter(o => o.items.filter(i => !i.isRemoved && !i.isRefunded).length > 0)
      ?.every(o => o.statusId === OrderStatusEnum.Done) && paidAmount === totalAmount
  }

  private async startCheck() {
    this.checkInterval = setInterval(() => {
      if (!this.lastUpdate || this.refreshSent || store.connection?.state !== HubConnectionState.Connected) return
      if (Math.floor(((new Date().getTime() - this.lastUpdate.getTime()) / 1000) / 60) >= this.MINUTES_REFRESH) {
        store.connection?.invoke('Subscribe', 'ORDERS', this.currentRestaurantId!)
        this.refreshSent = true
        setTimeout(() => this.refreshSent = false, 1000 * 20)
      }
    }, 1000 * 5)
  }

  async startWsConnection(restaurantId: string) {
    this.currentRestaurantId = restaurantId
    if (!this.isConnectionInitialized) {
      store.connection.on('ORDERS_ACCOUNT_CLOSED', ordersAccountId => {
        const ordersAccount = this.ordersAccountsMap.value[ordersAccountId]
        if (!ordersAccount) return
        if (!this.removedAtMap.value[ordersAccountId]) {
          this.removedAtMap.value[ordersAccountId] = {
            timeout: ((ordersAccount) => setInterval(() => {
              this.removedAtMap.value[ordersAccount.id].percentageCompleted += 2
              if (this.removedAtMap.value[ordersAccount.id].percentageCompleted >= 100)
                this.removedAtMap.value[ordersAccount.id].percentageCompleted = 100
              if (this.removedAtMap.value[ordersAccount.id].percentageCompleted >= 100) {
                clearInterval(this.removedAtMap.value[ordersAccount.id].timeout)
                ordersAccount.orders?.forEach(order => delete this.ordersMap.value[order.id!])
                delete this.ordersAccountsMap.value[ordersAccount.id]
                delete this.removedAtMap.value[ordersAccount.id]
                this.orderEmitter.emit('ordersUpdated', { updatedOrdersMap: this.ordersMap.value, updatedOrdersAccountsMap: this.ordersAccountsMap.value })
                this.orderEmitter.emit('ordersAccountRemoved', { ordersAccountId, lastId: ordersAccount.lastId! })
              }
              this.orderEmitter.emit('removedAtMapUpdated', this.removedAtMap.value)
            }, ITEM_REMOVE_TIMEOUT_MS / 50))(ordersAccount),
            removedAt: new Date(),
            percentageCompleted: 0
          }
          this.orderEmitter.emit('removedAtMapUpdated', this.removedAtMap.value)
        }
        this.orderEmitter.emit('ordersAccountClosed', ordersAccountId)
      })

      store.connection.on('ORDERS_UPDATED', ({ orders, ordersAccounts }: { orders: IOrderViewModel[] | null; ordersAccounts: IOrdersAccountViewModel[] | null }) => {
        this.lastUpdate = new Date()

        if (orders) {
          const updatedMap: Record<string, OrderViewModel> = {
            ...this.ordersMap.value,
            ...orders.reduce((map, order) => ({ ...map, [order.id!]: OrderViewModel.fromJS({ ...order, sentAt: new Date(order.sentAt) }) }), {})
          }
          for (const order of Object.values(updatedMap)) {
            // TODO:
            // if (order.id === orderChangesId)
            //   orderChangesId = null
            if ((order.statusId === OrderStatusEnum.Rejected || order.statusId === OrderStatusEnum.Done) && !order.ordersAccountId && !this.removedAtMap.value[order.id!]) {
              this.removedAtMap.value[order.id!] = {
                timeout: ((order: OrderViewModel) => setInterval(() => {
                  this.removedAtMap.value[order.id!].percentageCompleted += 2
                  if (this.removedAtMap.value[order.id!].percentageCompleted >= 100)
                    this.removedAtMap.value[order.id!].percentageCompleted = 100
                  if (this.removedAtMap.value[order.id!].percentageCompleted >= 100) {
                    clearInterval(this.removedAtMap.value[order.id!].timeout)
                    if (order.orderTypeId === OrderTypeEnum.Table && !!this.tableOrderMap.value[order.table!.id!]) {
                      const idx = this.tableOrderMap.value[order.table!.id!].orderIds.indexOf(order.id!)
                      this.tableOrderMap.value[order.table!.id!].orderIds.splice(idx, 1)
                      if (this.tableOrderMap.value[order.table!.id!].lastOrderId === order.id!) {
                        this.tableOrderMap.value[order.table!.id!].lastOrderId = this.tableOrderMap.value[order.table!.id!].orderIds[0]
                        this.orderEmitter.emit('tableOrderRemoved', order)
                      }
                      if (this.tableOrderMap.value[order.table!.id!].orderIds.length === 0)
                        delete this.tableOrderMap.value[order.table!.id!]
                      this.orderEmitter.emit('tableOrderMapUpdated', this.tableOrderMap.value)
                    }
                    delete this.ordersMap.value[order.id!]
                    delete this.removedAtMap.value[order.id!]
                    this.orderEmitter.emit('ordersUpdated', { updatedOrdersMap: this.ordersMap.value, updatedOrdersAccountsMap: this.ordersAccountsMap.value })
                  }
                  this.orderEmitter.emit('removedAtMapUpdated', this.removedAtMap.value)
                }, ITEM_REMOVE_TIMEOUT_MS / 50))(order),
                removedAt: new Date(),
                percentageCompleted: 0
              }
              this.orderEmitter.emit('removedAtMapUpdated', this.removedAtMap.value)
            }
            if (order.orderTypeId === OrderTypeEnum.Table && !order.ordersAccountId) {
              if (!this.tableOrderMap.value[order.table!.id!])
                this.tableOrderMap.value[order.table!.id!] = { lastOrderId: order.id!, orderIds: [order.id!] }
              else if (this.tableOrderMap.value[order.table!.id!].orderIds.indexOf(order.id!) === -1) {
                this.tableOrderMap.value[order.table!.id!].orderIds.push(order.id!)
                const latestTableOrder = updatedMap[this.tableOrderMap.value[order.table!.id!].lastOrderId]
                if (order.sentAt > latestTableOrder.sentAt) {
                  this.tableOrderMap.value[order.table!.id!].lastOrderId = order.id!
                  this.orderEmitter.emit('newTableOrder', latestTableOrder)
                }
              }
              this.orderEmitter.emit('tableOrderMapUpdated', this.tableOrderMap.value)
            }
          }

          if (ordersAccounts && ordersAccounts.length > 0)
            this.ordersAccountsMap.value = (ordersAccounts ?? [])
              .reduce((map, ordersAccount) => ({ ...map, [ordersAccount.id]: ordersAccount }), { ...this.ordersAccountsMap.value })
          Object.values(this.ordersAccountsMap.value)
            .filter(ordersAccount => this.ordersAccountShouldBeClosed(ordersAccount, updatedMap))
            .forEach(ordersAccount => setTimeout(() => {
              if (this.removedAtMap.value[ordersAccount.id]) return
              ordersAccount.orders?.forEach(order => delete this.ordersMap.value[order.id!])
              delete this.ordersAccountsMap.value[ordersAccount.id]

              Object.values(this.ordersMap.value).forEach(order => {
                if (order.ordersAccountId && !this.ordersAccountsMap.value[order.ordersAccountId])
                  delete this.ordersMap.value[order.id!]
              })
              if (!this.removedAtMap.value[ordersAccount.id])
                apiClient.ordersAccountCheck(this.currentRestaurantId!, ordersAccount.id)
            }, ORDERS_ACCOUNT_CHECK_INTERVAL))

          this.ordersMap.value = updatedMap
          this.orderEmitter.emit('ordersUpdated', ({ updatedOrdersMap: updatedMap, updatedOrdersAccountsMap: this.ordersAccountsMap.value }))
        }
      })
      this.startCheck()
      this.isConnectionInitialized = true
    }
    await store.isStoreConnected()
    store.connection?.invoke('Subscribe', 'ORDERS', this.currentRestaurantId)
  }
}
export const orderStore = new OrderStore()
