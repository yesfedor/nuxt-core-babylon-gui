import * as BABYLON from '@babylonjs/core'

export function patchXRProp(el: any, key: string, prevValue: any, nextValue: any) {
  const instance = el.instance
  if (!instance) return

  // 1. Обработка событий (Observables) -> маппинг Vue @events в Babylon Observables
  if (key.startsWith('on')) {
    const eventName = key.slice(2).toLowerCase() // onClick -> click
    el._observers = el._observers || {}

    // Удаляем старый слушатель, если он был
    if (el._observers[eventName]) {
      el._observers[eventName].remove()
      delete el._observers[eventName]
    }

    if (nextValue) {
      if (eventName === 'click' && instance.onPointerClickObservable) {
        el._observers[eventName] = instance.onPointerClickObservable.add(nextValue)
      } else if (eventName === 'pointerenter' && instance.onPointerEnterObservable) {
        el._observers[eventName] = instance.onPointerEnterObservable.add(nextValue)
      } else if (eventName === 'pointerout' && instance.onPointerOutObservable) {
        el._observers[eventName] = instance.onPointerOutObservable.add(nextValue)
      } else if (eventName === 'updatemodelvalue' && instance.onValueChangedObservable) {
        // Поддержка v-model для слайдеров и инпутов
        el._observers[eventName] = instance.onValueChangedObservable.add(nextValue)
      } else if (eventName === 'toggle' && instance.onIsCheckedChangedObservable) {
        // Поддержка v-model для чекбоксов
        el._observers[eventName] = instance.onIsCheckedChangedObservable.add(nextValue)
      }
    }
    return
  }

  // 2. Защита от бесконечного цикла реактивности (Value Equality Check)
  if (instance[key] === nextValue) return

  // 3. Декларативное поведение (Behaviors) и позиционирование в XR
  if (key === 'billboard') {
    el._billboardMode = nextValue ? BABYLON.TransformNode.BILLBOARDMODE_ALL : BABYLON.TransformNode.BILLBOARDMODE_NONE
    const node = instance.node || instance.mesh || instance
    if (node && 'billboardMode' in node) {
      node.billboardMode = el._billboardMode
    }
    return
  }

  if (key === 'followCamera') {
    if (instance.typeName === 'NearMenu') {
      instance.isFollowed = !!nextValue
    } else {
      if (nextValue) {
        if (!el._followBehavior) {
          el._followBehavior = new BABYLON.FollowBehavior()
          if (instance.addBehavior) instance.addBehavior(el._followBehavior)
          else if (instance.mesh?.addBehavior) instance.mesh.addBehavior(el._followBehavior)
        }
      } else if (el._followBehavior) {
        if (instance.removeBehavior) instance.removeBehavior(el._followBehavior)
        else if (instance.mesh?.removeBehavior) instance.mesh.removeBehavior(el._followBehavior)
        el._followBehavior = null
      }
    }
    return
  }

  // 4. Трансформация массивов в векторы (position="[0, 1, 2]")
  if (['position', 'rotation', 'scale'].includes(key) && Array.isArray(nextValue) && nextValue.length === 3) {
    const vec = new BABYLON.Vector3(nextValue[0], nextValue[1], nextValue[2])
    if (instance[key] instanceof BABYLON.Vector3) {
      instance[key].copyFrom(vec)
    } else if (instance.mesh && instance.mesh[key] instanceof BABYLON.Vector3) {
      instance.mesh[key].copyFrom(vec)
    }
    return
  }

  // 4.1 Трансформация массивов в Vector2 (dimensions="[1.2, 0.8]")
  if (['dimensions', 'minDimensions'].includes(key) && Array.isArray(nextValue) && nextValue.length === 2) {
    const vec = new BABYLON.Vector2(nextValue[0], nextValue[1])
    if (instance[key] instanceof BABYLON.Vector2) {
      instance[key].copyFrom(vec)
    } else {
      instance[key] = vec
    }
    return
  }

  // 5. Стандартное присвоение пропса (text, color, isVisible, cornerRadius и т.д.)
  if (key === 'contentResolution') {
    instance.contentResolution = nextValue
    return
  }
  
  instance[key] = nextValue
}
