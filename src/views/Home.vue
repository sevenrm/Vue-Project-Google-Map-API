<template>
  <div class="flex">
    <div class="w-full">
      <ScrollableDiv class="page-content" :height="pageContentHeight">
        <div class="grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-4 gap-4" v-if="!isLoading">
          <div class="card flex flex-col items-center justify-center" v-for="(chart, idx) of charts" :key="idx">
            <h3 class="text-xl text-gray-heading my-2">{{ $tc(chart.title ?? '') }}</h3>
            <v-chart class="chart" :option="getChartConfig(chart)" :autoresize="true" />
          </div>
          <div class="card flex items-center justify-between px-4">
            <h3 class="text-xl text-gray-heading my-2">{{ $tc('onlineUsers') }}</h3>
            <span class="font-semibold text-xl">{{ onlineUsers }}</span>
          </div>
        </div>
        <div class="flex items-center justify-center w-full h-full" v-else>
          <SimpleSpinner />
        </div>
      </ScrollableDiv>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { use, graphic } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent, DatasetComponent } from 'echarts/components'
import VChart, { THEME_KEY } from 'vue-echarts'
import { onBeforeUnmount, onMounted, Ref, ref, watch, provide } from 'vue'
import { useToast } from 'vue-toastification'
import { apiClient } from '../services/api'
import { store } from '../services/store'
import { ChartViewModel, ChartViewTypeEnum } from '../services/api.client'
import { pageContentHeight, pageContentHeightPx } from '../services/utils'
import SimpleSpinner from '../components/ui/SimpleSpinner.vue'
import { notifier } from '../services/notification'
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'
import { HubConnectionState } from '@microsoft/signalr'
import { object } from 'yup'

use([
  SVGRenderer,
  BarChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent
])

provide(THEME_KEY, 'light')

const getChartConfig = (chart: ChartViewModel) => {
  console.log('~~~~~~~~~~~~~', chart)
  if (chart.type === ChartViewTypeEnum.Bar)
    return {
      color: Object.values(chart.colors!)[0],
      backgroundColor: '#ffffff',
      dataset: {
        source: [
          ['type', ...chart.labels!],
          ...(Object.keys(chart.datasets!)).map(name => [name, ...chart.datasets![name]])
        ]
      },
      grid: {
        containLabel: true,
        bottom: '0%'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {},
      xAxis: {
        type: 'category',
        axisTick: {
          show: false
        },
        axisLabel: {
          rotate: 40,
          formatter: function (value: any) {
            if (chart.title === 'mostClickedItems' && value.length > 20) {
              return value.substring(0, 12) + '...'
            } else {
              return value
            }
          }
        }
      },
      yAxis: [{
        type: 'value',
        splitLine: {
          lineStyle: {
            color: '#bbbbbb'
          }
        }
      }],
      series: Object.keys(chart.datasets!).map(_ => ({
        type: 'bar',
        barWidth: '8px',
        itemStyle: {
          borderRadius: [5, 5, 0, 0]
        },
        seriesLayoutBy: 'row',
        barGap: '10%'
      }))
    }
  return {}
}

const option = ref({
  color: ['#334bfd', '#5293fb'],
  backgroundColor: '#ffffff',
  dataset: {
    source: [
      ['type', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      ['This Week', 10, 52, 200, 334, 390, 330, 220],
      ['Last Week', 5, 36, 256, 245, 111, 343, 66]
    ]
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    }
  },
  legend: {},
  xAxis: {
    type: 'category',
    axisTick: {
      show: false
    }
  },
  yAxis: [{
    type: 'value',
    splitLine: {
      lineStyle: {
        color: '#bbbbbb'
      }
    }
  }],
  series: [{
    type: 'bar',
    barWidth: '8px',
    itemStyle: {
      borderRadius: [5, 5, 0, 0]
    },
    seriesLayoutBy: 'row',
    barGap: '80%'
  }, {
    type: 'bar',
    barWidth: '8px',
    itemStyle: {
      borderRadius: [5, 5, 0, 0]
    },
    seriesLayoutBy: 'row',
    barGap: '80%'
  }]
})

const option2 = ref({
  color: ['#3398DB'],
  backgroundColor: '#ffffff',
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    }
  },
  grid: {},
  xAxis: [{
    type: 'category',
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    splitLine: {
      show: true,
      lineStyle: {
        color: '#eeeeee'
      }
    }
  }],
  yAxis: [{
    type: 'value',
    splitLine: {
      lineStyle: {
        color: '#eeeeee',
        type: 'dashed'
      }
    }
  }],
  series: [{
    type: 'line',
    data: [10, 52, 200, 334, 390, 330, 220],
    symbol: 'circle',
    symbolSize: 7,
    itemStyle: {
      color: '#0770FF'
    },
    areaStyle: {
      color: new graphic.LinearGradient(0, 0, 0, 1, [
        {
          offset: 0,
          color: 'rgba(224,236,248,0.4)'
        },
        {
          offset: 1,
          color: 'rgba(58,77,233,0.0)'
        }
      ])
    }
  }]
})

