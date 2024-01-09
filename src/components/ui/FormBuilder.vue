<script lang="ts" setup>
import { PropType } from 'vue'
import Toggle from './Toggle.vue'
import Multiselect from '@vueform/multiselect'
import UploadImage from './UploadImage.vue'
import { numberFormatter } from '../../services/number.formatter'
import { Field, ErrorMessage } from 'vee-validate'
import { enumToArray } from '../../services/utils'
import Datepicker from '@vuepic/vue-datepicker'
import SimpleSpinner from './SimpleSpinner.vue'
import ColorPickerPopover from './ColorPickerPopover.vue'
import { FormBuilderFieldDefinition, FormBuilderFieldGroupDefinition } from '../../components/ui/types'
import IpAddressInput from './IpAddressInput.vue'
import { dateFormatter } from '../../services/date.formatter'
import TinyMceEditor from './TinyMceEditor.vue'

const props = defineProps({
  readonly: Boolean,
  fieldsGroups: {
    type: Array as PropType<FormBuilderFieldGroupDefinition[]>,
    required: true
  },
  modelValue: {
    type: Object as PropType<any>,
    required: true
  },
  isLoading: {
    type: Boolean,
    required: true
  },
  displayAsColumn: Boolean
})

defineEmits(['update:modelValue', 'changed'])

const getPropObject = (propName: string, obj: any, definition: any): any => {
  if (propName.includes('.')) {
    const currentPropName = propName.split('.')[0]
    let nextObj
    if (currentPropName.indexOf('[') > -1) {
      nextObj = obj[currentPropName.split('[')[0]]
      let variableName = currentPropName.split('[')[1]
      variableName = variableName.split(']')[0]
      nextObj = nextObj[definition.propsObject()[variableName]]
    } else {
      nextObj = obj[currentPropName]
    }
    return getPropObject(propName.split('.').slice(1).join('.'), nextObj, definition)
  } else if (propName.indexOf('[') > -1) {
    const currentPropName = propName.split('[')[0]
    let nextObj = obj[currentPropName]
    let variableName = currentPropName.split('[')[1]
    variableName = variableName.split(']')[0]
    nextObj = nextObj[definition.propsObject()[variableName]]
  }
  return obj
}

const getFinalPropName = (propName: string): string => {
  return propName.split('.').reverse()[0]
}

const getGroupClasses = (group: any) => {
  return group['[class]'] ? group['[class]'] : `${props.displayAsColumn ? 'flex flex-col gap-1' : ''} ${!props.displayAsColumn ? 'grid grid-cols-2 gap-2 w-full' : ''}`
}

const keyValueEnumArray = (def: FormBuilderFieldDefinition) => enumToArray(def.enumValue).map(e => ({ key: def.skipTranslation ? e : `${def.enumName}.${e}`, value: def.enumValue[e as string] }))

const getDateTimeFormat = (def: FormBuilderFieldDefinition) => {
  if (def.type === 'date')
    return 'dd/MM/yyyy'
  else
    return 'HH:mm dd/MM/yyyy'
}

