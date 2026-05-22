<template>
  <xr-3d-near-menu :follow-camera="true">
    <xr-3d-touch-holographic-button
      text="Back"
      @click="goBack"
    />
    <xr-3d-touch-holographic-button text="Volume +" />
    <xr-3d-touch-holographic-button text="Volume -" />
  </xr-3d-near-menu>
</template>

<script setup lang="ts">
import { useXRRouter } from '../app/route'

const router = useXRRouter()

const goBack = (): void => {
  router.back()
}
</script>
