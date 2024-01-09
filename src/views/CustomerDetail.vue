<script lang="ts" setup>
import ScrollableDiv from '../components/ui/ScrollableDiv.vue'
import { pageContentHeight, pageContentHeightPx } from '../services/utils'
</script>
<template>
  <div class="w-full">

    <!-- <div class="card"></div> -->
    <ScrollableDiv class="page-content" :height="pageContentHeight">
      <div class="h-full w-full flex justify-center items-center -mt-20">
        <h2 class="font-semibold text-2xl text-gray-400">Coming soon</h2>
      </div>
    </ScrollableDiv>
  </div>
</template>
