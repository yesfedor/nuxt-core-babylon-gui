import { onBeforeUnmount } from 'vue'
import type * as BABYLON from '@babylonjs/core'

export function destroyNode(node: any) {
  if (!node) return

  // 1. Dispose GUI dependencies
  if (node.advancedDynamicTexture) {
    node.advancedDynamicTexture.dispose()
  }

  // 2. Erase Materials & Texture buffer memory
  if (node.material) {
    if (node.material.diffuseTexture) node.material.diffuseTexture.dispose()
    node.material.dispose(true, true)
  }

  // 3. Clear observers to break closures and garbage collector cycles
  if (node._registeredObservers) {
    node._registeredObservers.forEach((obs: any) => obs.remove())
    node._registeredObservers = []
  }

  // 4. Очистка поведений (Behaviors)
  if (node.behaviors) {
    node.behaviors.forEach((b: any) => node.removeBehavior(b))
  }
  if (node.mesh && node.mesh.behaviors) {
    node.mesh.behaviors.forEach((b: any) => node.mesh.removeBehavior(b))
  }

  // 5. Dispose the component itself
  if (typeof node.dispose === 'function') {
    node.dispose(false, true)
  }
}

export function useXRObservable<T>(
  observable: BABYLON.Observable<T>,
  callback: (eventData: T, eventState: BABYLON.EventState) => void,
) {
  const observer = observable.add(callback)

  onBeforeUnmount(() => {
    if (observer) {
      observable.remove(observer)
    }
  })

  return observer
}
