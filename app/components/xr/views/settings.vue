<template>
  <xr-3d-stack-panel
    :position="[0, 1.5, 1.5]"
    :margin="0.05"
  >
    <xr-3d-button
      name="back"
      @click="goBack"
    >
      <xr-2d-text-block
        text="Back"
        color="white"
        font-size="48"
      />
    </xr-3d-button>
  </xr-3d-stack-panel>
</template>

<script setup lang="ts">
import { useXRRouter } from '../app/route'

const router = useXRRouter()

const goBack = (): void => {
  router.back()
}
</script>
