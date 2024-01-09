const env = import.meta.env

export const environment = {
  isProduction: env.VITE_IS_PRODUCTION as string === 'true',
  baseDirectory: env.VITE_BASE_DIRECTORY as string,
  baseUrl: env.VITE_BASE_URL as string,
  baseAppUrl: env.VITE_APP_URL,
  tableFormatUrl: '/restaurants/{{restaurantSlug}}/table/{{tableId}}',
  tableShortFormatUrl: '/restaurants/{{restaurantSlug}}/table/{{tableNumber}}',
  // tableShortFormatUrl: '/table/{{tableId}}',
  primaryColor: '#E94E34',
  availableLanguages: ['en', 'fr', 'es', 'de', 'it', 'ct', 'pl'],
  logoUrl: '../src/assets/images/logo-color.png',
  checkoutProdKey: env.VITE_CHECKOUT_PROD_KEY as string ?? '',
  checkoutTestKey: env.VITE_CHECKOUT_TEST_KEY as string ?? '',
  currencies: ['eur', 'gbp', 'usd', 'chf', 'pln'],
  googleMapsApiKey: env.VITE_GOOGLE_MAPS_API_KEY ?? ''
}
