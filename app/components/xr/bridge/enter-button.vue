<template>
  <button
    class="xr-enter-button"
    @click="requestSession"
  >
    Enter WebXR
  </button>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'request-session'): void
}>()

const requestSession = () => {
  emit('request-session')
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

.xr-enter-button:hover {
  background-color: #0056b3;
}
</style>
