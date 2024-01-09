class DateFormatter {
  public date(value: Date, separator = '/') {
    return `${value.getDate().toString().padStart(2, '0')}${separator}${(value.getMonth() + 1).toString().padStart(2, '0')}${separator}${value.getFullYear().toString().slice(2)}`
  }

  public time(value: Date, separator = ':', includeSeconds = true) {
    return `${value.getHours().toString().padStart(2, '0')}${separator}${value.getMinutes().toString().padStart(2, '0')}${includeSeconds ? separator : ''}${includeSeconds ? value.getSeconds().toString().padStart(2, '0') : ''}`
  }

  public datetime(value: Date, parse?: boolean, separator = ' ', dateSeparator?: string, timeSepartor?: string) {
    if (parse) value = new Date(value as any)
    return `${this.date(value, dateSeparator)}${separator}${this.time(value, timeSepartor)}`
  }
}

export const dateFormatter = new DateFormatter()
