<script lang="ts" setup>
import { PropType } from 'vue'

const props = defineProps({
  items: {
    type: Array as PropType<any[]>,
    required: true
  },
  modelValue: {
    type: Array as PropType<any>,
    required: true
  },
  labelProp: String,
  valueProp: String,
  hideAllToggle: Boolean,
  skipTranslation: Boolean,
  exclusive: Boolean
})

const emits = defineEmits(['update:modelValue'])

const toggleItem = (item: any) => {
  const idx = props.modelValue.indexOf(props.valueProp ? item[props.valueProp] : item)
  const updatedArr = props.modelValue
  if (idx > -1)
    updatedArr.splice(idx, 1)
  else
    updatedArr.push(props.valueProp ? item[props.valueProp] : item)
  emits('update:modelValue', updatedArr)
}

const toggleAll = () => {
  if (props.modelValue.length === props.items.length)
    emits('update:modelValue', [])
  else
    emits('update:modelValue', props.items.map(i => props.valueProp ? i[props.valueProp] : i))
}
</script>
<template>
  <div style="min-width: 160px;"
    class="overflow-y-auto text-base list-none rounded-default divide-y divide-gray-100 shadow-default bg-white">
    <ul class="py-1" aria-labelledby="dropdownButton">
      <template v-if="!hideAllToggle">
        <li v-if="!exclusive"
          class="flex border-b border-b-100 cursor-pointer px-2 py-1 text-base hover:text-red-pnp font-medium hover:bg-gray-100 transition-colors duration-150">
          <label class="form-label row items-center">
            <input type="checkbox" class="form-checkbox" @change="toggleAll"
              :checked="modelValue.length === items.length" />
            <span class="ml-2 cursor-pointer">{{ $tc('all') }}</span>
          </label>
        </li>
        <li v-else
          class="flex border-b border-b-100 cursor-pointer px-2 py-1 text-base hover:text-red-pnp font-medium hover:bg-gray-100 transition-colors duration-150">
          <label class="form-label row items-center">
            <input type="checkbox" :disabled="modelValue.length === 0" class="form-checkbox"
              @change="$emit('update:modelValue', [])" :checked="!modelValue.length" />
            <span class="ml-2 cursor-pointer">{{ $tc('all') }}</span>
          </label>
        </li>
      </template>
      <li v-for="item in items" :key="valueProp ? item[valueProp] : item"
        class="flex cursor-pointer px-2 py-1 text-base hover:text-red-pnp font-medium hover:bg-gray-100 transition-colors duration-150">
        <label class="form-label row items-center">
          <input type="checkbox" @change="toggleItem(item)" class="form-checkbox"
            :checked="modelValue.includes(valueProp ? item[valueProp] : item)" />
          <span class="ml-2 cursor-pointer">
            <template v-if="skipTranslation">{{ labelProp? item[labelProp]: item }}</template>
            <template v-else>{{ $tc(labelProp? item[labelProp]: item) }}</template>
          </span>
        </label>
      </li>
    </ul>
  </div>
</template>
