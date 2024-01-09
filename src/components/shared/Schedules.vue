<script lang="ts" setup>
import { computed, PropType, ref } from 'vue'
import { ScheduleViewModel, VisibilityScheduleViewModel } from '../../services/api.client'
import Datepicker from '@vuepic/vue-datepicker'
import Collapse from '../ui/Collapse.vue'

const daysOfTheWeek = ref({
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  7: 'sunday'
})

const emits = defineEmits(['update:modelValue', 'change'])
const props = defineProps({
  showVisibilityToggle: Boolean,
  modelValue: {
    type: Array as PropType<ScheduleViewModel[]>,
    requried: true
  },
  maxShifts: Number as PropType<number | undefined>,
  minShifts: {
    type: Number,
    default: 1
  },
  shifts: {
    type: Number,
    default: 2
  }
})

const computedGroupedSchedules = computed(() => {
  const currentSchedule = (props.modelValue ?? []).reduce((map, schedule) => ({
    ...map,
    [schedule.dayOfTheWeek!]: [...(map[schedule.dayOfTheWeek!] ?? []), schedule].sort((a, b) => a.startingHour! - b.startingHour!)
  }), {} as { [dayOfWeek: number]: ScheduleViewModel[] })
  // Object.keys(daysOfTheWeek.value).forEach(d => currentSchedule[d as any] = currentSchedule[d as any] ?? [ScheduleViewModel.fromJS({ daysOfTheWeek: d as any, startingHour: 0, endingHour: 24 })!])
  return currentSchedule
})

const addSchedule = (dayOfTheWeek: number, startingEvt?: { hours: number; minutes: number } | null, endingEvt?: { hours: number; minutes: number } | null) => {
  const schedules = Object.values(computedGroupedSchedules.value).flatMap(x => x)
  schedules.push(ScheduleViewModel.fromJS({ dayOfTheWeek, startingHour: startingEvt?.hours, startingMinute: startingEvt?.minutes, endingMinute: endingEvt?.hours, endingHour: endingEvt?.minutes, id: `#${Math.random()}` })!)
  emits('update:modelValue', schedules)
}

const fixedSchedules = computed(() => props.modelValue?.filter(s => !!s.validFrom) ?? [])
const deleteSchedule = (scheduleId: string) => {
  const idx = props.modelValue?.findIndex(s => s.id === scheduleId) ?? -1
  if (idx > -1) {
    const schedules = props.modelValue
    schedules?.splice(idx, 1)
    emits('update:modelValue', schedules)
  }
}
const applyToAll = (scheduleId: string) => {
  const mainSchedule = props.modelValue?.find(s => s.id === scheduleId)
  if (!mainSchedule) return
  const startingEvt = { hours: mainSchedule.startingHour!, minutes: mainSchedule.startingMinute! }
  const endingEvt = { hours: mainSchedule.endingHour!, minutes: mainSchedule.endingMinute! }
  let updatedSchedules = [...props.modelValue ?? []]
  Object.keys(daysOfTheWeek.value)
    .filter(x => Number(x) !== mainSchedule.dayOfTheWeek)
    .forEach(dayOfWeek => {
      const dailySchedules = computedGroupedSchedules.value[dayOfWeek as any] ?? []
      if (!dailySchedules.length)
        updatedSchedules.push(ScheduleViewModel.fromJS({ dayOfTheWeek: Number(dayOfWeek), startingHour: startingEvt?.hours, startingMinute: startingEvt?.minutes, endingMinute: endingEvt?.minutes, endingHour: endingEvt?.hours, id: `#${Math.random()}` })!)
      else if (dailySchedules.length >= 1) {
        const scheduleIdx = updatedSchedules.findIndex(x => x.id === dailySchedules[0].id!)
        const schedule = updatedSchedules[scheduleIdx]
        if (startingEvt) {
          schedule.startingHour = startingEvt.hours
          schedule.startingMinute = startingEvt.minutes
        }
        if (endingEvt) {
          schedule.endingHour = endingEvt.hours
          schedule.endingMinute = endingEvt.minutes
        }
        if (dailySchedules.length > 1)
          updatedSchedules = updatedSchedules.filter(x => !dailySchedules.some(s => x.id === s.id!))
      }
    })
  emits('update:modelValue', updatedSchedules)
}

const newFixedSchedule = () => {
  const schedules = props.modelValue ?? []
  schedules.push(ScheduleViewModel.fromJS({ validFrom: new Date(), id: `#${Math.random()}` })!)
  emits('update:modelValue', schedules)
}

