import { computed, ref } from 'vue'
import { RouteLocationNormalized } from 'vue-router'
import { nameof } from 'ts-simple-nameof'

// Helper
const stringIsNumber = (value: string | number): boolean => isNaN(Number(value)) === false

// Turn enum into array
export function enumToArray<T>(enumerator: Record<string, unknown>): T[] {
  return Object.keys(enumerator)
    .filter(stringIsNumber)
    .map(key => enumerator[key]) as unknown as T[]
}

export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}

export function getPages(currentPage: number, totalPages = 0): number[] {
  const maxPageShown = 5 // must be an odd number
  const surroundingPages = (maxPageShown - 1) / 2
  if (currentPage <= surroundingPages)
    return [...Array(maxPageShown)].map((_, i) => i).slice(0, Math.min(totalPages, maxPageShown))
  else if (currentPage >= totalPages - surroundingPages)
    return [...Array(maxPageShown)].map((_, i) => totalPages - i - 1).slice(0, Math.min(totalPages, maxPageShown)).reverse()
  else
    return [
      ...[...Array(surroundingPages)].map((_, i) => currentPage - i - 1).reverse(),
      currentPage,
      ...[...Array(surroundingPages)].map((_, i) => currentPage + i + 1)
    ].slice(0, Math.min(totalPages, maxPageShown))
  // const pagesAhead = totalPages - currentPage
  // let ret: number[] = []
  // if (currentPage < surroundingPages + 1)
  //   ret = [...Array(currentPage).keys(), ...[...Array(pagesAhead).keys()].map(i => currentPage + i)].slice(0, maxPageShown)
  // else if (currentPage >= totalPages - surroundingPages)
  //   ret = [...Array(maxPageShown).keys()].map(i => totalPages - i - 1).reverse()
  // else
  //   ret = [...[...Array(surroundingPages).keys()].map(i => currentPage - i - 1).reverse(), currentPage, ...[...Array(surroundingPages).keys()].map(i => currentPage + i + 1)]
  // return ret;
}

export const isActive = (route: RouteLocationNormalized, r?: string, contains?: boolean): boolean => contains ? route.path.startsWith(r as any) : route.path === r

// Function to download data to a file
export const download = (data: any, filename: string, type: string): void => {
  const file = new Blob([data], { type })
  if ((<any>window.navigator).msSaveOrOpenBlob) // IE10+
    (<any>window.navigator).msSaveOrOpenBlob(file, filename)
  else { // Others
    const a = document.createElement('a')
    const url = URL.createObjectURL(file)
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    setTimeout(function () {
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    }, 0)
  }
}

export const toCsv = (data: any[], columns: string[], separator = ','): string => {
  const heading = columns.join(separator)
  const body = data.reduce((v, o) => `${v}${columns.map(c => o[c]).join(separator)}\n`, '')
  return `${heading}\n${body}`
}

export const shallowIsSameObject = (obj1: Record<any, any>, obj2: Record<any, any>) => JSON.stringify(obj1) === JSON.stringify(obj2)
export const slugify = (str: string) => str.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/ /g, '-').toLowerCase()

export const isFullscreen = ref(false)

export const windowHeight = ref(window.innerHeight)
export const pageContentHeight = computed(() => windowHeight.value - (!isFullscreen.value ? 69 : 5))
export const pageContentHeightPx = computed(() => pageContentHeight.value + 'px')

export const windowWidth = ref(window.innerWidth)
export const pageContentWidth = computed(() => windowWidth.value - 20)
export const pageContentWidthPx = computed(() => pageContentWidth.value + 'px')

export const isMobile = computed(() => windowWidth.value < 768)

window.onresize = () => {
  windowHeight.value = window.innerHeight
  windowWidth.value = window.innerWidth
}

export const getVariableName = (variableFunction: () => any) => {
  return nameof(variableFunction).replace(/ /g, '').replace('()=>', '')
}
