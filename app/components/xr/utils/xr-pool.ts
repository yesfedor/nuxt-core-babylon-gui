export class XRNodePool<T extends { isVisible: boolean }> {
  private activeNodes = new Set<T>()
  private inactivePool: T[] = []

  constructor(private factory: () => T) {}

  acquire(): T {
    let node: T
    if (this.inactivePool.length > 0) {
      node = this.inactivePool.pop()!
    } else {
      node = this.factory()
    }
    node.isVisible = true
    this.activeNodes.add(node)
    return node
  }

  release(node: T) {
    if (this.activeNodes.has(node)) {
      this.activeNodes.delete(node)
      node.isVisible = false
      this.inactivePool.push(node)
    }
  }

  getActiveNodes(): T[] {
    return Array.from(this.activeNodes)
  }
}

// Fast-Path Reactivity Buffer
export class FastPathBuffer {
  private buffer = new Map<any, Record<string, any>>()

  set(node: any, key: string, value: any) {
    if (!this.buffer.has(node)) {
      this.buffer.set(node, {})
    }
    this.buffer.get(node)![key] = value
  }

  sync() {
    for (const [node, props] of this.buffer.entries()) {
      for (const key in props) {
        node[key] = props[key]
      }
    }
    this.buffer.clear()
  }
}

export const globalFastPathBuffer = new FastPathBuffer()
