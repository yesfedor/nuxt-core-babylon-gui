<script lang="ts" setup>
import {onMounted, provide, ref} from 'vue'
import XrCoreProvider from '../xr/core/provider.vue'
import XrAppRouterView from '../xr/app/router-view.vue'
import XrBridgeEnterButton from '../xr/bridge/enter-button.vue'
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
const xrProviderRef = ref<InstanceType<typeof XrCoreProvider> | null>(null)

onMounted(async () => {
  isXRSupported.value = await checkWebXRSupport()
})

const requestXRSession = async () => {
  if (xrProviderRef.value) {
    await xrProviderRef.value.enterXR()
  }
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
        <xr-core-provider ref="xrProviderRef" :routes="xrRoutes">
          <xr-app-router-view />
        </xr-core-provider>

        <xr-bridge-enter-button
          @request-session="requestXRSession"
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

