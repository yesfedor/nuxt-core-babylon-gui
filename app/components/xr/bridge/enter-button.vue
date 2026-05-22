<template>
  <button
    class="xr-enter-button"
    :disabled="isLoading"
    @click="handleClick"
  >
    {{ label }}
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { XRSessionMode } from '../utils/webxr-check'

const props = defineProps<{
  isLoading?: boolean
  isReady?: boolean
  mode?: XRSessionMode | null
}>()

const emit = defineEmits<{
  (e: 'request-load' | 'request-enter'): void
}>()

const modeLabel = computed<string>(() =>
  props.mode === 'immersive-ar' ? 'AR' : 'VR',
)

const label = computed<string>(() => {
  if (props.isLoading) return `Loading ${modeLabel.value}…`
  if (props.isReady) return `Enter ${modeLabel.value}`
  return `Open ${modeLabel.value}`
})

const handleClick = (): void => {
  emit(props.isReady ? 'request-enter' : 'request-load')
}
</script>

<style scoped>
.xr-enter-button {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  z-index: 1000;
  pointer-events: auto;
}

.xr-enter-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.xr-enter-button:disabled {
  background-color: #555;
  cursor: not-allowed;
}
</style>
