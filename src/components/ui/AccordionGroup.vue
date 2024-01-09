<template>
  <ul class="accordion">
    <slot></slot>
  </ul>
</template>

<script lang="ts" setup>
import { provide, reactive } from 'vue'

const accordion = reactive({
  count: 0,
  active: null
})

provide('Accordion', accordion)

</script>

<style lang="scss" scoped>
.accordion {
  list-style: none;
  margin: 0;
  padding: 0;

  &__item:last-child {
    border-bottom: none;
  }
}
</style>
