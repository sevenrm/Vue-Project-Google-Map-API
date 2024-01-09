<script lang="ts" setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { menuItems } from '../routes'
import { store } from '../services/store'
import Toggle from './ui/Toggle.vue'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import AccordionGroup from './ui/AccordionGroup.vue'
import AccordionItem from './ui/AccordionItem.vue'
import { windowHeight } from '../services/utils'
import { environment } from '../environment'
import ScrollableDiv from './ui/ScrollableDiv.vue'

const emits = defineEmits(['theme-toggle', 'link-clicked'])
const imageUrl = new URL('../assets/images/logo-color.png', import.meta.url).href

defineProps({
  isDark: Boolean,
  isFullscreen: Boolean,
  isCollapsed: Boolean
})

const route = useRoute()

const canSeeMenu = (menuRoles?: number[]) => {
  return !menuRoles ||
    (menuRoles && store.user.value?.role.permissions.includes(1)) ||
    (menuRoles && menuRoles.some(r => (store.user.value?.role.permissions ?? []).indexOf(r) > -1))
}

watch(route, val => {
  menuItems.forEach(item => {
    item.active = item.routeName === route.name
    if (item.children)
      item.active = item.children?.map(subItem => subItem.routeName).includes(route.name as string)
  })
})
</script>

<template>
  <div class="relative">
    <div v-if="!isFullscreen" class="2xl:shadow-none 2xl:block transition-all">

      <div
        class="flex flex-col overflow-y-hidden overflow-x-hidden bg-white shadow-default mt-2 mb-3 ml-3 rounded transition-all"
        :class="{ 'hidden md:block md:w-16 2xl:block 2xl:w-60': isCollapsed, 'fixed z-50 2xl:block w-60': !isCollapsed }"
        :style="{ 'height': (windowHeight - 80) + 'px' }">

        <div class="mb-3">

          <div>
            <ScrollableDiv :height="windowHeight - 82">
              <ul v-if="store.selectedRestaurantId" class="py-3 space-y-2 menu-container">
                <template v-for="(item, index) of menuItems">
                  <li v-if="(!item.isBeta || !environment.isProduction) && canSeeMenu(item.roles)" :key="index"
                    class="relative mx-2">
                    <router-link v-if="item.routeName"
                      :to="{ name: item.routeName, params: { restaurantId: store.selectedRestaurantId } }"
                      :class="{ 'justify-center 2xl:justify-start': isCollapsed }"
                      class="w-full flex items-center rounded-md p-2 py-3 font-medium text-lg transition-colors duration-150 text-gray-body hover:bg-white hover:text-primary hover:shadow-default">
                      <span class="mx-3 text-lg mdi" :class="'mdi-' + item?.icon"></span>
                      <span :class="{ 'hidden 2xl:block': isCollapsed, 'block': !isCollapsed }">
                        {{ $tc(`routes.${item.copy}`) }}
                      </span>
                    </router-link>
                    <AccordionGroup v-else>
                      <AccordionItem :start-open="item.active" @active-item="item.active = $event">
                        <template v-slot:accordion-trigger>
                          <div
                            class="cursor-pointer w-full py-3 hover:bg-white hover:bg-opacity-25 hover:shadow-default-red-pnp rounded-md my-1 px-2 font-medium text-lg transition-colors duration-150 block text-gray-body">
                            <span class="mx-3 text-lg mdi" :class="'mdi-' + item?.icon"></span>
                            <span :class="{ 'hidden 2xl:block': isCollapsed, 'block': !isCollapsed }">
                              {{ $tc(`routes.${item.copy} `) }}
                            </span>
                            <span class="mdi" :class="[item.active ? ' mdi-menu-down' : 'mdi-menu-right']"></span>
                          </div>
                        </template>
                        <template v-slot:accordion-content>
                          <ul v-if="item.children" class="dropdown-content px-7 rounded-xl">
                            <template v-for="(subItem, j) of item.children">
                              <li :key="j" v-if="canSeeMenu(subItem.roles)" class="relative ml-2 my-3">
                                <router-link :to="{ name: subItem.routeName }"
                                  class="flex items-center w-full rounded-xl py-3 font-medium text-lg transition-colors duration-150 text-gray-body px-3 hover:bg-white hover:bg-opacity-25 hover:shadow-default">
                                  <span v-if="subItem.icon" class="mr-6 text-xl mdi"
                                    :class="'mdi-' + subItem.icon"></span>
                                  <span :class="{ 'hidden 2xl:block': isCollapsed, 'block': !isCollapsed }">{{
                                    $tc(`routes.${subItem.copy}`)
                                  }} </span>
                                </router-link>
                              </li>
                            </template>
                          </ul>
                        </template>
                      </AccordionItem>
                    </AccordionGroup>
                  </li>
                </template>
              </ul>
            </ScrollableDiv>
          </div>
        </div>
        <div v-if="false" class="flex items-center justify-center absolute bottom-10 left-0 right-0 mx-auto">
          <span class="mdi mdi-moon-waxing-crescent rotate-45 mr-3"></span>
          <Toggle :model-value="!isDark" @update:model-value="emits('theme-toggle')" />
          <span class="mdi mdi-white-balance-sunny ml-3"></span>
        </div>
      </div>
    </div>
  </div>
</template>