const noop = () => { }
</script>
<template>
  <div v-for="(group, groupIdx) of fieldsGroups" :key="groupIdx" :class="getGroupClasses(group)">
    <template v-for="(def, fieldName) of group" :key="fieldName">
      <label class="form-label" :class="{ 'w-full': displayAsColumn, 'custom-input': def.type === 'ipaddress' }"
        @click="!def.disabled?.(modelValue) && !!def.click ? def.click(modelValue) : noop()"
        v-if="fieldName !== '[class]' && (def.if?.(modelValue) ?? true)">
        <span v-if="def.name">{{ $tc(def.name === '@' ? getFinalPropName(fieldName) : def.name) }}</span>
        <span v-else></span>
        <template v-if="!readonly && !def.readonly && def.type !== 'slot'">
          <div :class="def.prefix || ['currency', 'percentage'].includes(def.type) ? 'relative' : ''">
            <div :class="def.prefix || ['currency', 'percentage'].includes(def.type) ? 'prefix' : ''">
              <template v-if="def.prefix || ['currency', 'percentage'].includes(def.type)">
                <span v-if="def.type === 'currency'">{{ numberFormatter.currencySymbol }}</span>
                <span v-else-if="def.type === 'percentage'">%</span>
                <span v-else-if="(typeof def.prefix === 'string')">{{ def.prefix }}</span>
                <span v-else-if="(typeof def.prefix === 'function')">{{ def.prefix(modelValue) }}</span>
              </template>
              <template v-if="['text', 'email'].includes(def.type)">
                <Field @keydown="def.keydownEvt ? def.keydownEvt($event) : noop()" :rules="def.rules"
                  :label="$tc(def.name === '@' ? getFinalPropName(fieldName) : def.name)"
                  :name="getFinalPropName(fieldName)" :class="def.class" v-bind="def.attr ?? {}"
                  :type="['currency', 'percentage'].includes(def.type) ? 'number' : def.type"
                  @input="def.inputEvt ?? noop"
                  @update:model-value="() => { $emit('update:modelValue', modelValue); $emit('changed', getFinalPropName(fieldName)); def?.inputEvt ? def.inputEvt() : noop() }"
                  v-model="getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]"
                  :placeholder="!!def.placeholder ? def.placeholder(modelValue) : ''"
                  :disabled="def.disabled?.(modelValue) ?? false">
                </Field>
              </template>
              <template v-if="['number', 'currency', 'percentage'].includes(def.type)">
                <Field @keydown="def.keydownEvt ? def.keydownEvt($event) : noop()" :rules="def.rules"
                  :label="$tc(def.name === '@' ? getFinalPropName(fieldName) : def.name)"
                  :name="getFinalPropName(fieldName)" :class="def.class" v-bind="def.attr ?? {}"
                  :type="['currency', 'percentage'].includes(def.type) ? 'number' : def.type"
                  @input="def.inputEvt ?? noop"
                  @update:model-value="() => { $emit('update:modelValue', modelValue); $emit('changed', getFinalPropName(fieldName)); def?.inputEvt ? def.inputEvt() : noop() }"
                  v-model.number="getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]"
                  :placeholder="!!def.placeholder ? def.placeholder(modelValue) : ''"
                  :disabled="def.disabled?.(modelValue) ?? false">
                </Field>
              </template>
              <template v-else-if="def.type === 'editor'">
                <Field :rules="def.rules" :label="$tc(def.name === '@' ? getFinalPropName(fieldName) : def.name)"
                  v-model="getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]"
                  :name="getFinalPropName(fieldName)"
                  @update:model-value="() => { $emit('update:modelValue', modelValue); $emit('changed', getFinalPropName(fieldName)) }"
                  v-slot="{ field, handleChange }">
                  <TinyMceEditor :model-value="(field.value as any)" @update:model-value="handleChange"></TinyMceEditor>
                </Field>
              </template>
              <template v-else-if="def.type === 'ipaddress'">
                <Field :rules="def.rules" :label="$tc(def.name === '@' ? getFinalPropName(fieldName) : def.name)"
                  v-model="getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]"
                  :name="getFinalPropName(fieldName)"
                  @update:model-value="() => { $emit('update:modelValue', modelValue); $emit('changed', getFinalPropName(fieldName)) }"
                  v-slot="{ field, handleChange }">
                  <IpAddressInput :show-port="true" :model-value="(field.value as any)"
                    @update:model-value="handleChange">
                  </IpAddressInput>
                </Field>
              </template>
              <template v-else-if="def.type === '3way'">
                <Field :rules="def.rules" :label="$tc(def.name === '@' ? getFinalPropName(fieldName) : def.name)"
                  as="select" :name="getFinalPropName(fieldName)"
                  @update:model-value="() => { $emit('update:modelValue', modelValue); $emit('changed', getFinalPropName(fieldName)) }"
                  v-model="getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]">
                  <option :value="undefined">{{ $tc('all') }}</option>
                  <option :value="true">{{ $tc('yes') }}</option>
                  <option :value="false">{{ $tc('no') }}</option>
                </Field>
              </template>
              <template v-else-if="def.type === 'date' || def.type === 'datetime'">
                <Field :rules="def.rules" :label="$tc(def.name === '@' ? getFinalPropName(fieldName) : def.name)"
                  v-model="getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]"
                  :name="getFinalPropName(fieldName)"
                  @update:model-value="() => { $emit('update:modelValue', modelValue); $emit('changed', getFinalPropName(fieldName)) }"
                  v-slot="{ field, handleChange }">
                  <Datepicker :model-value="(field.value as any)" @update:model-value="handleChange"
                    :enableTimePicker="def.type === 'datetime'" :auto-apply="true" :format="getDateTimeFormat(def)"
                    :disabled="def.disabled?.(modelValue) ?? false">
                  </Datepicker>
                </Field>
              </template>
              <template v-else-if="def.type === 'textarea'">
                <Field :rules="def.rules" :label="$tc(def.name === '@' ? getFinalPropName(fieldName) : def.name)"
                  :name="getFinalPropName(fieldName)" as="textarea"
                  @update:model-value="() => { $emit('update:modelValue', modelValue); $emit('changed', getFinalPropName(fieldName)) }"
                  :class="def.class" @input="def.inputEvt ?? noop"
                  :placeholder="!!def.placeholder ? def.placeholder(modelValue) : ''"
                  v-model="getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]"
                  :disabled="def.disabled?.(modelValue) ?? false" />
              </template>
              <template v-else-if="def.type === 'toggle'">
                <!-- <Field :rules="def.rules" :label="$tc(def.name === '@' ? getFinalPropName(fieldName) : def.name)"
                  v-model="getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]"
                  :name="getFinalPropName(fieldName)"
                  @update:model-value="$emit('update:modelValue', modelValue); $emit('changed', getFinalPropName(fieldName))"
                  v-slot="{ field, handleChange }">
                  <Toggle :model-value="field.value as boolean" @update:model-value="handleChange"
                    @click="$event.stopPropagation()" :class="def.class"
                    :disabled="def.disabled?.(modelValue) ?? false" />
                </Field> -->
                <Toggle v-model="getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]"
                  @click="$event.stopPropagation()" :class="def.class" :disabled="def.disabled?.(modelValue) ?? false" />
              </template>
              <template v-else-if="def.type === 'enum'">
                <Field :rules="def.rules" :label="$tc(def.name === '@' ? getFinalPropName(fieldName) : def.name)"
                  :name="getFinalPropName(fieldName)" as="select"
                  @update:model-value="() => { $emit('update:modelValue', modelValue); $emit('changed', getFinalPropName(fieldName)) }"
                  :class="def.class" v-model="getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]"
                  :disabled="def.disabled?.(modelValue) ?? false">
                  <option :value="undefined" v-if="!def.hideEmptyOption"></option>
                  <template v-for="option of enumToArray(def.enumValue)" :key="option[def.optionValue!]">
                    <option :value="def.enumValue[option as string]" v-if="!def.optionIf || def.optionIf(option)">
                      <template v-if="def.skipTranslation">
                        {{ option }}
                      </template>
                      <template v-else>
                        {{ $tc(`${def.enumName}.${option}`) }}
                      </template>
                    </option>
                  </template>
                </Field>
              </template>
              <template v-else-if="def.type === 'select'">
                <Field :rules="def.rules" :label="$tc(def.name === '@' ? getFinalPropName(fieldName) : def.name)"
                  as="select" :name="getFinalPropName(fieldName)"
                  @update:model-value="() => { $emit('update:modelValue', modelValue); $emit('changed', getFinalPropName(fieldName)) }"
                  :class="def.class" v-model="getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]"
                  :disabled="def.disabled?.(modelValue) ?? false">
                  <template v-for="option of def.options!()" :key="option[def.optionValue!]">
                    <option :value="def.optionValue ? option[def.optionValue!] : option"
                      v-if="!def.optionIf || def.optionIf(option)">
                      {{ def.optionLabel ? option[def.optionLabel!] : option }}
                    </option>
                  </template>
                </Field>
              </template>
              <template v-else-if="def.type === 'enum-multi'">
                <Field :rules="def.rules" :label="$tc(def.name === '@' ? getFinalPropName(fieldName) : def.name)"
                  v-model="getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]"
                  :name="getFinalPropName(fieldName)"
                  @update:model-value="() => { $emit('update:modelValue', modelValue); $emit('changed', getFinalPropName(fieldName)) }"
                  v-slot="{ field, handleChange }">
                  <Multiselect :model-value="field.value" @update:model-value="handleChange" mode="multiple"
                    :close-on-select="true" :options="keyValueEnumArray(def)" value-prop="value" label="key">
                  </Multiselect>
                </Field>
              </template>
              <template v-else-if="def.type === 'multiselect'">
                <Field :rules="def.rules" :label="$tc(def.name === '@' ? getFinalPropName(fieldName) : def.name)"
                  v-model="getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]"
                  :name="getFinalPropName(fieldName)"
                  @update:model-value="() => { $emit('update:modelValue', modelValue); $emit('changed', getFinalPropName(fieldName)) }"
                  v-slot="{ field, handleChange }">
                  <Multiselect :model-value="field.value" @update:model-value="handleChange" mode="multiple"
                    :close-on-select="true" :options="def.options!()" :value-prop="def.optionValue"
                    :label="def.optionLabel">
                  </Multiselect>
                </Field>
              </template>
              <template v-else-if="def.type === 'autocomplete'">
                <Field :rules="def.rules" :label="$tc(def.name === '@' ? getFinalPropName(fieldName) : def.name)"
                  v-model="getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]"
                  :name="getFinalPropName(fieldName)"
                  @update:model-value="() => { $emit('update:modelValue', modelValue); $emit('changed', getFinalPropName(fieldName)) }"
                  v-slot="{ field, handleChange }">
                  <Multiselect :model-value="field.value" @update:model-value="handleChange" mode="single"
                    :close-on-select="true" :filter-results="false" :min-chars="3" :resolve-on-load="true" :limit="10"
                    :clear-on-search="true" :delay="5" :searchable="true" :options="def.options"
                    @open="(select$: any) => { if (select$?.noOptions) { select$.resolveOptions() } }" />
                </Field>
              </template>
              <template v-else-if="def.type === 'language'">
                <Field :rules="def.rules" :label="$tc(def.name === '@' ? getFinalPropName(fieldName) : def.name)"
                  v-model="getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]"
                  :name="getFinalPropName(fieldName)"
                  @update:model-value="() => { $emit('update:modelValue', modelValue); $emit('changed', getFinalPropName(fieldName)) }"
                  v-slot="{ field, handleChange }">
                  <Multiselect :model-value="field.value" @update:model-value="handleChange" mode="single"
                    :close-on-select="true" :options="$i18n.availableLocales">
                    <template v-slot:singlelabel="{ value }">
                      <div class="flex-1">
                        <span class="fi mr-2 rounded" :class="['fi-' + value.value]"></span>
                        <span>{{ value.value }}</span>
                      </div>
                    </template>
                    <template v-slot:option="{ option }">
                      <span class="fi mr-2 rounded" :class="['fi-' + option.label]"></span>
                      <span>{{ option.value }}</span>
                    </template>
                  </Multiselect>
                </Field>
              </template>
              <template v-else-if="def.type === 'image'">
                <Field :rules="def.rules" :label="$tc(def.name === '@' ? getFinalPropName(fieldName) : def.name)"
                  v-model="getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]"
                  :name="getFinalPropName(fieldName)"
                  @update:model-value="() => { $emit('update:modelValue', modelValue); $emit('changed', getFinalPropName(fieldName)) }"
                  v-slot="{ field, handleChange }">
                  <UploadImage :model-value="(field.value as any)" @update:model-value="handleChange"
                    :size="def.imageSize ?? 'medium'" :display-mode="def.imageDisplayMode" />
                </Field>
              </template>
              <template v-else-if="def.type === 'color'">
                <Field :rules="def.rules" :label="$tc(def.name === '@' ? getFinalPropName(fieldName) : def.name)"
                  v-model="getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]"
                  :name="getFinalPropName(fieldName)"
                  @update:model-value="() => { $emit('update:modelValue', modelValue); $emit('changed', getFinalPropName(fieldName)) }"
                  v-slot="{ field, handleChange }">
                  <ColorPickerPopover :model-value="(field.value as any)" @update:model-value="handleChange">
                  </ColorPickerPopover>
                </Field>
              </template>
            </div>
          </div>
          <ErrorMessage :name="getFinalPropName(fieldName)" />
        </template>
        <template v-else>
          <template v-if="!isLoading">
            <slot v-if="def.type === 'slot'" :name="fieldName" :item="modelValue"></slot>
            <template v-else>
              <span :class="def.class ?? ''" v-if="modelValue">
                <template v-if="def.type === 'enum'">
                  <template v-if="def.skipTranslation">
                    {{ def.enumValue[getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]] }}
                  </template>
                  <template v-else>
                    {{ $tc(def.enumValue[getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]]) }}
                  </template>
                </template>
                <template v-else>
                  <span class="font-semibold" v-if="def.type === 'currency'">{{
                    numberFormatter.currency(getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)])
                  }}</span>
                  <template v-else-if="def.prefix || def.type === 'percentage'">
                    <span v-if="def.type === 'percentage'">%</span>
                    <span v-else-if="(typeof def.prefix === 'string')">{{ def.prefix }}</span>
                    <span v-else-if="(typeof def.prefix === 'function')">{{ def.prefix(modelValue) }}</span>
                    {{ getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)] }}
                  </template>
                  <template v-else-if="def.type === 'date'">
                    {{ dateFormatter.datetime(getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)]) }}
                  </template>
                  <template v-else>
                    {{ getPropObject(fieldName, modelValue, def)[getFinalPropName(fieldName)] }}
                  </template>
                </template>
              </span>
            </template>
          </template>
          <SimpleSpinner v-else></SimpleSpinner>
        </template>
      </label>
    </template>
  </div>
</template>
