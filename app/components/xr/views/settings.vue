<template>
  <xr-3d-holographic-slate
    :position="[0, 1.5, 2]"
    :dimensions="[1.2, 0.8]"
    :min-dimensions="[0.5, 0.5]"
    :title-bar-height="0.08"
    :content-resolution="2048"
    :billboard="true"
    title="Settings"
  >
    <xr-2d-rectangle
      width="100%"
      height="100%"
      :thickness="0"
      background="#2a2a2a"
    >
      <xr-2d-stack-panel
        width="100%"
        height="100%"
        :is-vertical="true"
        padding-top="60px"
        padding-left="60px"
        padding-right="60px"
      >
        <xr-2d-text-block
          text="Settings"
          color="white"
          font-size="80px"
          height="120px"
        />

        <xr-2d-text-block
          text="Volume"
          color="white"
          font-size="50px"
          height="60px"
          :horizontal-alignment="0"
        />
        <xr-2d-slider
          :minimum="0"
          :maximum="100"
          :value="50"
          height="60px"
          color="#007bff"
          background="#444"
          padding-bottom="40px"
        />

        <xr-2d-button
          text="Back to Menu"
          height="100px"
          width="400px"
          color="white"
          font-size="40px"
          background="#007bff"
          corner-radius="10"
          @click="goBack"
        />
      </xr-2d-stack-panel>
    </xr-2d-rectangle>
  </xr-3d-holographic-slate>
</template>

<script setup lang="ts">
import { useXRRouter } from '../app/route'

const router = useXRRouter()

const goBack = () => {
  router.back()
}
</script>
