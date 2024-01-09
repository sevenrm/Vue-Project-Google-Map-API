import { notifier } from './notification'
import { i18nInstance } from './i18n'
import { apiClient, http } from './api'
import { deleteJwt, getJwt, setJwt } from './session'
import { DeviceViewModel, ILoginRequest, Language, LoginRequest, PlatformPermissionEnum, PlatformUserViewModel, StoreViewModel } from './api.client'
import { ref, Ref, toHandlers } from 'vue'
import { router } from '../routes'
import { numberFormatter } from './number.formatter'
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr'
import { environment } from '../environment'
import { useToast } from 'vue-toastification'
import { ToastID } from 'vue-toastification/dist/types/types'
import { deviceApp } from './deviceapp'
import mitt, { Emitter } from 'mitt'
import { AES, enc, PBKDF2, lib, mode, pad } from 'crypto-js'

export type ConnectionEmitterEvents = {
  connected: void,
  disconnected: void,
  reconnected: void
}

class Store {
  private isUserLoading = false
  private _user: Ref<PlatformUserViewModel | undefined> = ref(undefined)
  languages: Ref<Language[]> = ref([])
  public device: Ref<DeviceViewModel | undefined> = ref(undefined)
  private hasConnected = false
  private deviceConnectionToken: string | undefined
  private deviceDefaultRestaurantId: string | undefined
  public deviceCredentials: Ref<{ id: string, token: string | undefined } | null> = ref(null)
  public showConnectionError = ref(false)
  public connection!: HubConnection
  public selectedRestaurant: Ref<StoreViewModel | undefined> = ref(undefined)
  public userLoaded: Promise<void> | undefined
  private toast: any
  private currentToast: ToastID | null = null
  isLoadingPage: Ref<boolean> = ref(false)
  isDeviceLocked: Ref<boolean> = ref(false)
  deviceUsers: Ref<PlatformUserViewModel[]> = ref([])
  connectionEmitter: Emitter<ConnectionEmitterEvents> = mitt<ConnectionEmitterEvents>()
  private connectionLockResolver: (() => void) | undefined
  private SELECTED_RESTAURANT_ID_KEY = 'SELECTED_RESTAURANT_ID'
  constructor() {
    this.toast = useToast()
    this.exposeDeviceFunctions()
    this.fireInterceptors()
    const userToken = getJwt()
    if (userToken) {
      this.addTokenToAxios(userToken)
      this.setupConnection(userToken, false)
    }
    window.onbeforeunload = () => {
      if (this.deviceCredentials.value?.token)
        this.logoutUser()
    }
  }

  async setDeviceCredentials(id: string, token: string, appVersion: string) {
    console.log('bound device with version', appVersion, id, token)
    if (this.deviceCredentials.value?.id && !this.deviceCredentials.value?.token && token)
      notifier.notifySuccess('deviceSet')
    this.deviceCredentials.value = { id, token }
    if (id && token) {
      this.logoutUser()
      router.push({ name: 'login' })
    }
  }

  async initDevice(connectionToken: string, restaurantId: string) {
    if (this.deviceCredentials.value?.token && connectionToken) {
      console.log('initializing device')
      deviceApp.initDevice(connectionToken, restaurantId)
    }
  }

  private async startDeviceConnection() {
    console.log('starting device connection')
    if (this.device.value && this.deviceConnectionToken && this.deviceDefaultRestaurantId)
      this.initDevice(this.deviceConnectionToken, this.deviceDefaultRestaurantId)
  }

  private async onDeviceConnectionClosed() {
    console.log('device connection closed')
    this.startDeviceConnection()
  }

  private async onDeviceConnectionOpened() {
    console.log('device connection opened')
  }

  private async onDeviceConnectionError(err: string) {
    console.error('error during device connection', err)
  }

  private exposeDeviceFunctions() {
    const fns: Record<string, ((...args: any[]) => void)> = {
      setCredentials: this.setDeviceCredentials.bind(this),
      onConnectionClosed: this.onDeviceConnectionClosed.bind(this),
      onConnectionOpened: this.onDeviceConnectionOpened.bind(this),
      onConnectionError: this.onDeviceConnectionError.bind(this)
    }
    deviceApp.exposeFunctions(fns)
    deviceApp.notifyPageLoaded()
  }

  get selectedRestaurantId() {
    return this.selectedRestaurant.value?.id
  }

  private async loadLanguages() {
    this.languages.value = await apiClient.globalLanguages()
  }

  private onReconnected() {
    this.startDeviceConnection()
    this.connectionEmitter.emit('reconnected')
    if (this.currentToast !== null) {
      this.toast.dismiss(this.currentToast)
      this.currentToast = null
    }
  }

