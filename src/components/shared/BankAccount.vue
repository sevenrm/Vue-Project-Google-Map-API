<script lang="ts" setup>
import { PropType, ref, watch } from 'vue'
import { BankAccountHolderViewModel, BankAccountTypeEnum, BankAccountViewModel, CountryEnum } from '../../services/api.client'
import Person from './Person.vue'
import Address from './Address.vue'
import { nameof } from 'ts-simple-nameof'
import FormBuilder from '../ui/FormBuilder.vue'
import Collapse from '../ui/Collapse.vue'
import { FormBuilderFieldGroupDefinition } from '../../components/ui/types'

defineEmits([
  'update:modelValue', 'change'
])
const props = defineProps({
  modelValue: {
    type: Object as PropType<BankAccountViewModel>,
    required: true
  },
  isLoading: {
    type: Boolean,
    required: true
  }
})

const modelValueLocal = ref(props.modelValue)
watch(() => props.modelValue, () => modelValueLocal.value = props.modelValue)

const bankAccountFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<BankAccountViewModel>(m => m.accountNumber)]: {
      type: 'text',
      name: '@'
    },
    [nameof<BankAccountViewModel>(m => m.bankCode)]: {
      type: 'text',
      name: '@'
    },
    [nameof<BankAccountViewModel>(m => m.branchCode)]: {
      type: 'text',
      name: '@'
    },
    [nameof<BankAccountViewModel>(m => m.iban)]: {
      type: 'text',
      name: '@'
    },
    [nameof<BankAccountViewModel>(m => m.bban)]: {
      type: 'text',
      name: '@'
    },
    [nameof<BankAccountViewModel>(m => m.swiftbic)]: {
      type: 'text',
      name: '@'
    },
    [nameof<BankAccountViewModel>(m => m.countryId)]: {
      type: 'enum',
      name: 'country',
      enumValue: CountryEnum,
      skipTranslation: true
    },
    [nameof<BankAccountViewModel>(m => m.bankAccountTypeId)]: {
      type: 'enum',
      name: 'bankAccountType',
      enumValue: BankAccountTypeEnum,
      enumName: 'BankAccountTypeEnum'
    }
  } as FormBuilderFieldGroupDefinition
])

const accountHolderFieldsGroups = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<BankAccountHolderViewModel>(m => m.taxId)]: {
      type: 'text',
      name: '@'
    },
    [nameof<BankAccountHolderViewModel>(m => m.companyName)]: {
      type: 'text',
      name: '@'
    }
  } as FormBuilderFieldGroupDefinition
])
</script>
<template>
  <div class="flex flex-col">
    <div class="flex w-full">
      <FormBuilder :is-loading="isLoading" :model-value="modelValueLocal"
        @update:model-value="$emit('update:modelValue', modelValueLocal)" :fields-groups="bankAccountFieldsGroups">
      </FormBuilder>
    </div>
    <div class="-mx-2 -mb-2">
      <Collapse title="holder">
        <div class="mx-3">
          <FormBuilder :is-loading="isLoading" :fields-groups="accountHolderFieldsGroups"
            v-model="modelValueLocal.bankAccountHolder" @update:model-value="$emit('update:modelValue', modelValueLocal)">
          </FormBuilder>
        </div>
        <Person :is-loading="isLoading" v-model="modelValueLocal!.bankAccountHolder!.person"
          @update:model-value="$emit('update:modelValue', modelValueLocal)" />
      </Collapse>
      <Collapse title="billingAddress" :is-last="true">
        <div class="mx-3">
          <Address :is-loading="isLoading" v-model="modelValueLocal!.bankAccountHolder!.billingAddress"
            @update:model-value="$emit('update:modelValue', modelValueLocal)" />
        </div>
      </Collapse>
    </div>
  </div>
</template>
