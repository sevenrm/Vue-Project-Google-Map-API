<script lang="ts" setup>
import { nameof } from 'ts-simple-nameof'
import { useForm } from 'vee-validate'
import { PropType, ref, watch } from 'vue'
import { string } from 'yup'
import { CountryEnum, PersonViewModel } from '../../services/api.client'
import Address from '../../components/shared/Address.vue'
import { FormBuilderFieldGroupDefinition } from '../../components/ui/types'
import Collapse from '../ui/Collapse.vue'
import FormBuilder from '../ui/FormBuilder.vue'

const emits = defineEmits([
  'update:modelValue', 'update:validation'
])
const props = defineProps({
  isLoading: {
    type: Boolean,
    required: true
  },
  modelValue: {
    type: Object as PropType<PersonViewModel | undefined>,
    required: true
  }
})
const modelValueLocal = ref(props.modelValue)
watch(() => props.modelValue, () => modelValueLocal.value = props.modelValue)
const form = useForm()

const personFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<PersonViewModel>(m => m.firstName)]: {
      type: 'text',
      name: '@',
      rules: string().required()
    },
    [nameof<PersonViewModel>(m => m.middleName)]: {
      type: 'text',
      name: '@'
    },
    [nameof<PersonViewModel>(m => m.lastName)]: {
      type: 'text',
      name: '@'
    },
    [nameof<PersonViewModel>(m => m.mobilePhoneNumber)]: {
      type: 'text',
      name: '@'
    },
    [nameof<PersonViewModel>(m => m.email)]: {
      type: 'text',
      name: '@'
    },
    [nameof<PersonViewModel>(m => m.countryOfBirthId)]: {
      type: 'enum',
      name: 'country',
      enumValue: CountryEnum,
      skipTranslation: true
    }
  } as FormBuilderFieldGroupDefinition
])
const isAddressValid = ref(false)
const validateForm = async () => {
  const { valid } = await form.validate()
  emits('update:validation', isAddressValid.value && valid)
}
</script>
<template>
  <div class="flex flex-col">
    <div class="flex mx-3">
      <FormBuilder :is-loading="isLoading" v-model="modelValueLocal"
        @update:model-value="$emit('update:modelValue', modelValueLocal)" :fields-groups="personFieldsGroups"
        @changed="validateForm"></FormBuilder>
    </div>
    <Collapse title="address">
      <div class="mx-3">
        <Address :is-loading="isLoading" v-model="modelValueLocal!.address"
          @update:model-value="$emit('update:modelValue', modelValueLocal)"
          @update:validation="isAddressValid = $event" />
      </div>
    </Collapse>
  </div>
</template>