  private acquireConnectionLock() {
    if (!this.connectionLockResolver && navigator && navigator.locks && navigator.locks.request) {
      const promise = new Promise<void>((resolve) => {
        this.connectionLockResolver = resolve
      })

      navigator.locks.request('ws_connection_lock', { mode: 'shared' }, () => {
        return promise
      })

      console.log('connection lock acquired')
    }
  }

  private setupConnection(token: string, isFromDevice: boolean) {
    if (!token) return
    if (this.connection !== undefined && this.connection.state !== HubConnectionState.Disconnected) return
    this.acquireConnectionLock()
    this.connection = new HubConnectionBuilder()
      .withUrl(`${environment.baseUrl}/ws${(isFromDevice ? '/device' : '')}/user`, {
        accessTokenFactory: () => token,
        headers: { 'X-DEVICE': this.deviceCredentials.value?.id ?? '' }
      })
      .withAutomaticReconnect()
      .build()
    // this.connection.serverTimeoutInMilliseconds = 1000 * 60 * 5
    // this.connection.keepAliveIntervalInMilliseconds = 1000 * 5

    this.startConnection(token)

    this.connection.onreconnecting(error => {
      console.log(error)
      console.log(this.connection.state, 'onreconnecting')
      setTimeout(() => {
        if (this.connection.state === HubConnectionState.Connected) return
        if (this.currentToast === null)
          this.currentToast = notifier.notifyError('connectionLost', undefined, undefined, undefined, { timeout: false, closeOnClick: false, draggablePercent: 0 })
        // Warn users that the connection has been lost.
      }, 1000 * 2)
    })

    this.connection.onreconnected(msg => {
      this.onReconnected()

      console.log(this.connection.state, 'onreconnected')
      this.connection.invoke('Reconnected')
    })

    this.connection.onclose(async error => {
      console.error(error)
      this.connectionEmitter.emit('disconnected')
      console.log(this.connection.state, 'onclose')
      this.connectionLockResolver?.()
      this.connectionLockResolver = undefined
      if (!getJwt()) return
      if (this.hasConnected)
        this.showConnectionError.value = true
      setTimeout(() => this.startConnection(token), 5000)
    })
  }

  public async startConnection(token: string) {
    if (!token) return
    this.connection.serverTimeoutInMilliseconds = 6000
    this.connection.keepAliveIntervalInMilliseconds = 3000
    if (this.connection.state !== HubConnectionState.Disconnected) return
    try {
      await this.connection.start()
      this.hasConnected = true
      this.connectionEmitter.emit('connected')
      if (this.showConnectionError.value) {
        notifier.notifySuccess('connected')
        this.showConnectionError.value = false
      }
      this.onReconnected()
      console.log('SignalR Connected.')
    } catch (err) {
      console.log(err)
      setTimeout(() => this.startConnection(token), 5000)
    }
  }

  public setRestaurant(restaurant: StoreViewModel) {
    this.selectedRestaurant.value = restaurant
    numberFormatter.setCurrency(restaurant.currencyCode)
    localStorage.setItem(this.SELECTED_RESTAURANT_ID_KEY, restaurant.id!)
    router.push({ name: router.currentRoute.value.name!, params: { restaurantId: restaurant.id } })
  }

  public isStoreConnected() {
    const connection = this.connection
    const checkConnection = (resolve: any) => setTimeout(() => {
      if (!connection || connection.state !== HubConnectionState.Connected)
        checkConnection(resolve)
      else
        resolve()
    }, 1000)
    return new Promise<void>((resolve) => checkConnection(resolve))
  }

  isUserAdmin() {
    return (store.user.value?.role.permissions ?? []).indexOf(PlatformPermissionEnum.SuperAdmin) > -1
  }

  get user() {
    if (!this._user.value && !!getJwt() && !this.isUserLoading)
      this.loadUser()
    return this._user
  }

  private loadUser() {
    this.isUserLoading = true
    this.userLoaded = new Promise<void>(async (resolve, reject) => {
      try {
        const user = await apiClient.userGet()
        user.token = getJwt()!
        this.setupUserAndRestaurant(user)
      } catch (error) {
        reject(error)
      } finally {
        this.isUserLoading = false
      }
      resolve()
    })
  }

  get canUserAccess() {
    const canUserAccess = !!getJwt() ?? false
    if (canUserAccess && !this._user.value && !this.isUserLoading)
      this.loadUser()
    return canUserAccess
  }

