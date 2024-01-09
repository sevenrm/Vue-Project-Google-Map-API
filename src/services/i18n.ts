import { createI18n } from 'vue-i18n';

import en from '../locales/en.json';
import es from '../locales/es.json';
import it from '../locales/it.json';

const messages = {
  en,
  es,
  it
}

// Change here if locale and fallback should be setup from BE
export const i18nInstance = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages
})
