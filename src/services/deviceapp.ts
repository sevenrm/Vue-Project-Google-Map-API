import { hybridWebView } from './hybridview'

class DeviceApp {
  exposeFunctions(fns: Record<string, (...args: any[]) => void>) {
    (<any>window).execFromDevice = (fnName: string, args: any[]) => {
      if (fnName === 'log')
        console.log(args)
      else if (fns[fnName])
        fns[fnName](...args)
    }
  }

  addDevice(token: string) {
    hybridWebView.SendInvokeMessageToDotNet('AddDevice', token)
  }

  initDevice(token: string, restaurantId: string) {
    hybridWebView.SendInvokeMessageToDotNet('InitDevice', token, restaurantId)
  }

  logoutDevice() {
    hybridWebView.SendInvokeMessageToDotNet('LogoutDevice')
  }

  notifyPageLoaded() {
    hybridWebView.SendInvokeMessageToDotNet('NotifyPageLoaded')
  }

  ping() {
    hybridWebView.SendInvokeMessageToDotNet('Ping')
  }

  getVersion() {
    hybridWebView.SendInvokeMessageToDotNet('GetVersion')
  }
}

export const deviceApp = new DeviceApp()
