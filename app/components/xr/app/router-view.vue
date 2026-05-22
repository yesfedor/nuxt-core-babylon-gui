<template>
  <Suspense>
    <component
      :is="xrRouter.currentComponent.value"
      v-if="xrRouter.currentComponent.value"
    />
    <template #fallback>
      <!-- Можно добавить 3D-лоадер в будущем -->
      <xr-3d-holographic-slate :position="[0, 1.5, 2]" :dimensions="[0.5, 0.2]" :billboard="true">
        <xr-2d-text-block text="Loading..." color="white" fontSize="40px" />
      </xr-3d-holographic-slate>
    </template>
  </Suspense>
</template>

<script setup lang="ts">
import { useXRRouter } from './route'

const xrRouter = useXRRouter()
</script>
