import * as BABYLON from '@babylonjs/core'
import type { XRNode, XRObserverHandle } from './types'

type AnyRecord = Record<string, unknown>
type EventCallback = (...args: unknown[]) => void

const VECTOR3_KEYS = new Set(['position', 'rotation', 'scaling'])
const VECTOR2_KEYS = new Set(['dimensions', 'minDimensions'])

const OBSERVABLE_MAP: Record<string, string> = {
  click: 'onPointerClickObservable',
  pointerenter: 'onPointerEnterObservable',
  pointerout: 'onPointerOutObservable',
  pointermove: 'onPointerMoveObservable',
  pointerdown: 'onPointerDownObservable',
  pointerup: 'onPointerUpObservable',
  updatemodelvalue: 'onValueChangedObservable',
  toggle: 'onIsCheckedChangedObservable',
  textchange: 'onTextChangedObservable',
  focus: 'onFocusObservable',
  blur: 'onBlurObservable',
}

// Re-usable scratch for Vector2 setters that copy on assignment.
const SCRATCH_DIMENSIONS = new BABYLON.Vector2()

function resolveVector3Target(instance: AnyRecord, fieldKey: string): BABYLON.Vector3 | null {
  const direct = instance[fieldKey]
  if (direct instanceof BABYLON.Vector3) return direct

  const inner = (instance.mesh ?? instance.node) as AnyRecord | undefined
  const nested = inner?.[fieldKey]
  if (nested instanceof BABYLON.Vector3) return nested
  return null
}

function applyVector3(instance: AnyRecord, key: string, arr: number[]): boolean {
  const fieldKey = key === 'scale' ? 'scaling' : key
  const target = resolveVector3Target(instance, fieldKey)
  if (!target) return false
  target.set(Number(arr[0]), Number(arr[1]), Number(arr[2]))
  return true
}

function applyVector2(instance: AnyRecord, key: string, arr: number[]): boolean {
  // `dimensions` (HolographicSlate) is a setter that internally `copyFrom`s
  // the value and runs `_positionElements`, so passing scratch by reference is
  // safe. `minDimensions` is a plain field — assigning scratch by reference
  // would leak our scratch into the slate, so we copyFrom the live vector.
  if (key === 'minDimensions') {
    const live = instance[key]
    if (live instanceof BABYLON.Vector2) {
      live.set(Number(arr[0]), Number(arr[1]))
      return true
    }
    return false
  }

  const scratch = SCRATCH_DIMENSIONS
  scratch.set(Number(arr[0]), Number(arr[1]))
  try {
    instance[key] = scratch
    return true
  } catch {
    // Setter touches mesh internals that don't exist until the host attaches
    // the control. The pending entry will be retried after addControl.
    return false
  }
}

function patchEvent(el: XRNode, instance: AnyRecord, key: string, nextValue: unknown): void {
  const eventName = key.slice(2).toLowerCase()
  const observers = (el._observers ??= new Map<string, XRObserverHandle>())

  const existing = observers.get(eventName)
  if (existing) {
    existing.observable.remove(existing.observer)
    observers.delete(eventName)
  }

  if (typeof nextValue !== 'function') return

  const observableKey = OBSERVABLE_MAP[eventName]
  if (!observableKey) return

  const observable = instance[observableKey] as BABYLON.Observable<unknown> | undefined
  if (!observable || typeof observable.add !== 'function') return

  const observer = observable.add(nextValue as EventCallback) as BABYLON.Observer<unknown> | null
  if (!observer) return
  observers.set(eventName, { observable, observer })
}

export function patchXRProp(el: XRNode, key: string, _prevValue: unknown, nextValue: unknown): void {
  if (!el || !el.instance) return
  const instance = el.instance as unknown as AnyRecord

  // 1. Events → Babylon Observables
  if (key.startsWith('on')) {
    patchEvent(el, instance, key, nextValue)
    return
  }

  // 2. Declarative behaviors
  if (key === 'billboard') {
    const mode = nextValue
      ? BABYLON.TransformNode.BILLBOARDMODE_ALL
      : BABYLON.TransformNode.BILLBOARDMODE_NONE
    el._billboardMode = mode
    const node = (instance.node ?? instance.mesh ?? instance) as AnyRecord
    if (node && 'billboardMode' in node) node.billboardMode = mode
    return
  }

  if (key === 'followCamera') {
    const meshHost = (instance.mesh ?? instance) as {
      addBehavior?: (b: BABYLON.Behavior<BABYLON.TransformNode>) => unknown
      removeBehavior?: (b: BABYLON.Behavior<BABYLON.TransformNode>) => unknown
    }
    if (instance.typeName === 'NearMenu') {
      instance.isFollowed = !!nextValue
      return
    }
    if (nextValue) {
      if (!el._followBehavior) {
        el._followBehavior = new BABYLON.FollowBehavior()
        meshHost.addBehavior?.(el._followBehavior)
      }
    } else if (el._followBehavior) {
      meshHost.removeBehavior?.(el._followBehavior)
      el._followBehavior = null
    }
    return
  }

  // 3. Vector3 props (position/rotation/scale→scaling).
  //    Control3D.position pre-mount returns a fresh `Vector3.Zero()` — writing
  //    to that throw-away vector is lost. Park the value; replay in flush
  //    after the host attaches the control and the live vector exists.
  if (VECTOR3_KEYS.has(key === 'scale' ? 'scaling' : key) && Array.isArray(nextValue) && nextValue.length === 3) {
    const fieldKey = key === 'scale' ? 'scaling' : key
    ;(el._pendingVectorProps ??= new Map<string, number[]>()).set(fieldKey, nextValue as number[])
    applyVector3(instance, key, nextValue as number[])
    return
  }

  // 4. Vector2 props (dimensions / minDimensions). Apply via setter so
  //    HolographicSlate re-clamps against minDimensions and re-positions its
  //    sub-meshes. Pre-mount setter call may throw (mesh internals missing) —
  //    flush retries post-mount.
  if (VECTOR2_KEYS.has(key) && Array.isArray(nextValue) && nextValue.length === 2) {
    ;(el._pendingVectorProps ??= new Map<string, number[]>()).set(key, nextValue as number[])
    applyVector2(instance, key, nextValue as number[])
    return
  }

  // 5. Scalar / object props.
  if (instance[key] === nextValue) return
  instance[key] = nextValue
}

// minDimensions MUST land before dimensions so the slate's clamp logic sees
// the user-defined floor.
const VECTOR_FLUSH_ORDER = ['minDimensions', 'dimensions', 'position', 'rotation', 'scaling']

export function flushPendingVectorProps(el: XRNode): void {
  const pending = el._pendingVectorProps
  if (!pending || !el.instance) return
  const instance = el.instance as unknown as AnyRecord

  for (const key of VECTOR_FLUSH_ORDER) {
    const value = pending.get(key)
    if (!value) continue
    if (VECTOR2_KEYS.has(key)) applyVector2(instance, key, value)
    else applyVector3(instance, key, value)
  }
  pending.clear()
}
