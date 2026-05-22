<script lang="ts" setup>
import { onMounted, provide, ref, shallowRef } from 'vue'
import { xrRoutes } from '../xr/views/routes'
import { resolvePreferredXRMode, type XRSessionMode } from '../xr/utils/webxr-check'
// CRITICAL: XrAppRouterView must be a SYNCHRONOUS import. Nuxt's `Lazy*`
// prefix wraps the component in `defineAsyncComponent`, which produces an
// `AsyncComponentWrapper`. Inside our XR custom renderer that wrapper breaks
// the parent/container chain — the root template element of the resolved
// view arrives at `insert()` with `parent === null`, so the view never
// attaches to GUI3DManager.
import XrAppRouterView from '../xr/app/router-view.vue'

interface Props {
  /** The name of the user-scope provider. */
  name?: string
}

const props = defineProps<Props>()

provide(props.name || 'default-scope', {
  scope: {},
})

const xrMode = shallowRef<XRSessionMode | null>(null)
const isLoadRequested = ref(false)
const isReady = ref(false)
const isActive = ref(false)
let enterXR: (() => Promise<void>) | null = null

onMounted(async () => {
  xrMode.value = await resolvePreferredXRMode()
})

const requestLoad = (): void => {
  isLoadRequested.value = true
}

const onReady = async (enterXRFn: () => Promise<void>): Promise<void> => {
  isReady.value = true
  enterXR = enterXRFn
  // Try a transparent auto-enter — the click that requested load still counts
  // as a user gesture for `enterXRAsync` on the major runtimes. If the gesture
  // expired, the button stays visible and the second click enters manually.
  try {
    await enterXRFn()
  } catch {
    // Silent: user will click "Enter" again.
  }
}

const requestEnter = async (): Promise<void> => {
  if (!enterXR) return
  try {
    await enterXR()
  } catch (err) {
    console.error('[xr-scope] enterXR failed:', err)
  }
}

const onSessionStarted = (): void => {
  isActive.value = true
}

const onSessionEnded = (): void => {
  isActive.value = false
}

const onInitFailed = (err: unknown): void => {
  console.error('[xr-scope] XR initialisation failed:', err)
  // Hide the button so the user is not stuck clicking a dead control.
  xrMode.value = null
}
</script>

<template>
  <section class="app-common-scope">
    <nuxt-loading-indicator
      :throttle="0"
      :duration="5e3"
    />

    <client-only>
      <div
        v-if="xrMode"
        class="xr-overlay"
      >
        <LazyXrCoreProvider
          v-if="isLoadRequested"
          :routes="xrRoutes"
          :mode="xrMode"
          @ready="onReady"
          @session-started="onSessionStarted"
          @session-ended="onSessionEnded"
          @init-failed="onInitFailed"
        >
          <XrAppRouterView />
        </LazyXrCoreProvider>

        <LazyXrBridgeEnterButton
          v-if="!isActive"
          :is-loading="isLoadRequested && !isReady"
          :is-ready="isReady"
          :mode="xrMode"
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
  pointer-events: none;
  z-index: 9999;
}
</style>
