export enum FloorObjectType {
  Rectangle,
  Circle,
  Text
}

export interface FloorObject {
  id: string
  rotation?: number
  type: FloorObjectType
  positionX?: number
  positionY?: number
  width?: number
  height?: number
  colorCode?: string
  text?: string
  textRotation?: number
  fontSize?: number
  isLightText?: boolean
}

export interface FloorConfiguration {
  objects: FloorObject[]
  height?: number
  width?: number
}

export type OrderTableStatus = 'hasPending' | 'accepted' | 'paid' | 'unpaidWarning'