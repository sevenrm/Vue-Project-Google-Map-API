<template>
  <label class="switch cursor-pointer">
    <input :checked="modelValue" @change="emits('update:modelValue', !modelValue)" type="checkbox" :disabled="disabled"
      class="cursor-pointer rounded-md text-red-600 form-checkbox focus:outline-none focus:shadow-outline-red focus:shadow-outline-gray" />
    <span class="slider round" :class="bgClass"></span>
  </label>
</template>
<script lang="ts" setup>

const emits = defineEmits([
  'update:modelValue', 'change'
])
defineProps({
  modelValue: Boolean,
  disabled: Boolean,
  bgClass: {
    type: String,
    default: 'bg-gray-200 dark:bg-gray-800'
  }
})
</script>
<style lang="scss" scoped>
/* The switch - the box around the slider */
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  min-width: 40px;
  height: 22px;

  /* Hide default HTML checkbox */
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  /* The slider */
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    -webkit-transition: 0.15s;
    transition: 0.15s;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    -webkit-transition: 0.15s;
    transition: 0.15s;
    box-shadow: 0px 4px 24px rgba(0, 0, 0, 0.1);
  }

  input:checked+.slider {
    background-color: theme("colors.red.pnp");
  }

  input:focus+.slider {}

  input:checked+.slider:before {
    --slide: 18px;
    -webkit-transform: translateX(var(--slide));
    -ms-transform: translateX(var(--slide));
    transform: translateX(var(--slide));
  }

  /* Rounded sliders */
  .round {
    border-radius: 34px;
  }

  .round:before {
    border-radius: 50%;
  }
}
</style>