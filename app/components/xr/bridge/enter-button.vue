<template>
  <button class="xr-enter-button" @click="handleClick" :disabled="isLoading">
    {{ isLoading ? 'Loading Engine...' : (isReady ? 'Enter WebXR' : 'Load WebXR') }}
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  isLoading?: boolean
  isReady?: boolean
}>()

const emit = defineEmits<{
  (e: 'request-load'): void
  (e: 'request-enter'): void
}>()

const handleClick = () => {
  if (props.isReady) {
    emit('request-enter')
  } else {
    emit('request-load')
  }
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
  pointer-events: auto; /* Разрешаем клик по кнопке */
}

.xr-enter-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.xr-enter-button:disabled {
  background-color: #555;
  cursor: not-allowed;
}
</style>
