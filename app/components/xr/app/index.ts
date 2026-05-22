import { createRenderer } from '@vue/runtime-core'
import * as BABYLON from '@babylonjs/core'
import * as GUI from '@babylonjs/gui'
import { isXRRootContainer, type XRComponentType, type XRNode, type XRNodeType, type XRParent, type XRRootContainer } from './types'
import { destroyNode } from '../composables/useXRObservable'
import { xrComponentRegistry } from './registry'
import { patchXRProp } from './props'

type AnyRecord = Record<string, unknown>

interface ControlContainer {
  addControl: (control: unknown) => unknown
  removeControl?: (control: unknown) => unknown
}

interface SlateLike {
  content?: GUI.Control
}

let wrapperSeq = 0

function isType3D(type: XRNodeType | undefined): boolean {
  return !!type && type.startsWith('3d-')
}

function isType2D(type: XRNodeType | undefined): boolean {
  return !!type && type.startsWith('2d-')
}

function findRootContainer(parent: XRParent): XRRootContainer | null {
  let cursor: XRParent = parent
  while (cursor) {
    if (isXRRootContainer(cursor)) return cursor
    cursor = (cursor as XRNode).parent
  }
  return null
}

function resolveScene(parent: XRParent): BABYLON.Scene | null {
  const root = findRootContainer(parent)
  if (root) return root.scene

  let cursor: XRParent = parent
  while (cursor && !isXRRootContainer(cursor)) {
    const inst = (cursor as XRNode).instance as
      | (AnyRecord & { _host?: { scene?: BABYLON.Scene }, getScene?: () => BABYLON.Scene })
      | null
    if (inst) {
      if (inst._host?.scene) return inst._host.scene
      if (typeof inst.getScene === 'function') return inst.getScene()
    }
    cursor = (cursor as XRNode).parent
  }
  return null
}

function asContainer(instance: unknown): ControlContainer | null {
  if (!instance) return null
  const candidate = instance as Partial<ControlContainer>
  return typeof candidate.addControl === 'function' ? (candidate as ControlContainer) : null
}

function bridge2DInto3D(el: XRNode, parent: XRNode): boolean {
  const scene = resolveScene(parent)
  if (!scene) {
    console.warn('[XR] Cannot bridge 2D control into 3D parent — scene unavailable')
    return false
  }
  const inst = el.instance as GUI.Control | null
  if (!inst) return false

  const id = `xr-bridge-${++wrapperSeq}`
  const plane = BABYLON.MeshBuilder.CreatePlane(`${id}-plane`, { width: 1, height: 1 }, scene)
  plane.isPickable = true

  const adt = GUI.AdvancedDynamicTexture.CreateForMesh(plane, 1024, 1024, true)
  adt.addControl(inst)

  const meshButton = new GUI.MeshButton3D(plane, id)
  const parentInst = parent.instance as unknown as ControlContainer | null
  const container = parentInst ? asContainer(parentInst) : null
  if (!container) {
    adt.dispose()
    plane.dispose()
    meshButton.dispose()
    return false
  }
  container.addControl(meshButton)

  el._wrapperMesh = plane
  el._wrapperADT = adt
  el._wrapperMeshButton = meshButton
  return true
}

function disposeBridge(el: XRNode): void {
  const button = el._wrapperMeshButton
  const adt = el._wrapperADT
  const mesh = el._wrapperMesh

  if (button) {
    const host = (button as unknown as { _host?: ControlContainer })._host ?? null
    const parentInst = el.parent && !isXRRootContainer(el.parent) ? (el.parent as XRNode).instance : null
    const container = asContainer(parentInst) ?? (host as ControlContainer | null)
    container?.removeControl?.(button)
    button.dispose()
  }
  if (adt) adt.dispose()
  if (mesh) mesh.dispose(false, true)

  el._wrapperMeshButton = null
  el._wrapperADT = null
  el._wrapperMesh = null
}

function applyDeferredProps(el: XRNode): void {
  if (el._billboardMode === undefined || !el.instance) return
  const inst = el.instance as unknown as AnyRecord
  const node = (inst.node ?? inst.mesh ?? inst) as AnyRecord
  if (node && 'billboardMode' in node) node.billboardMode = el._billboardMode
}

