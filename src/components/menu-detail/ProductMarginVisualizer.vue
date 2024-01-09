<script lang="ts" setup>
import { Chart, registerables } from 'chart.js'
import { computed, PropType, ComputedRef, ref, Ref } from 'vue'
import { DoughnutChart } from 'vue-chart-3'
import { InventoryProductListItemViewModel, ItemInventoryProductViewModel } from '../../services/api.client'
import { numberFormatter } from '../../services/number.formatter'

Chart.register(...registerables)

const props = defineProps({
  inventoryProductsMap: {
    type: Object as PropType<Record<string, InventoryProductListItemViewModel>>,
    required: true
  },
  productsAllocation: {
    type: Array as PropType<ItemInventoryProductViewModel[]>,
    required: true
  },
  taxPercentage: {
    type: Number as PropType<number | undefined>,
    required: true
  },
  price: {
    type: Number,
    required: true
  }
})

const itemsPrices = computed(() => props.productsAllocation.map(a => ({ id: a.id, cost: a.quantity * (props.inventoryProductsMap[a.id!].lastPrice! / (1 - (props.inventoryProductsMap[a.id!].wastePercentage! / 100)))! })))
const taxCost = computed(() => props.price / 100 * (props.taxPercentage ?? 0))
const totalCost = computed(() => itemsPrices.value.reduce((total, alloc) => total + alloc.cost, 0) + taxCost.value)
const gain = computed(() => props.price - totalCost.value)
const margin = computed(() => ((1 - totalCost.value / props.price) * 100).toFixed(2))
const chartValues = computed(() => [(props.price - totalCost.value), taxCost.value, ...itemsPrices.value.map(i => i.cost)])
const chartOptions: Ref<any> = ref({
  plugins: {
    tooltip: {
      callbacks: {
        label: (tooltipItem: { label: string, parsed: number }) => {
          return ` ${tooltipItem.label} - ${(tooltipItem.parsed / props.price * 100).toFixed(2)}%`
        }
      }
    }
  }
})
const chartData: ComputedRef<any> = computed(() => ({
  labels: ['gain', 'tax', ...itemsPrices.value.map(i => props.inventoryProductsMap[i.id!].product!.name)],
  datasets: [
    {
      data: chartValues.value,
      label: '',
      backgroundColor: ['#77CEFF', '#97B0C4', '#0079AF', '#123E6B', '#A5C8ED']
    }
  ]
}))

</script>
<template>
  <div class="flex justify-between items-center">
    <div class="w-[250px] p-4">
      <DoughnutChart :chartData="chartData" :options="chartOptions" />
    </div>
    <div class="w-1/2 px-2 gap-4 grid grid-cols-2 justify-center items-center">
      <div class="text-center">
        <h3>{{ $tc('totalCost') }}</h3>
        <span>{{ numberFormatter.currency(totalCost) }}</span>
      </div>
      <div class="text-center">
        <h3>{{ $tc('netGain') }}</h3>
        <span>{{ numberFormatter.currency(gain) }}</span>
      </div>
      <div class="text-center">
        <h3>{{ $tc('margin') }}</h3>
        <span>{{ margin }}%</span>
      </div>
      <div class="text-center">
        <h3>{{ $tc('taxCost') }}</h3>
        <span>{{ numberFormatter.currency(taxCost) }}</span>
      </div>
    </div>
  </div>
</template>
