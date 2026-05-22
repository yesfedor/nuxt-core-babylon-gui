import * as BABYLON from '@babylonjs/core'
import type { XRNode } from './types'

type AnyRecord = Record<string, unknown>
type EventCallback = (...args: unknown[]) => void
type ObservableLike = { add: (cb: EventCallback) => BABYLON.Observer<unknown> }

const VECTOR3_KEYS = new Set(['position', 'rotation', 'scale', 'scaling'])
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

function resolveVectorTarget(instance: AnyRecord, fieldKey: string): unknown {
  const direct = instance[fieldKey]
  if (direct instanceof BABYLON.Vector3 || direct instanceof BABYLON.Vector2) return direct

  const inner = (instance.mesh ?? instance.node) as AnyRecord | undefined
  if (!inner) return undefined
  const nested = inner[fieldKey]
  if (nested instanceof BABYLON.Vector3 || nested instanceof BABYLON.Vector2) return nested
  return undefined
}

function patchVector(instance: AnyRecord, key: string, nextValue: unknown): boolean {
  // Babylon uses `scaling`, not `scale`. Map the declarative prop so we never
  // dump a raw array into the scene graph.
  const fieldKey = key === 'scale' ? 'scaling' : key

  if (!Array.isArray(nextValue)) return false

  const target = resolveVectorTarget(instance, fieldKey)

  if (target instanceof BABYLON.Vector3 && nextValue.length === 3) {
    target.set(Number(nextValue[0]), Number(nextValue[1]), Number(nextValue[2]))
    return true
  }
  if (target instanceof BABYLON.Vector2 && nextValue.length === 2) {
    target.set(Number(nextValue[0]), Number(nextValue[1]))
    return true
  }
  return false
}

function patchEvent(el: XRNode, instance: AnyRecord, key: string, nextValue: unknown): void {
  const eventName = key.slice(2).toLowerCase()
  const observers = (el._observers ??= {})

  const existing = observers[eventName]
  if (existing) {
    existing.remove()
    delete observers[eventName]
  }

  if (typeof nextValue !== 'function') return

  const observableKey = OBSERVABLE_MAP[eventName]
  if (!observableKey) return

  const observable = instance[observableKey] as ObservableLike | undefined
  if (!observable || typeof observable.add !== 'function') return

  const observer = observable.add(nextValue as EventCallback)
  observers[eventName] = observer as unknown as BABYLON.Observer<unknown>
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

  // 3. Vector3/Vector2 props — reuse the existing instance vectors.
  if ((VECTOR3_KEYS.has(key) || VECTOR2_KEYS.has(key)) && Array.isArray(nextValue)) {
    patchVector(instance, key, nextValue)
    return
  }

  // 4. Scalar / object props
  const fieldKey = key === 'scale' ? 'scaling' : key
  if (instance[fieldKey] === nextValue) return
  instance[fieldKey] = nextValue
}
