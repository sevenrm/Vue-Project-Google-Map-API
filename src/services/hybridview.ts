// Standard methods for HybridWebView

class HybridWebView {
  SendRawMessageToDotNet(message: string) {
    this.SendMessageToDotNet(0, message)
  }

  SendInvokeMessageToDotNet(methodName: string, ...paramValues: any[]) {
    if (typeof paramValues !== 'undefined') {
      if (!Array.isArray(paramValues)) {
        paramValues = [paramValues]
      }
      for (let i = 0; i < paramValues.length; i++) {
        paramValues[i] = JSON.stringify(paramValues[i])
      }
    }

    this.SendMessageToDotNet(1, JSON.stringify({ MethodName: methodName, ParamValues: paramValues }))
  }

  SendMessageToDotNet(messageType: number, messageContent: any) {
    const win = (<any>window)
    const message = JSON.stringify({ MessageType: messageType, MessageContent: messageContent })

    if (win.chrome && win.chrome.webview) {
      // Windows WebView2
      win?.chrome?.webview?.postMessage(message)
    } else if (win.webkit && win.webkit.messageHandlers && win.webkit.messageHandlers.webwindowinterop) {
      // iOS and MacCatalyst WKWebView
      win.webkit?.messageHandlers?.webwindowinterop?.postMessage(message)
    } else {
      // Android WebView
      win.hybridWebViewHost?.sendMessage(message)
    }
  }
}

export const hybridWebView = new HybridWebView();
(<any>window).hybridWebView = HybridWebView
