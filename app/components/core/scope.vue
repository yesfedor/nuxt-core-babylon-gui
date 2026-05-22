<script lang="ts" setup>
import {onMounted, provide, ref} from 'vue'
import {xrRoutes} from '../xr/views/routes'
import {checkWebXRSupport} from '../xr/utils/webxr-check'

interface Props {
  /** The name of the user */
  name?: string
}

const props = defineProps<Props>()

provide(props.name || 'default-scope', {
  scope: {},
})

const isXRSupported = ref(false)
const isXRLoadRequested = ref(false)
const isXRReady = ref(false)
const isXRActive = ref(false)
let enterXRCallback: (() => Promise<void>) | null = null

onMounted(async () => {
  isXRSupported.value = await checkWebXRSupport()
})

const requestLoad = () => {
  isXRLoadRequested.value = true
}

const onXRReady = (enterXR: () => Promise<void>) => {
  enterXRCallback = enterXR
  isXRReady.value = true
}

const requestEnter = async () => {
  if (enterXRCallback) {
    await enterXRCallback()
  }
}

const onSessionStarted = () => {
  isXRActive.value = true
}

const onSessionEnded = () => {
  isXRActive.value = false
}
</script>

<template>
  <section class="app-common-scope">
    <nuxt-loading-indicator
      :throttle="0"
      :duration="5e3"
    />

    <client-only>
      <div class="xr-overlay" v-if="isXRSupported">
        <LazyXrCoreProvider 
          v-if="isXRLoadRequested" 
          :routes="xrRoutes"
          @ready="onXRReady"
          @session-started="onSessionStarted"
          @session-ended="onSessionEnded"
        >
          <LazyXrAppRouterView />
        </LazyXrCoreProvider>

        <LazyXrBridgeEnterButton
          v-if="!isXRActive"
          :is-loading="isXRLoadRequested && !isXRReady"
          :is-ready="isXRReady"
          @request-load="requestLoad"
          @request-enter="requestEnter"
        />
      </div>
    </client-only>
  </section>
</template>

<style scoped>
.xr-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Let clicks pass through to the main app if XR is in background */
  z-index: 9999;
}
</style>

