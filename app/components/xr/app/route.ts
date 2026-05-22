import { shallowRef, computed, type Component } from 'vue'

export interface XRRoute {
  path: string
  name?: string
  component: Component
}

class XRRouter {
  private routes = shallowRef<XRRoute[]>([])
  private history = shallowRef<string[]>(['/'])
  private currentIndex = shallowRef<number>(0)

  public currentPath = computed(() => this.history.value[this.currentIndex.value])

  public currentRoute = computed(() => {
    return this.routes.value.find(r => r.path === this.currentPath.value) || this.routes.value[0]
  })

  public currentComponent = computed(() => this.currentRoute.value?.component)

  addRoutes(newRoutes: XRRoute[]) {
    this.routes.value = newRoutes
  }

  push(path: string) {
    // Убираем "будущее" если мы откатились назад и делаем push
    this.history.value = this.history.value.slice(0, this.currentIndex.value + 1)
    this.history.value.push(path)
    this.currentIndex.value++
  }

  replace(path: string) {
    this.history.value[this.currentIndex.value] = path
  }

  back() {
    if (this.currentIndex.value > 0) {
      this.currentIndex.value--
    }
  }

  forward() {
    if (this.currentIndex.value < this.history.value.length - 1) {
      this.currentIndex.value++
    }
  }
}

export const xrRouter = new XRRouter()

export function useXRRouter() {
  return xrRouter
}

export function useXRRoute() {
  return xrRouter.currentRoute
}
