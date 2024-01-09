<script lang="ts" setup>
import { nameof } from 'ts-simple-nameof'
import { useForm } from 'vee-validate'
import { PropType, ref } from 'vue'
import { number } from 'yup'
import { AddressViewModel, CountryEnum } from '../../services/api.client'
import { FormBuilderFieldGroupDefinition } from '../../components/ui/types'
import FormBuilder from '../ui/FormBuilder.vue'

const emits = defineEmits(['update:modelValue', 'update:validation'])
const props = defineProps({
  modelValue: {
    type: Object as PropType<AddressViewModel | undefined>,
    required: true
  },
  isLoading: {
    type: Boolean,
    required: true
  }
})

const form = useForm()

const addressFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    '[class]': 'grid grid-cols-3 gap-2',
    [nameof<AddressViewModel>(m => m.addressLine1)]: {
      type: 'text',
      name: '@'
    },
    [nameof<AddressViewModel>(m => m.addressLine2)]: {
      type: 'text',
      name: '@'
    },
    [nameof<AddressViewModel>(m => m.postalCode)]: {
      type: 'text',
      name: '@'
    }
  } as FormBuilderFieldGroupDefinition, {
    '[class]': 'grid grid-cols-3 gap-2',
    [nameof<AddressViewModel>(m => m.city)]: {
      type: 'text',
      name: '@'
    },
    [nameof<AddressViewModel>(m => m.state)]: {
      type: 'text',
      name: '@'
    },
    [nameof<AddressViewModel>(m => m.countryId)]: {
      type: 'enum',
      name: 'country',
      rules: number().required(),
      enumValue: CountryEnum,
      skipTranslation: true
    }
  } as FormBuilderFieldGroupDefinition
])

const validate = async () => {
  const { valid } = await form.validate()
  emits('update:validation', valid)
}

</script>
<template>
  <FormBuilder @changed="validate" :is-loading="isLoading" :fields-groups="addressFieldsGroups"
    :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
  </FormBuilder>
</template>
