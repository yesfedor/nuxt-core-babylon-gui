<template>
  <div class="xr-core-provider">
    <canvas
      ref="renderCanvas"
      class="xr-canvas"
      :class="{ 'is-active': isXRActive }"
    ></canvas>
    <!-- Slot is captured by the XR custom renderer, not the DOM renderer. -->
    <slot v-if="false"></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, provide, shallowRef, useSlots, getCurrentInstance } from 'vue'
import * as BABYLON from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import * as GUI from '@babylonjs/gui'
import { useXR } from '../composables/useXR'
import { createApp as createXRApp } from '../app/index'
import type { XRNode, XRRootContainer } from '../app/types'
import { xrRouter, type XRRoute } from '../app/route'
import type { XRSessionMode } from '../utils/webxr-check'
import { xrLogger } from '../../utils/logger'

type XRApp = ReturnType<typeof createXRApp>
type XRRootElement = HTMLDivElement & XRRootContainer

const props = defineProps<{
  routes?: XRRoute[]
  // Caller is expected to have already probed support (see resolvePreferredXRMode)
  // and pass the resolved mode here. We do not probe again inside the provider.
  mode: XRSessionMode
}>()

const emit = defineEmits<{
  (e: 'ready', enterXR: () => Promise<void>): void
  (e: 'session-started' | 'session-ended'): void
  (e: 'init-failed', error: unknown): void
}>()

if (props.routes) {
  xrRouter.addRoutes(props.routes)
}

const renderCanvas = ref<HTMLCanvasElement | null>(null)
const isXRActive = ref(false)

const engine = shallowRef<BABYLON.Engine | null>(null)
const scene = shallowRef<BABYLON.Scene | null>(null)
const xrHelper = shallowRef<BABYLON.WebXRDefaultExperience | null>(null)
const gui3DManager = shallowRef<GUI.GUI3DManager | null>(null)

provide('xr-engine', engine)
provide('xr-scene', scene)
provide('xr-helper', xrHelper)
provide('xr-gui3d-manager', gui3DManager)

const slots = useSlots()
const parentInstance = getCurrentInstance()
let xrApp: XRApp | null = null

onMounted(async () => {
  if (!renderCanvas.value) return

  // `preserveDrawingBuffer` and `stencil` are off — both cost an extra
  // framebuffer copy per eye in stereo and we don't need either.
  const localEngine = new BABYLON.Engine(renderCanvas.value, true)
  const localScene = new BABYLON.Scene(localEngine)
  engine.value = localEngine
  scene.value = localScene

  // Standing-height fallback camera; the WebXR camera takes over on entry.
  const camera = new BABYLON.FreeCamera('xr-fallback-camera', new BABYLON.Vector3(0, 1.6, 0), localScene)
  camera.setTarget(new BABYLON.Vector3(0, 1.6, 1))
  camera.attachControl(renderCanvas.value, true)

  const light = new BABYLON.HemisphericLight('xr-light', new BABYLON.Vector3(0, 1, 0), localScene)
  light.intensity = 1.0

  try {
    // `local-floor` is universally supported across AR and VR runtimes (Quest,
    // SteamVR, Vision Pro, polyfilled emulators). Passthrough still works in
    // immersive-ar with local-floor; `unbounded` is optional and Babylon logs
    // a hard error when it falls back, which we want to avoid in production.
    const helper = await localScene.createDefaultXRExperienceAsync({
      uiOptions: { sessionMode: props.mode, referenceSpaceType: 'local-floor' },
      disableDefaultUI: true,
      optionalFeatures: true,
    })
    xrHelper.value = helper

    // AR: transparent canvas for passthrough. VR: solid dark fill.
    localScene.clearColor = props.mode === 'immersive-ar'
      ? new BABYLON.Color4(0, 0, 0, 0)
      : new BABYLON.Color4(0.05, 0.05, 0.08, 1)

    useXR(localScene, helper)

    gui3DManager.value = new GUI.GUI3DManager(localScene)

    const rootContainer = document.createElement('div') as XRRootElement
    rootContainer.__isXRRoot = true
    rootContainer.gui3DManager = gui3DManager.value
    rootContainer.advancedTexture = null
    rootContainer.scene = localScene
    rootContainer.ensureAdvancedTexture = () => {
      if (!rootContainer.advancedTexture) {
        rootContainer.advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('xr-root-fullscreen-ui')
      }
      return rootContainer.advancedTexture
    }

    xrApp = createXRApp({
      name: 'XRRoot',
      setup() {
        provide('xr-engine', engine)
        provide('xr-scene', scene)
        provide('xr-helper', xrHelper)
        provide('xr-gui3d-manager', gui3DManager)
        return () => (slots.default ? slots.default() : null)
      },
    })

    if (parentInstance) {
      Object.assign(xrApp._context, parentInstance.appContext)
    }

    xrApp.mount(rootContainer as unknown as XRNode)
    xrLogger.log('provider mounted — gui3D rootChildren=', gui3DManager.value.rootContainer.children.length, 'mode=', props.mode)

    helper.baseExperience.onStateChangedObservable.add((state) => {
      if (state === BABYLON.WebXRState.IN_XR) {
        isXRActive.value = true
        emit('session-started')
        xrLogger.log('IN_XR — gui3D rootChildren=',
          gui3DManager.value?.rootContainer.children.length,
          'meshes=', localScene.meshes.length)
      } else if (state === BABYLON.WebXRState.NOT_IN_XR) {
        isXRActive.value = false
        emit('session-ended')
      }
    })

    localScene.executeWhenReady(() => {
      localEngine.runRenderLoop(() => localScene.render())
      emit('ready', enterXR)
    })
  } catch (err) {
    emit('init-failed', err)
  }
})

const enterXR = async (): Promise<void> => {
  const helper = xrHelper.value
  if (!helper) throw new Error('[xr-provider] XR helper not initialised')
  await helper.baseExperience.enterXRAsync(props.mode, 'local-floor')
}

onBeforeUnmount(() => {
  if (xrApp) {
    xrApp.unmount()
    xrApp = null
  }
  gui3DManager.value?.dispose()
  // Engine.dispose tears down the WebGL context and frees all GPU resources;
  // it also disposes scene meshes and any ADTs backed by render textures.
  engine.value?.dispose()
  engine.value = null
  scene.value = null
  xrHelper.value = null
  gui3DManager.value = null
})
</script>

<style scoped>
.xr-core-provider {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.xr-canvas {
  width: 100%;
  height: 100%;
  touch-action: none;
  outline: none;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.xr-canvas.is-active {
  opacity: 1;
  pointer-events: auto;
}
</style>
