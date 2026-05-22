<template>
  <component
    :is="activeComponent"
    v-if="activeComponent"
    :key="xrRouter.currentPath.value"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useXRRouter } from './route'

const xrRouter = useXRRouter()
const activeComponent = computed(() => xrRouter.currentComponent.value)
</script>
