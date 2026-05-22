<template>
  <xr-3d-holographic-slate
    :position="[0, 1.5, 2]"
    :dimensions="[1.2, 0.8]"
    :minDimensions="[0.5, 0.5]"
    :titleBarHeight="0.08"
    :contentResolution="2048"
    :billboard="true"
    title="Settings"
  >
    <xr-2d-rectangle width="100%" height="100%" :thickness="0" background="#2a2a2a">
      <xr-2d-stack-panel width="100%" height="100%" :isVertical="true" paddingTop="60px" paddingLeft="60px" paddingRight="60px">
        <xr-2d-text-block text="Settings" color="white" fontSize="80px" height="120px" />
        
        <xr-2d-text-block text="Volume" color="white" fontSize="50px" height="60px" :horizontalAlignment="0" />
        <xr-2d-slider :minimum="0" :maximum="100" :value="50" height="60px" color="#007bff" background="#444" paddingBottom="40px" />
        
        <xr-2d-button text="Back to Menu" height="100px" width="400px" color="white" fontSize="40px" background="#007bff" cornerRadius="10" @click="goBack" />
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
