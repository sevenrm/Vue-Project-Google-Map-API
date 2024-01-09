class NumberFormatter {
  private _currency = {
    // default fallback for currency locale
    locale: navigator.language ?? navigator.languages[0] ?? 'en-GB',
    name: 'EUR',
    symbol: '€'
  }

  private getCurrencySymbolByCode(code: string) {
    switch (code.toLowerCase()) {
      case 'eur':
        return '€'
      case 'gbp':
        return '£'
      case 'chf':
        return 'Fr.'
      case 'usd':
        return '$'
      case 'pln':
        return 'zł'
    }
  }

  public setCurrency(currencyName: string) {
    this._currency.name = currencyName.toUpperCase()
    this._currency.symbol = (0).toLocaleString(this._currency.locale, {
      style: 'currency',
      currency: this._currency.name,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).replace(/\d/g, '').trim()
  }

  public get currencySymbol() {
    return this._currency.symbol
  }

  public currency(value: number, currency?: string) {
    // if (value === 0)
    //   return 'Free!'

    const options = { style: 'currency', currency: this._currency.name, currencyDisplay: 'narrowSymbol' }
    try {
      return new Intl.NumberFormat(this._currency.locale, options).format(value)
    } catch (err) {
      options.currencyDisplay = 'symbol'
      return new Intl.NumberFormat(this._currency.locale, options).format(value)
    }
  }
}

export const numberFormatter = new NumberFormatter()
