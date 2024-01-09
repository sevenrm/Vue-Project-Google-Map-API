import { useToast } from 'vue-toastification'
import { apiClient } from './api'
import { store } from './store'
import domtoimage from 'dom-to-image'
import { PrinterViewModel } from './api.client'
import { notifier } from './notification'

const toast = useToast()
const printerMessageToastMap: { [messageId: string]: any } = {}
let isInitialized = false
const initialize = () => {
  if (isInitialized) return
  const connection = store.connection
  connection.on('MESSAGE_PRINTED', (messageId: string) => {
    const progressToast = printerMessageToastMap[messageId]
    if (progressToast === undefined) return
    toast.dismiss(progressToast)
    notifier.notifySuccess('printed')
    delete printerMessageToastMap[messageId]
  })
  connection.on('MESSAGE_PRINT_ERROR', ({ messageId, errorMessage }: { messageId: string, errorMessage: string }) => {
    const progressToast = printerMessageToastMap[messageId]
    if (progressToast === undefined) return
    toast.dismiss(progressToast)
    notifier.notifyError('printing', new Error(errorMessage), undefined, { timeout: false })
    delete printerMessageToastMap[messageId]
  })
  connection.on('CASHBOX_OPENED', (messageId: string) => {
    const progressToast = printerMessageToastMap[messageId]
    if (progressToast === undefined) return
    toast.dismiss(progressToast)
    notifier.notifySuccess('opened', 'drawer')
    delete printerMessageToastMap[messageId]
  })
  connection.on('CASHBOX_OPEN_ERROR', ({ messageId, errorMessage }: { messageId: string, errorMessage: string }) => {
    const progressToast = printerMessageToastMap[messageId]
    if (progressToast === undefined) return
    toast.dismiss(progressToast)
    notifier.notifyError('opening', new Error(errorMessage), undefined, { timeout: false })
    delete printerMessageToastMap[messageId]
  })
  isInitialized = true
}
export const printReceipt = async (restaurantId: string, deviceId: string, receiptId: string) => {
  initialize()
  const progressToast = toast.info('Print in progress')
  try {
    const messageId = await apiClient.receiptPrint(restaurantId, receiptId, deviceId)
    printerMessageToastMap[messageId] = progressToast
  } catch (error) {
    toast.dismiss(progressToast)
    notifier.notifyError('printing', error, 'receipt')
  }
}
export const openCashbox = async (restaurantId: string, deviceId: string, printer?: PrinterViewModel) => {
  initialize()
  const progressToast = toast.info('Opening in progress')
  try {
    const messageId = await apiClient.deviceOpenCashbox(restaurantId, deviceId, printer?.id)
    printerMessageToastMap[messageId] = progressToast
  } catch (error) {
    notifier.notifyError('opening', error, 'drawer')
  }
}

export const printEndOfPeriodReport = async (restaurantId: string, dateFrom: Date, dateTo: Date, deviceId: string, type: 'items' | 'summary') => {
  initialize()
  const progressToast = toast.info('Print in progress')
  try {
    const messageId = await (type === 'items' ? apiClient.reportPrintItems(restaurantId, dateFrom, dateTo, deviceId) : apiClient.reportPrintSummary(restaurantId, dateFrom, dateTo, deviceId))
    printerMessageToastMap[messageId] = progressToast
  } catch (error) {
    toast.dismiss(progressToast)
    notifier.notifyError('printing', error, 'cashTaking')
  }
}

export const printCashTaking = async (restaurantId: string, cashTakingId: string, deviceId: string) => {
  initialize()
  const progressToast = toast.info('Print in progress')
  try {
    const messageId = await apiClient.cashtakingPrint(restaurantId, cashTakingId, deviceId)
    printerMessageToastMap[messageId] = progressToast
  } catch (error) {
    toast.dismiss(progressToast)
    notifier.notifyError('printing', error, 'cashTaking')
  }
}

