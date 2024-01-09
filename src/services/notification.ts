import { i18nInstance } from './i18n'
import { TYPE, useToast } from 'vue-toastification'
import type { ToastID, ToastOptions } from 'vue-toastification/dist/types/types'

type ToastOptionError = (ToastOptions & { type?: TYPE.ERROR })
type ToastOptionSuccess = (ToastOptions & { type?: TYPE.SUCCESS })

class Notifier {
  private toast = useToast()

  notifyError(msgKey: string, err?: Error, entityName?: string, params?: any, toastOptions?: ToastOptionError): ToastID {
    // error?.response?.message ?? error.message
    console.error(msgKey, err, entityName, params)
    const translatedEntity = entityName ? i18nInstance.global.t(`entity.${entityName}`) : ''
    let translatedMessageError = (err as any)?.response?.message ?? err?.message ?? ''
    if (translatedMessageError)
      translatedMessageError = `- ${translatedMessageError}`
    return this.toast.error(i18nInstance.global.t(`error.${msgKey}${translatedMessageError}`, { entityName: translatedEntity, ...(params ?? {}) }), toastOptions)
  }

  notifySuccess(msgKey: string, entityName?: string, params?: any, toastOptions?: ToastOptionSuccess) {
    const translatedEntity = i18nInstance.global.t(`entity.${entityName}`)
    return this.toast.success(i18nInstance.global.t(`success.${msgKey}`, { entityName: translatedEntity, ...(params ?? {}) }))
  }

  notifyInfo(msgKey: string, params?: any) {
    return this.toast.info(i18nInstance.global.t(`info.${msgKey}`, { ...(params ?? {}) }))
  }
}

export const notifier = new Notifier()