const updateSchedule = (scheduleId: string, startingEvt: { hours: number; minutes: number } | null, endingEvt: { hours: number; minutes: number } | null) => {
  const schedules = [...props.modelValue!]
  const scheduleIdx = schedules.findIndex(s => s.id === scheduleId) ?? -1
  if (scheduleIdx === -1) return
  const schedule = schedules[scheduleIdx]
  if (startingEvt) {
    schedule.startingHour = startingEvt.hours
    schedule.startingMinute = startingEvt.minutes
  }
  if (endingEvt) {
    schedule.endingHour = endingEvt.hours
    schedule.endingMinute = endingEvt.minutes
  }
  schedules[scheduleIdx] = schedule
  emits('update:modelValue', schedules)
}
</script>
<style lang="scss">
.schedule {
  .dp__input {
    border: none !important;
  }

  .dp__input_icon_pad {
    padding-left: 10px !important;
    text-align: center;
    font-weight: 500;
  }
}
</style>
<template>
  <div>
    <Collapse title="fixedSchedule" class="-mx-3" :is-first="true" :is-open="fixedSchedules.length > 0">
      <div class="flex justify-between items-center px-1" v-for="fixedSchedule of fixedSchedules" :key="fixedSchedule.id">
        <div class="flex gap-2" v-if="fixedSchedule">
          <label class="form-label">
            <span>{{ $tc('from') }}</span>
            <Datepicker v-model="fixedSchedule.validFrom" datePicker :auto-apply="true">
            </Datepicker>
          </label>
          <label class="form-label">
            <span>{{ $tc('to') }}</span>
            <Datepicker v-model="fixedSchedule.validFrom" datePicker :auto-apply="true">
            </Datepicker>
          </label>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn-action-icon gray" @click="newFixedSchedule()">
            <span class="mdi mdi-plus"></span>
          </button>
          <button class="btn-action-icon danger" @click="deleteSchedule(fixedSchedule.id!)">
            <span class="mdi mdi-delete"></span>
          </button>
        </div>
      </div>
      <button v-if="!fixedSchedules.length" class="btn-action primary-fill m-1" @click="newFixedSchedule()">
        <span class="mdi mdi-plus"></span>
        <span>{{ $tc('add') }}</span>
      </button>
    </Collapse>
    <Collapse title="weekly" class="-mx-3 -mb-3 border-b" :is-open="true">
      <div class="flex flex-col md:flex-row gap-2 schedule w-full justify-between pb-1">
        <div class="w-24" v-for="(dayOfTheWeekName, dayOfTheWeek) of daysOfTheWeek" :key="dayOfTheWeek">
          <div class="flex flex-col">
            <div class="flex items-center justify-center">
              <span class="text-gray-body text-sm font-medium p-1">
                {{ $tc(dayOfTheWeekName) }}
              </span>
            </div>
            <div class="flex flex-col gap-2 items-center">
              <div v-for="schedule of computedGroupedSchedules[dayOfTheWeek]" class="flex flex-col" :key="schedule.id">
                <Datepicker class="w-20"
                  :model-value="{ hours: schedule.startingHour!, minutes: schedule.startingMinute! }"
                  @update:model-value="updateSchedule(schedule.id!, $event, null)" timePicker minutes-increment="1"
                  :auto-apply="true">
                  <template #clear-icon="{}">
                  </template>
                  <template #input-icon>
                  </template>
                </Datepicker>
                <Datepicker class="w-20" :model-value="{ hours: schedule.endingHour!, minutes: schedule.endingMinute! }"
                  @update:model-value="updateSchedule(schedule.id!, null, $event)" timePicker minutes-increment="1"
                  :auto-apply="true">
                  <template #clear-icon="{}">
                  </template>
                  <template #input-icon>
                  </template>
                </Datepicker>
                <div class="flex justify-center gap-1">
                  <button class="btn-action-icon danger" @click="deleteSchedule(schedule.id!)">
                    <span class="mdi mdi-delete"></span>
                  </button>
                  <button class="btn-action-icon teal" @click="applyToAll(schedule.id!)">
                    <span class="mdi mdi-content-copy"></span>
                  </button>
                </div>
              </div>
              <div class="flex items-center justify-center">
                <button class="btn-action-icon gray" @click="addSchedule(Number(dayOfTheWeek))">
                  <span class="mdi mdi-plus"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Collapse>
  </div>
</template>