  async deviceLogin(): Promise<boolean> {
    try {
      const response = await apiClient.userDeviceLogin(LoginRequest.fromJS({ username: this.deviceCredentials.value!.id!, password: this.deviceCredentials.value!.token! })!)
      this.device.value = response.device
      this.deviceUsers.value = response.users!
      this.deviceDefaultRestaurantId = response.restaurantId!
      this.deviceConnectionToken = response.deviceConnectionToken!
      localStorage.setItem(this.SELECTED_RESTAURANT_ID_KEY, response.restaurantId!)
      const restaurant = response.users![0].restaurants.find(r => r.id === response.restaurantId)
      this.selectedRestaurant.value = restaurant
      numberFormatter.setCurrency(restaurant!.currencyCode)
      this.isDeviceLocked.value = true
      this.startDeviceConnection()
      this.setupConnection(this.deviceCredentials.value!.token!, true)
      return true
    } catch (err) {
      return false
    }
  }

  decryptAES = (encryptedBase64: string, passphrase: string, salt: string) => {
    // Creating the Vector Key
    const iv = enc.Hex.parse('e84ad660c4721ae0e84ad660c4721ae0')
    // Encoding the Password in from UTF8 to byte array
    const pass = enc.Utf8.parse(passphrase)
    // Encoding the Salt in from UTF8 to byte array
    const parsedSalt = enc.Utf8.parse(salt)
    // Creating the key in PBKDF2 format to be used during the decryption
    const key128Bits1000Iterations = PBKDF2(pass.toString(enc.Utf8), parsedSalt, { keySize: 128 / 32, iterations: 1000 })
    // Enclosing the test to be decrypted in a CipherParams object as supported by the CryptoJS libarary
    const cipherParams = lib.CipherParams.create({
      ciphertext: enc.Base64.parse(encryptedBase64)
    })

    // Decrypting the string contained in cipherParams using the PBKDF2 key
    const decrypted = AES.decrypt(cipherParams, key128Bits1000Iterations, { mode: mode.CBC, iv, padding: pad.Pkcs7 })
    const decryptedStr = decrypted.toString(enc.Utf8)
    if (!decryptedStr || decryptedStr.length === 0)
      throw new Error('empty')
    return decryptedStr
  }

  async pinLogin(userId: string, pin: string): Promise<boolean> {
    if (userId === this._user.value?.id) {
      const isValid = this._user.value.pin === pin
      if (isValid)
        this.isDeviceLocked.value = false
      return isValid
    }
    const user = this.deviceUsers.value.find(u => u.id === userId)
    if (!user) return false
    let decryptedToken: string
    try {
      decryptedToken = this.decryptAES(user!.token!, pin.repeat(4), user.id.slice(0, 16))
    } catch (error) {
      return false
    }
    if (this.connection.state === HubConnectionState.Connected)
      this.connection?.invoke('SetIdentity', userId)
    this.hasConnected = false
    this._user.value = user
    i18nInstance.global.locale = user.langCode as any
    this.addTokenToAxios(decryptedToken)
    setJwt(decryptedToken)
    this.isDeviceLocked.value = false
    this.onReconnected()
    return true
  }

  async login(loginCredentials: ILoginRequest): Promise<boolean> {
    try {
      this.logoutUser()
      const user = await apiClient.userLogin(new LoginRequest(loginCredentials))
      this.setupUserAndRestaurant(user)
      this.addTokenToAxios(user.token!)
      setJwt(user.token!)
      this.setupConnection(getJwt() ?? '', false)
      return true
    } catch (err) {
      return false
    }
  }

  private setupUserAndRestaurant(user: PlatformUserViewModel) {
    this._user.value = user
    i18nInstance.global.locale = user.langCode as any
    const selectedRestaurantId = localStorage.getItem(this.SELECTED_RESTAURANT_ID_KEY)
    this.selectedRestaurant.value = this._user.value.restaurants.find(r => r.id === (selectedRestaurantId ?? this._user.value!.restaurants[0].id)) ?? this._user.value.restaurants[0]
    numberFormatter.setCurrency(this.selectedRestaurant.value.currencyCode)
  }

  private logoutUser() {
    this._user.value = undefined
    this.hasConnected = false
    this.connection?.stop()
    deleteJwt()
    this.addTokenToAxios('')
  }

  logoutDevice() {
    if (store.deviceCredentials.value?.token)
      deviceApp.logoutDevice()
    this.isDeviceLocked.value = false
    this.device.value = undefined
    this.deviceCredentials.value = null
    this.logoutUser()
  }

  logout() {
    if (this.device.value) {
      this.isDeviceLocked.value = true
      return
    }
    this.logoutUser()
    router.push({ name: 'login' })
  }

  addTokenToAxios(token: string | null): void {
    http.defaults.headers.common = {
      Authorization: token ? `Bearer ${token}` : ''
    }
    if (token)
      this.loadLanguages()
  }

  fireInterceptors() {
    http.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401)
          this.logout()

        return Promise.reject(error)
      }
    )
  }
}

export const store = new Store()
