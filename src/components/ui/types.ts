
export interface DropdownItem {
  [key: string]: any
  text: string
  icon?: string
  action?(data?: any): void
  isVisible?(data?: any): boolean
}

export enum ModalSize {
  Small,
  Medium,
  Large,
  Adapt,
  Full
}

export type TableBuilderSupportedTypes =
  'checkbox' |
  'datepicker' |
  'datetimepicker' |
  'boolean' |
  'date' |
  'string' |
  'id' |
  'slot' |
  'currency' |
  'percentage' |
  'image' |
  'icon' |
  'enum' |
  'text' |
  'number' |
  'toggle' |
  'selector' |
  'expander'

export type TableBuilderSingleFieldDefinition<T = any> = {
  type: TableBuilderSupportedTypes | ((item: T) => TableBuilderSupportedTypes);
  name?: string;
  skipTranslation?: boolean;
  iconName?: string;
  enumValue?: T;
  enumName?: string;
  toggleUpdated?: (item: T, val: boolean) => void;
  class?: string;
  columnClass?: string
  iconButtonClass?: string
  columnIf?: () => boolean;
  if?: (item: T) => boolean;
  isChecked?: (item: T) => boolean;
  changeEvt?: (item: T, value: any) => void;
  clicked?: (item: T) => void
  disabled?: (item: T) => boolean
  value?: (item: T) => any
}

export type TableBuilderFieldDefinition<T = any> = Record<string, TableBuilderSingleFieldDefinition<T>>

export type FormBuilderSupportedTypes =
  'multiselect' |
  'editor' |
  'select' |
  'language' |
  'toggle' |
  'checkbox' |
  'radio' |
  'textarea' |
  'date' |
  'datetime' |
  'text' |
  'number' |
  'currency' |
  'percentage' |
  'enum' |
  'enum-multi' |
  'slot' |
  'image' |
  'autocomplete' |
  '3way' |
  'color' |
  'ipaddress'

export type FormBuilderFieldDefinition = {
  type: FormBuilderSupportedTypes;
  prefix?: string | ((model: any) => string);
  name: string;
  class?: string;
  attr?: Record<string, string>,
  propsObject?: (model: any) => Record<string, any>;
  options?: (query?: string) => any[];
  click?: (model: any) => void;
  enumValue?: any;
  enumName?: string;
  hideEmptyOption?: boolean;
  placeholder?: (model: any) => string;
  rules?: any;
  imageDisplayMode?: string;
  optionLabel?: string;
  imageSize?: 'smallest' | 'small' | 'medium' | 'big' | 'large';
  optionValue?: string;
  skipTranslation?: boolean;
  optionIf?: (option: any) => boolean;
  inputEvt?: () => void;
  keydownEvt?: (evt: KeyboardEvent) => void;
  disabled?: (model: any) => boolean;
  if?: (model: any) => boolean;
  size?: 'small' | 'medium' | 'large' | 'auto';
  readonly?: boolean;
}
export type FormBuilderFieldGroupDefinition = Record<string, FormBuilderFieldDefinition | any>
