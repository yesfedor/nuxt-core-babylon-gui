import { onBeforeUnmount } from 'vue'
import type * as BABYLON from '@babylonjs/core'

interface DisposableNode {
  advancedDynamicTexture?: { dispose: () => void }
  material?: {
    diffuseTexture?: { dispose: () => void } | null
    dispose: (forceDisposeEffect?: boolean, forceDisposeTextures?: boolean) => void
  } | null
  _registeredObservers?: Array<{ remove: () => void }>
  behaviors?: Array<BABYLON.Behavior<BABYLON.TransformNode>>
  removeBehavior?: (behavior: BABYLON.Behavior<BABYLON.TransformNode>) => void
  mesh?: {
    behaviors?: Array<BABYLON.Behavior<BABYLON.TransformNode>>
    removeBehavior?: (behavior: BABYLON.Behavior<BABYLON.TransformNode>) => void
  }
  dispose?: (doNotRecurse?: boolean, disposeMaterialAndTextures?: boolean) => void
}

export function destroyNode(node: unknown): void {
  if (!node) return
  const target = node as DisposableNode

  // 1. Dispose GUI dependencies
  safeRun(() => target.advancedDynamicTexture?.dispose())

  // 2. Erase materials & texture buffer memory
  if (target.material) {
    safeRun(() => target.material?.diffuseTexture?.dispose())
    safeRun(() => target.material?.dispose(true, true))
  }

  // 3. Clear observers to break closures and GC cycles
  if (target._registeredObservers) {
    target._registeredObservers.forEach(obs => safeRun(() => obs.remove()))
    target._registeredObservers = []
  }

  // 4. Detach behaviors (from instance and its underlying mesh, if any)
  if (target.behaviors && target.removeBehavior) {
    const remove = target.removeBehavior.bind(target)
    target.behaviors.slice().forEach(b => safeRun(() => remove(b)))
  }
  if (target.mesh?.behaviors && target.mesh.removeBehavior) {
    const remove = target.mesh.removeBehavior.bind(target.mesh)
    target.mesh.behaviors.slice().forEach(b => safeRun(() => remove(b)))
  }

  // 5. Dispose the component itself. Babylon-side disposers occasionally throw
  // when an internal sub-node was never constructed (e.g. HolographicSlate
  // unmounted before its content mesh was provisioned). Swallow + log so a
  // single bad disposer does not abort the whole unmount cascade.
  if (typeof target.dispose === 'function') {
    safeRun(() => target.dispose?.(false, true))
  }
}

function safeRun(fn: () => void): void {
  try {
    fn()
  } catch (err) {
    console.warn('[XR] destroyNode step failed:', err)
  }
}

export function useXRObservable<T>(
  observable: BABYLON.Observable<T>,
  callback: (eventData: T, eventState: BABYLON.EventState) => void,
): BABYLON.Observer<T> | null {
  const observer = observable.add(callback)

  onBeforeUnmount(() => {
    if (observer) {
      observable.remove(observer)
    }
  })

  return observer
}
