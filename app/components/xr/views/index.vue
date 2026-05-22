<template>
  <!--
    NearMenu auto-positions in front of the user and (with `followCamera`)
    tracks head movement. HolographicButton renders correctly through the
    GUI3DManager utility layer in both immersive-ar and immersive-vr — no
    world-space placement guesswork required.
  -->
  <xr-3d-near-menu :follow-camera="true">
    <xr-3d-touch-holographic-button
      text="Home"
      @click="goHome"
    />
    <xr-3d-touch-holographic-button
      text="Settings"
      @click="goToSettings"
    />
    <xr-3d-touch-holographic-button
      text="Profile"
      @click="goToProfile"
    />
  </xr-3d-near-menu>
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
