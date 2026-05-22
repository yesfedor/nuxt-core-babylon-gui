import { ref } from 'vue'
import type * as BABYLON from '@babylonjs/core'

export interface XRInputBridge {
  pointerPosition: BABYLON.Vector3 | null
  isPinching: boolean
  isTriggerPressed: boolean
}

export function useXR(_scene?: BABYLON.Scene, xrHelper?: BABYLON.WebXRDefaultExperience) {
  const isDormant = ref(false)
  const inputBridge = ref<XRInputBridge>({
    pointerPosition: null,
    isPinching: false,
    isTriggerPressed: false,
  })

  const enterDormantMode = (): void => {
    isDormant.value = true
  }

  const exitDormantMode = (): void => {
    isDormant.value = false
  }

  if (xrHelper) {
    xrHelper.baseExperience.sessionManager.onXRSessionInit.add(() => exitDormantMode())
    xrHelper.baseExperience.sessionManager.onXRSessionEnded.add(() => enterDormantMode())

    xrHelper.input.onControllerAddedObservable.add((controller) => {
      controller.onMotionControllerInitObservable.add((motionController) => {
        const trigger = motionController.getMainComponent()
        if (!trigger) return
        trigger.onButtonStateChangedObservable.add((component) => {
          inputBridge.value.isTriggerPressed = component.pressed
        })
      })
    })
  }

  return {
    isDormant,
    inputBridge,
    enterDormantMode,
    exitDormantMode,
  }
}
