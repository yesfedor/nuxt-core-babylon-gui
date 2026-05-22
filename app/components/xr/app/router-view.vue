<template>
  <component
    :is="xrRouter.currentComponent.value"
    v-if="xrRouter.currentComponent.value"
  />
</template>

<script setup lang="ts">
import { useXRRouter } from './route'

const xrRouter = useXRRouter()
</script>
