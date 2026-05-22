import { createRenderer } from '@vue/runtime-core'
import * as BABYLON from '@babylonjs/core'
import type { XRComponentType } from './types'
import { destroyNode } from '../composables/useXRObservable'
import { xrComponentRegistry } from './registry'
import { patchXRProp } from './props'

export const { render, createApp } = createRenderer<XRComponentType, XRComponentType>({
  createElement(type, isSVG, isCustom, props) {
    const componentDef = xrComponentRegistry[type]

    if (componentDef) {
      return { type: componentDef.type, instance: componentDef.factory() }
    }

    return { type: 'unknown', instance: null }
  },
  insert(el, parent, anchor) {
    if (el) {
      ;(el as any).parent = parent
    }

    if (!el || !el.instance || (el as any).isFragment || (el as any).nodeType === 'comment') {
      return // Robust filtration of Vue-internal comment/meta VNodes
    }

    if (!parent) return
    const childInst = el.instance
    const parentInst = parent.instance

    if (parentInst) {
      // Интеллектуальная обработка слотов (Контекст)
      if (parent.type === '3d-holographic-slate') {
        // Если родитель Slate, а ребенок - 2D текстура или контрол, кладем его в contentViewport
        parentInst.content = childInst
      } else if (typeof parentInst.addControl === 'function') {
        // Стандартное добавление в контейнер (StackPanel, Grid и т.д.)
        parentInst.addControl(childInst)
      }
    } else if ((parent as any).__isXRRoot) {
      // Монтирование в корневой провайдер
      if (el.type && el.type.startsWith('3d-') && (parent as any).gui3DManager) {
        ;(parent as any).gui3DManager.addControl(childInst)
      } else if (el.type && el.type.startsWith('2d-') && (parent as any).advancedTexture) {
        ;(parent as any).advancedTexture.addControl(childInst)
      }
    }

    // Применяем отложенные свойства, которые требуют наличия node/mesh (создаются после addControl)
    if (el._billboardMode !== undefined) {
      const node = childInst.node || childInst.mesh || childInst
      if (node && 'billboardMode' in node) {
        node.billboardMode = el._billboardMode
      }
    }
  },
  remove(el) {
    if (el && el.instance) {
      // 1. Убираем из родителя
      if (el.instance.parent && typeof el.instance.parent.removeControl === 'function') {
        el.instance.parent.removeControl(el.instance)
      } else if (el.parent && (el.parent as any).__isXRRoot) {
        if (el.type && el.type.startsWith('3d-') && (el.parent as any).gui3DManager) {
          ;(el.parent as any).gui3DManager.removeControl(el.instance)
        } else if (el.type && el.type.startsWith('2d-') && (el.parent as any).advancedTexture) {
          ;(el.parent as any).advancedTexture.removeControl(el.instance)
        }
      }

      // 2. Очищаем все Vue-обсерверы (Garbage Collection)
      if ((el as any)._observers) {
        Object.values((el as any)._observers).forEach((obs: any) => obs.remove())
        ;(el as any)._observers = null
      }

      // 3. Глубокая очистка
      destroyNode(el.instance)
    }
  },
  patchProp(el, key, prevValue, nextValue) {
    patchXRProp(el, key, prevValue, nextValue)
  },
  createText(text) {
    return { type: 'unknown', instance: null, nodeType: 'text', text } as any
  },
  createComment(text) {
    return { type: 'unknown', instance: null, nodeType: 'comment', text } as any
  },
  setText(node, text) {
    // No-op
  },
  setElementText(node, text) {
    if (node && node.instance && 'text' in node.instance) {
      node.instance.text = text
    }
  },
  parentNode(node) {
    return (node as any)?.parent || null
  },
  nextSibling(node) {
    return null
  },
  querySelector(selector) {
    return null
  },
  setScopeId(el, id) {
    // No-op
  },
  cloneNode(el) {
    return { ...el }
  },
  insertStaticContent(content, parent, anchor, isSVG, start, end) {
    return []
  },
})
