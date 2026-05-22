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
  console.log('[SCOPE] requestLoad clicked')
  isXRLoadRequested.value = true
}

const onXRReady = async (enterXR: () => Promise<void>) => {
  console.log('[SCOPE] onXRReady received')
  isXRReady.value = true
  
  // Автоматический вход в VR при первой загрузке (если браузер еще помнит клик пользователя)
  try {
    console.log('[SCOPE] Attempting auto-enter XR...')
    await enterXR()
    console.log('[SCOPE] Auto-enter XR succeeded')
  } catch (e) {
    console.warn('[SCOPE] Auto-enter failed (user gesture likely expired). Waiting for manual click.', e)
    // Сохраняем коллбек, чтобы пользователь мог войти по второму клику
    enterXRCallback = enterXR
  }
}

const requestEnter = async () => {
  console.log('[SCOPE] requestEnter clicked')
  if (enterXRCallback) {
    try {
      console.log('[SCOPE] Calling enterXRCallback...')
      await enterXRCallback()
      console.log('[SCOPE] enterXRCallback succeeded')
    } catch (e) {
      console.error('[SCOPE] enterXRCallback failed:', e)
    }
  } else {
    console.error('[SCOPE] enterXRCallback is null!')
  }
}

const onSessionStarted = () => {
  console.log('[SCOPE] onSessionStarted received')
  isXRActive.value = true
}

const onSessionEnded = () => {
  console.log('[SCOPE] onSessionEnded received')
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

