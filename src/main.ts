import { createApp } from 'vue'
import { router } from './routes'
import { i18nInstance } from './services/i18n'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Popper from 'vue3-popper'
import App from './App.vue'
import Toast, { PluginOptions } from 'vue-toastification'
import VueKonva from 'vue-konva'
import { Cropper } from 'vue-advanced-cropper'
import VuePdf from 'vue3-pdfjs'
import 'vue-advanced-cropper/dist/style.css'
import '@vueform/slider/themes/default.css'
import '@vueform/multiselect/themes/default.css'
import '@mdi/font/css/materialdesignicons.min.css'
import 'vue-toastification/dist/index.css'
import '@vuepic/vue-datepicker/dist/main.css'
import 'flag-icons/css/flag-icons.min.css'
import './style.scss'

createApp(App)
  .use(i18nInstance)
  .use(router)
  .use(VueKonva)
  .use(VuePdf)
  .use(Toast, {
    timeout: 2000
  })
  .component('Cropper', Cropper)
  .component('Popper', Popper)
  .mount('#app')
