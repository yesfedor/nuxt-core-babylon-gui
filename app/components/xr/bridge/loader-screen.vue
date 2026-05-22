<template>
  <div
    v-if="isLoading"
    class="xr-loader-screen"
  >
    <div class="spinner"></div>
    <p>Loading XR Assets...</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isLoading: boolean
}>()
</script>

<style scoped>
.xr-loader-screen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  z-index: 2000;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
