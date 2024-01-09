<script lang="ts" setup>
import { getVariableName, pageContentHeight, pageContentHeightPx } from '../services/utils'
import TableBuilder from '../components/ui/TableBuilder.vue'
import { onMounted, Ref, ref, watch } from 'vue'
import { store } from '../services/store'
import { notifier } from '../services/notification'
import { apiClient } from '../services/api'
import { PaginatedResultOfVoucherViewModel, VoucherRewardTypeEnum, VoucherSearchRequest, VoucherViewModel } from '../services/api.client'
import Modal from '../components/ui/Modal.vue'
import FormBuilder from '../components/ui/FormBuilder.vue'
import { nameof } from 'ts-simple-nameof'
import { useShowConfirm } from '../services/injections'
import { TableBuilderFieldDefinition, FormBuilderFieldGroupDefinition } from '../components/ui/types'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const isLoading = ref(false)
const voucherResponse: Ref<PaginatedResultOfVoucherViewModel | undefined> = ref(undefined)
const voucherSearchRequest = ref(new VoucherSearchRequest())
const selectedVoucher: Ref<VoucherViewModel | undefined> = ref(undefined)
const showConfirm = useShowConfirm()

const loadVouchers = async (pageIdx = 0, pageSize = 10) => {
  isLoading.value = true
  voucherSearchRequest.value.pageIdx = pageIdx
  voucherSearchRequest.value.pageSize = pageSize
  try {
    voucherResponse.value = await apiClient.voucherSearch(props.restaurantId, voucherSearchRequest.value)
  } catch (error) {
    notifier.notifyError('loading', error, 'vouchers')
  }
  isLoading.value = false
}

const deleteVoucher = () => {
  showConfirm('proceedQuestion', async () => {
    isLoading.value = true
    try {
      await apiClient.voucherDelete(props.restaurantId, selectedVoucher.value!.id!)
      selectedVoucher.value = undefined
      loadVouchers()
    } catch (error) {
      notifier.notifyError('deleting', error, 'voucher')
    }
    isLoading.value = false
  })
}

const saveVoucher = async () => {
  isLoading.value = true
  try {
    await apiClient.voucherPost(props.restaurantId, selectedVoucher.value!)
    selectedVoucher.value = undefined
    loadVouchers()
  } catch (error) {
    notifier.notifyError('saving', error, 'voucher')
  }
  isLoading.value = false
}

watch(store.selectedRestaurant, () => {
  if (!store.selectedRestaurant.value) return
  loadVouchers()
})

const addNewVoucher = () => {
  selectedVoucher.value = new VoucherViewModel()
}

onMounted(() => {
  if (!store.selectedRestaurant.value) return
  loadVouchers()
})

const columnDefinition = ref<TableBuilderFieldDefinition>({
  [nameof<VoucherViewModel>(m => m.id)]: {
    type: 'id',
    name: '@'
  },
  [nameof<VoucherViewModel>(m => m.code)]: {
    type: 'string',
    name: '@'
  },
  [nameof<VoucherViewModel>(m => m.minAmount)]: {
    type: 'currency',
    name: '@'
  },
  [nameof<VoucherViewModel>(m => m.discountAmount)]: {
    type: 'currency',
    name: '@'
  },
  [nameof<VoucherViewModel>(m => m.discountPercentage)]: {
    type: 'percentage',
    name: '@'
  },
  [nameof<VoucherViewModel>(m => m.maxCount)]: {
    type: 'string',
    name: '@'
  },
  [nameof<VoucherViewModel>(m => m.isActive)]: {
    type: 'boolean',
    name: '@'
  },
  [nameof<VoucherViewModel>(m => m.rewardTypeId)]: {
    type: 'enum',
    name: 'rewardType',
    enumValue: VoucherRewardTypeEnum,
    enumName: 'VoucherRewardTypeEnum'
  }
})

const voucherFieldGroup = ref<FormBuilderFieldGroupDefinition[]>([
  {
    [nameof<VoucherViewModel>(m => m.code)]: {
      type: 'text',
      name: '@',
      disabled: (voucher: VoucherViewModel) => !!voucher.id
    },
    [nameof<VoucherViewModel>(m => m.minAmount)]: {
      type: 'currency',
      name: '@',
      disabled: (voucher: VoucherViewModel) => !!voucher.id
    },
    [nameof<VoucherViewModel>(m => m.rewardTypeId)]: {
      type: 'enum',
      name: 'rewardType',
      enumValue: VoucherRewardTypeEnum,
      enumName: 'VoucherRewardTypeEnum',
      disabled: (voucher: VoucherViewModel) => !!voucher.id
    },
    [nameof<VoucherViewModel>(m => m.discountAmount)]: {
      type: 'currency',
      name: '@',
      if: (voucher: VoucherViewModel) => voucher.rewardTypeId === VoucherRewardTypeEnum.DiscountAmount,
      disabled: (voucher: VoucherViewModel) => !!voucher.id
    },
    [nameof<VoucherViewModel>(m => m.discountPercentage)]: {
      type: 'percentage',
      name: '@',
      if: (voucher: VoucherViewModel) => voucher.rewardTypeId === VoucherRewardTypeEnum.DiscountPercentage,
      disabled: (voucher: VoucherViewModel) => !!voucher.id
    },
    [nameof<VoucherViewModel>(m => m.expireAt)]: {
      type: 'date',
      name: '@'
    },
    [nameof<VoucherViewModel>(m => m.maxCount)]: {
      type: 'number',
      name: '@'
    },
    [nameof<VoucherViewModel>(m => m.isActive)]: {
      type: 'toggle',
      name: '@'
    }
  } as FormBuilderFieldGroupDefinition
])
</script>
<template>
  <div class="w-full">
    <Modal v-if="selectedVoucher && !isLoading" @close="selectedVoucher = undefined"
      :action-buttons="[{ text: 'confirm', colorClass: 'success-fill', iconName: 'content-save', action: () => saveVoucher() }, ...(selectedVoucher.id ? [{ text: 'delete', iconName: 'delete', colorClass: 'danger', action: () => deleteVoucher() }] : [])]">
      <template v-slot:content>
        <div class="pt-2">
          <FormBuilder :is-loading="isLoading" :fields-groups="voucherFieldGroup" v-model="selectedVoucher">
          </FormBuilder>
        </div>
      </template>
    </Modal>
    <ScrollableDiv class="page-content" :height="pageContentHeight">
      <TableBuilder :items="voucherResponse?.items ?? []" :total-pages="voucherResponse?.totalPages"
        :total-records="voucherResponse?.totalRecords" :is-loading="isLoading" :change-page-callback="loadVouchers"
        :show-pages="true" :columns="columnDefinition" @clicked="selectedVoucher = $event">
        <template v-slot:action-buttons-left>
          <div class="flex items-center flex-1 w-full">
            <button class="btn-action primary-fill" @click="addNewVoucher">
              <span class="mdi mdi-plus"></span>
              <span>{{ $tc('add') }}</span>
            </button>
          </div>
        </template>
      </TableBuilder>
    </ScrollableDiv>
  </div>
</template>
