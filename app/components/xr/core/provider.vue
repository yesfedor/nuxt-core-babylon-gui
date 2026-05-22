<template>
  <div class="xr-core-provider">
    <canvas
      ref="renderCanvas"
      class="xr-canvas"
      :class="{ 'is-active': isXRActive }"
    ></canvas>
    <!-- Vue DOM Renderer больше не рендерит слоты напрямую -->
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
import { xrRouter, type XRRoute } from '../app/route'

const props = defineProps<{
  routes?: XRRoute[]
}>()

if (props.routes) {
  xrRouter.addRoutes(props.routes)
}

const renderCanvas = ref<HTMLCanvasElement | null>(null)
const isReady = ref(false)
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
const parent = getCurrentInstance()
let xrApp: any = null

const renderLoop = () => {
  scene.value?.render()
}

onMounted(async () => {
  if (!renderCanvas.value) return

  engine.value = new BABYLON.Engine(renderCanvas.value, true)
  scene.value = new BABYLON.Scene(engine.value)

  // Делаем фон прозрачным, чтобы не перекрывать 2D сайт
  scene.value.clearColor = new BABYLON.Color4(0, 0, 0, 0)

  // Basic camera and light for setup
  const camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 1.5, -3), scene.value)
  camera.setTarget(BABYLON.Vector3.Zero())
  camera.attachControl(renderCanvas.value, true)

  const light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), scene.value)
  light.intensity = 0.7

  try {
    try {
      console.log('[PROVIDER] Requesting createDefaultXRExperienceAsync (AR)...')
      xrHelper.value = await scene.value.createDefaultXRExperienceAsync({
        uiOptions: {
          sessionMode: 'immersive-ar', // Пробуем AR (Passthrough) сначала
          referenceSpaceType: 'local-floor',
        },
        disableDefaultUI: true,
      })
    } catch (e) {
      console.log('[PROVIDER] AR not supported, falling back to VR')
      // Если AR не поддерживается (например на десктопе), фоллбек на VR
      xrHelper.value = await scene.value.createDefaultXRExperienceAsync({
        uiOptions: {
          sessionMode: 'immersive-vr',
          referenceSpaceType: 'local-floor',
        },
        disableDefaultUI: true,
      })

      // В VR режиме делаем фон темным, чтобы не было видно "пустоты"
      scene.value.clearColor = new BABYLON.Color4(0.1, 0.1, 0.15, 1)
    }

    // Initialize XR Input Bridge and Dormant Mode logic
    useXR(scene.value, xrHelper.value)

    // Инициализация менеджера 3D GUI
    gui3DManager.value = new GUI.GUI3DManager(scene.value)

    isReady.value = true

    // --- МОСТ МЕЖДУ VUE DOM RENDERER И XR CUSTOM RENDERER ---
    const rootContainer = document.createElement('div')
    ;(rootContainer as any).__isXRRoot = true
    ;(rootContainer as any).gui3DManager = gui3DManager.value
    ;(rootContainer as any).advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('XR-Root-UI')
    ;(rootContainer as any).scene = scene.value

    xrApp = createXRApp({
      name: 'XRRoot',
      setup() {
        provide('xr-engine', engine)
        provide('xr-scene', scene)
        provide('xr-helper', xrHelper)
        provide('xr-gui3d-manager', gui3DManager)
        return () => slots.default ? slots.default() : null
      },
    })

    if (parent) {
      Object.assign(xrApp._context, parent.appContext)
    }

    xrApp.mount(rootContainer)

    // Управляем циклом рендеринга только когда мы в XR
    xrHelper.value.baseExperience.onStateChangedObservable.add((state) => {
      console.log('[PROVIDER] XR State changed:', state)
      if (state === BABYLON.WebXRState.IN_XR) {
        console.log('[PROVIDER] IN_XR state reached')
        isXRActive.value = true
        emit('session-started')
      } else if (state === BABYLON.WebXRState.NOT_IN_XR) {
        console.log('[PROVIDER] NOT_IN_XR state reached')
        isXRActive.value = false
        emit('session-ended')
      } else if (state === BABYLON.WebXRState.ENTERING_XR) {
        console.log('[PROVIDER] Entering XR...')
      } else if (state === BABYLON.WebXRState.EXITING_XR) {
        console.log('[PROVIDER] Exiting XR...')
      }
    })

    // Рендерим один кадр для компиляции шейдеров
    scene.value.executeWhenReady(() => {
      console.log('[PROVIDER] Scene executeWhenReady fired')
      scene.value?.render()

      // Запускаем постоянный рендер-луп, чтобы сцена обновлялась и реагировала на контроллеры
      engine.value?.runRenderLoop(renderLoop)

      console.log('[PROVIDER] Emitting @ready with enterXR function')
      emit('ready', enterXR)
    })
  } catch (e) {
    console.error('[PROVIDER] WebXR not supported or failed to initialize', e)
  }
})

const enterXR = async () => {
  console.log('[PROVIDER] enterXR called!')
  if (xrHelper.value) {
    try {
      // Пытаемся войти в тот режим, который удалось инициализировать
      const sessionMode = xrHelper.value.baseExperience.sessionManager.sessionMode || 'immersive-vr'
      console.log(`[PROVIDER] Calling xrHelper.baseExperience.enterXRAsync(${sessionMode})...`)
      await xrHelper.value.baseExperience.enterXRAsync(sessionMode, 'local-floor')
      console.log('[PROVIDER] Successfully entered XR')
    } catch (err) {
      console.error('[PROVIDER] Failed to enter XR in enterXRAsync:', err)
      throw err
    }
  } else {
    console.error('[PROVIDER] xrHelper is null!')
  }
}

const emit = defineEmits<{
  (e: 'ready', enterXR: () => Promise<void>): void
  (e: 'session-started'): void
  (e: 'session-ended'): void
}>()

onBeforeUnmount(() => {
  if (xrApp) xrApp.unmount()
  engine.value?.dispose()
})
</script>

<style scoped>
.xr-core-provider {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none; /* Пропускаем клики сквозь провайдер */
}

.xr-canvas {
  width: 100%;
  height: 100%;
  touch-action: none;
  outline: none;
  opacity: 0;
  pointer-events: none; /* Запрещаем взаимодействие с канвасом до входа в XR */
  transition: opacity 0.3s ease;
}

.xr-canvas.is-active {
  opacity: 1;
  pointer-events: auto; /* Разрешаем клики только когда мы в XR */
}
</style>