export const testPrinter = async (restaurantId: string, deviceId: string, printer: PrinterViewModel) => {
  initialize()
  const progressToast = toast.info(`Print in progress on device: ${printer.name}`)
  try {
    const messageId = await apiClient.devicePrinterTest(restaurantId, deviceId, printer.id!)
    printerMessageToastMap[messageId] = progressToast
  } catch (error) {
    toast.dismiss(progressToast)
    notifier.notifyError('printing', error, 'test', { printerName: printer.name })
  }
}
export const printOrder = async (orderId: string, ...printersSettings: { printer: PrinterViewModel, categoriesId: string[] }[]) => {
  initialize()
  for (const printerSettings of printersSettings) {
    const progressToast = toast.info(`Print in progress on device: ${printerSettings.printer.name}`)
    try {
      const messageId = await apiClient.orderPrint(store.selectedRestaurantId!, orderId, printerSettings.printer.id!, printerSettings.categoriesId)
      if (!messageId) {
        toast.dismiss(progressToast)
        continue
      }
      printerMessageToastMap[messageId] = progressToast
    } catch (error) {
      toast.dismiss(progressToast)
      notifier.notifyError('printing', error, 'order', { printerName: printerSettings.printer.name })
    }
  }
}
export const printOrdersAccount = async (ordersAccountId: string, ...printersSettings: { printer: PrinterViewModel, categoriesId: string[] }[]) => {
  initialize()
  for (const printerSettings of printersSettings) {
    const progressToast = toast.info(`Print in progress on device: ${printerSettings.printer.name}`)
    try {
      const messageId = await apiClient.ordersAccountPrint(store.selectedRestaurantId!, ordersAccountId, printerSettings.printer.id!, printerSettings.categoriesId)
      if (!messageId) {
        toast.dismiss(progressToast)
        continue
      }
      printerMessageToastMap[messageId] = progressToast
    } catch (error) {
      toast.dismiss(progressToast)
      notifier.notifyError('printing', error, 'order', { printerName: printerSettings.printer.name })
    }
  }
}

export const printTableQR = async (restaurantId: string, tableId: string, printer: PrinterViewModel) => {
  initialize()
  const progressToast = toast.info(`Print in progress on device: ${printer.name}`)
  try {
    const messageId = await apiClient.restaurantTablesPrint(restaurantId, tableId, printer.id!)
    printerMessageToastMap[messageId] = progressToast
  } catch (error) {
    toast.dismiss(progressToast)
    notifier.notifyError('printing', error, 'qr', { printerName: printer.name })
  }
}

type Option = {
  name: string,
  specs: string | string[]
  replace: boolean
  styles: string[]
}

const defaultOptions: Option = {
  name: '_blank',
  specs: ['fullscreen=yes', 'titlebar=yes', 'scrollbars=yes'],
  replace: true,
  styles: []
}

const replaceImgs = (canvases: HTMLCanvasElement[], showImg: boolean) => {
  canvases.forEach(canvas => {
    const parent = canvas.parentNode
    const img = (parent as ParentNode)?.querySelector('img.hidden') as HTMLImageElement
    img.src = canvas.toDataURL()
    if (showImg) {
      img.classList.remove('hidden')
      canvas.classList.add('hidden')
    } else {
      img.classList.add('hidden')
      canvas.classList.remove('hidden')
    }
  })
}

export const printQRs = async (el: string, localOptions?: Option, cb = () => true): Promise<boolean> => {
  const mergedOptions = {
    ...defaultOptions,
    ...localOptions
  }

  mergedOptions.specs = mergedOptions.specs.length ? (mergedOptions.specs as string[]).join(',') : ''

  const element = document.getElementById(el)

  if (!element) {
    alert(`Element to print #${el} not found!`)
    return false
  }

  const canvases = [...(element.getElementsByTagName('canvas')) as unknown as HTMLCanvasElement[]]

  // const links = [].slice.call(element.getElementsByTagName('a')) as HTMLAnchorElement[]
  // links.forEach(link => link.parentElement?.removeChild(link))

  replaceImgs(canvases, true)
  const url = ''
  const win = window.open(url, mergedOptions.name, mergedOptions.specs)

  const dataUrl = await domtoimage.toPng(element)
  win!.document.write(`
        <html>
          <head>
            <title>${window.document.title}</title>
          </head>
          <style>
          body{
            margin: 0;
          }
          img{
            width: 100vw;
            height:100vh;
            object-fit: contain;
          }
          </style>
          <body>
          <img src=${dataUrl} />
          </body>
        </html>
      `)

  setTimeout(() => {
    win!.document.close()
    // replaceImgs(canvases, false)
    win!.focus()
    win!.print()
    win!.close()
    cb()
  }, 1000)

  return true
}

export const downloadElement = async (el: string, localOptions?: Option, cb = () => true): Promise<boolean> => {
  const element = document.getElementById(el)

  if (!element) {
    alert(`Element to print #${el} not found!`)
    return false
  }

  const canvases = (element.getElementsByTagName('canvas')) as unknown as HTMLCanvasElement[]

  replaceImgs(canvases, true)

  const dataUrl = await domtoimage.toPng(element)
  const link = document.createElement('a')
  link.download = 'TableQr'
  link.href = dataUrl
  link.click()
  return true
}
