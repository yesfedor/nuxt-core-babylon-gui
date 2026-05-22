<template>
  <!--
    Lightweight 3D menu: StackPanel3D arranges Button3D children in a
    column. Button3D uses a procedural Box mesh + AdvancedDynamicTexture for
    the label — no GLB downloads, no MRTK Fluent shaders.
  -->
  <xr-3d-stack-panel
    :position="[0, 1.5, 1.5]"
    :margin="0.05"
  >
    <xr-3d-button
      name="home"
      @click="goHome"
    >
      <xr-2d-text-block
        text="Home"
        color="white"
        font-size="48"
      />
    </xr-3d-button>
    <xr-3d-button
      name="settings"
      @click="goToSettings"
    >
      <xr-2d-text-block
        text="Settings"
        color="white"
        font-size="48"
      />
    </xr-3d-button>
    <xr-3d-button
      name="profile"
      @click="goToProfile"
    >
      <xr-2d-text-block
        text="Profile"
        color="white"
        font-size="48"
      />
    </xr-3d-button>
  </xr-3d-stack-panel>
</template>

<script setup lang="ts">
import { useXRRouter } from '../app/route'

const router = useXRRouter()

const goHome = (): void => {
  router.replace('/')
}

const goToSettings = (): void => {
  router.push('/settings')
}

const goToProfile = (): void => {
  router.push('/profile')
}
</script>