export const { render, createApp } = createRenderer<XRComponentType, XRComponentType>({
  createElement(type, _isSVG, _isCustom, _props): XRComponentType {
    const componentDef = xrComponentRegistry[type]
    if (!componentDef) {
      return { type: 'unknown', instance: null }
    }
    const node: XRNode = {
      type: componentDef.type,
      instance: componentDef.factory(),
      _pool: componentDef.pool ?? null,
    }
    return node
  },

  insert(el, parent, _anchor) {
    if (!el) return
    el.parent = parent as XRParent

    if (!el.instance || el.isFragment || el.nodeType === 'comment' || el.nodeType === 'text') return
    if (!parent) return

    // 1. Mount into XR root container
    if (isXRRootContainer(parent)) {
      if (isType3D(el.type)) {
        parent.gui3DManager.addControl(el.instance as GUI.Control3D)
      } else if (isType2D(el.type)) {
        parent.advancedTexture.addControl(el.instance as GUI.Control)
      }
      applyDeferredProps(el)
      return
    }

    const parentNode = parent as XRNode
    const parentInst = parentNode.instance
    if (!parentInst) return

    // 2. HolographicSlate slot — content viewport (2D under a 3D shell).
    if (parentNode.type === '3d-holographic-slate') {
      ;(parentInst as unknown as SlateLike).content = el.instance as GUI.Control
      applyDeferredProps(el)
      return
    }

    // 3. 2D-in-3D bridge: wrap plane → ADT → MeshButton3D.
    if (isType3D(parentNode.type) && isType2D(el.type)) {
      if (bridge2DInto3D(el, parentNode)) {
        applyDeferredProps(el)
        return
      }
    }

    // 4. Standard addControl path.
    const container = asContainer(parentInst)
    if (container) {
      container.addControl(el.instance)
      applyDeferredProps(el)
    }
  },

  remove(el) {
    if (!el || !el.instance) return

    // 1. Detach from parent (bridge wrapper, control3D, control, root).
    if (el._wrapperMeshButton) {
      disposeBridge(el)
    } else {
      const parent = el.parent
      if (parent && isXRRootContainer(parent)) {
        if (isType3D(el.type)) parent.gui3DManager.removeControl(el.instance as GUI.Control3D)
        else if (isType2D(el.type)) parent.advancedTexture.removeControl(el.instance as GUI.Control)
      } else if (parent) {
        const container = asContainer((parent as XRNode).instance)
        container?.removeControl?.(el.instance)
      }
    }

    // 2. Clear Vue→Babylon observer bridges.
    if (el._observers) {
      for (const obs of Object.values(el._observers)) obs.remove()
      el._observers = undefined
    }

    // 3. Detach FollowBehavior, if any.
    if (el._followBehavior) {
      const inst = el.instance as unknown as {
        mesh?: { removeBehavior?: (b: BABYLON.Behavior<BABYLON.TransformNode>) => unknown }
        removeBehavior?: (b: BABYLON.Behavior<BABYLON.TransformNode>) => unknown
      }
      ;(inst.removeBehavior ?? inst.mesh?.removeBehavior)?.call(inst.mesh ?? inst, el._followBehavior)
      el._followBehavior = null
    }

    // 4. Pool fast-path: release & hide, skip destroyNode entirely.
    if (el._pool) {
      const pooled = el.instance as unknown as GUI.Control3D
      el._pool.release(pooled)
      el.instance = null
      el.parent = null
      return
    }

    // 5. Deep VRAM cleanup for one-off nodes.
    destroyNode(el.instance)
    el.instance = null
    el.parent = null
  },

  patchProp(el, key, prevValue, nextValue) {
    if (!el) return
    patchXRProp(el, key, prevValue, nextValue)
  },

  createText(text): XRComponentType {
    return { type: 'unknown', instance: null, nodeType: 'text', text }
  },

  createComment(text): XRComponentType {
    return { type: 'unknown', instance: null, nodeType: 'comment', text }
  },

  setText(_node, _text) {
    // No-op: textual VNodes are surfaced via setElementText / `text` prop.
  },

  setElementText(node, text) {
    if (!node || !node.instance) return
    const inst = node.instance as unknown as AnyRecord
    if ('text' in inst) inst.text = text
  },

  parentNode(node) {
    if (!node) return null
    const parent = node.parent
    if (!parent || isXRRootContainer(parent)) return null
    return parent as XRNode
  },

  nextSibling(_node) {
    return null
  },

  querySelector(_selector) {
    return null
  },

  setScopeId(_el, _id) {
    // No-op
  },

  cloneNode(el) {
    return { ...el }
  },

  insertStaticContent(_content, _parent, _anchor, _isSVG, _start, _end) {
    return [null, null]
  },
})