const toast = useToast()
const isLoading = ref(false)

const props = defineProps({
  restaurantId: {
    type: String,
    required: true
  }
})

const charts: Ref<ChartViewModel[]> = ref([])
const onlineUsers = ref(0)
const loadDashboard = async () => {
  try {
    isLoading.value = true
    charts.value = await apiClient.dashboard(store.selectedRestaurant.value!.id!)
  } catch (error) {
    notifier.notifyError('loading', error, 'dashboard')
  }
  isLoading.value = false
}

const loadLiveData = async () => {
  store.connection?.on('SESSION_COUNT_UPDATED', ({ count }: { count: number }) => onlineUsers.value = count)
  await store.isStoreConnected()
  store.connection?.invoke('Subscribe', 'DASHBOARD', props.restaurantId)
}

watch(store.selectedRestaurant, () => {
  // loadDashboard()
  if (store.connection.state === HubConnectionState.Connected) {
    store.connection?.invoke('Unsubscribe', 'DASHBOARD')
    store.connection?.invoke('Subscribe', 'DASHBOARD', store.selectedRestaurant.value!.id!)
  }
  console.log('~~~~~~~~~~~~~~~~~~~~', charts.value)
})

onBeforeUnmount(() => {
  if (store.connection.state === HubConnectionState.Connected)
    store.connection?.invoke('Unsubscribe', 'DASHBOARD')
})

onMounted(() => {
  if (!store.selectedRestaurant.value) return
  // loadDashboard()
  loadLiveData()
  charts.value = [{ title: 'weeklySales', type: 1, labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], datasets: { previousWeek: [10, 52, 200, 334, 390, 330, 220], currentWeek: [5, 36, 256, 245, 111, 343, 66] }, colors: { count: ['#334bfd', '#5293fb'] } }, { title: 'mostSoldItems', type: 1, labels: ['Fried Goat Cheese', 'Peanuts'], datasets: { count: [2, 2] }, colors: { count: ['#334bfd', '#5293fb'] } }, { title: 'mostClickedItems', type: 1, labels: ['Pizza Margherita ', 'Fresh Argentinian Ribeye', 'Fillet Mignon', 'Chocolate Brownies and Ice Cream', 'newitem', 'Beef Carpaccio'], datasets: { count: [12, 5, 3, 2, 1, 1] }, colors: { count: ['#334bfd', '#5293fb'] } }, { liveTitle: 'onlineUsers', liveValueKey: 'onlineUsers', title: 'usersCount', type: 1, labels: ['02:45', '02:50', '02:55', '03:00', '03:05', '03:10', '03:15'], datasets: { count: [5, 10, 14, 3, 24, 3, 12] }, colors: { count: ['#334bfd', '#5293fb'] } }]
  // charts.value.push({ title: 'asdf', type: 1, liveTitle: 'asdf', liveValueKey: 'asdf', id: '1', labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], datasets: { previousWeek: [10, 52, 200, 334, 390, 330, 220], currentWeek: [5, 36, 256, 245, 111, 343, 66] }, colors: { count: ['#334bfd', '#5293fb'] } })
  console.log('~~~~~~~~~~~~~~~~~~~~', charts)
})
</script>
<style scoped>
.chart {
  width: 100%;
  min-height: 400px
}
</style>
