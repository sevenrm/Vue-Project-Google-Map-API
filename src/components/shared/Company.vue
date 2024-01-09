<script lang="ts" setup>
import { nameof } from 'ts-simple-nameof'
import { useForm } from 'vee-validate'
import { PropType, ref, watch } from 'vue'
import { AddressViewModel, CompanyViewModel } from '../../services/api.client'
import Collapse from '../ui/Collapse.vue'
import FormBuilder from '../ui/FormBuilder.vue'
import Toggle from '../ui/Toggle.vue'
import { FormBuilderFieldGroupDefinition } from '../ui/types'
import Address from './Address.vue'

const emits = defineEmits(['update:modelValue', 'update:validation'])
const props = defineProps({
  modelValue: {
    type: Object as PropType<CompanyViewModel>,
    required: true
  },
  isLoading: {
    type: Boolean,
    required: true
  }
})

const modelValueLocal = ref(props.modelValue)
watch(() => props.modelValue, () => modelValueLocal.value = props.modelValue)

const form = useForm()

const validate = async () => {
  const { valid } = await form.validate()
  emits('update:validation', valid)
}

const companyFieldGroupsDefinition = ref([
  {
    '[class]': 'grid grid-cols-3 gap-2',
    [nameof<CompanyViewModel>(m => m.registrationNumber)]: {
      type: 'text',
      name: '@'
    },
    [nameof<CompanyViewModel>(m => m.legalName)]: {
      type: 'text',
      name: '@'
    },
    [nameof<CompanyViewModel>(m => m.tradingName)]: {
      type: 'text',
      name: '@'
    }
  } as FormBuilderFieldGroupDefinition,
  {
    [nameof<CompanyViewModel>(m => m.phoneNumber)]: {
      type: 'text',
      name: '@'
    },
    [nameof<CompanyViewModel>(m => m.emailAddress)]: {
      type: 'text',
      name: '@'
    }
  } as FormBuilderFieldGroupDefinition
])

const componentsForms = ref({
  registeredAddress: true,
  principalAddress: true
})

const togglePrincipalAddress = () => {
  modelValueLocal.value!.principalAddress = modelValueLocal.value!.principalAddress == null ? new AddressViewModel() : undefined
}

</script>
<template>
  <div>
    <div class="p-3">
      <FormBuilder @changed="validate" :is-loading="isLoading" :fields-groups="companyFieldGroupsDefinition"
        :model-value="modelValueLocal" @update:model-value="$emit('update:modelValue', modelValueLocal)">
      </FormBuilder>
    </div>
    <Collapse title="registeredAddress">
      <div class="p-3">
        <Address @update:validation="componentsForms.registeredAddress = $event" :is-loading="isLoading"
          v-model="modelValueLocal.registeredAddress" @update:model-value="$emit('update:modelValue', modelValueLocal)" />
      </div>
    </Collapse>
    <Collapse title="principalAddress" :is-last="true">
      <div class="p-3">
        <div class="form-label row">
          <Toggle :model-value="!modelValueLocal.principalAddress" @update:model-value="togglePrincipalAddress()" />
          <span>{{ $tc('asRegisteredAddress') }}
          </span>
        </div>
        <div v-if="modelValue.principalAddress">
          <Address @update:validation="componentsForms.principalAddress = $event" :is-loading="isLoading"
            v-model="modelValueLocal.principalAddress"
            @update:model-value="$emit('update:modelValue', modelValueLocal)" />
        </div>
      </div>
    </Collapse>
  </div>
</template>
