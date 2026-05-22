import type * as GUI from '@babylonjs/gui'

export interface PoolableNode {
  isVisible: boolean
}

export class XRNodePool<T extends PoolableNode> {
  private readonly activeNodes = new Set<T>()
  private readonly inactivePool: T[] = []

  constructor(
    private readonly factory: () => T,
    private readonly reset?: (node: T) => void,
  ) {}

  acquire(): T {
    const node = this.inactivePool.length > 0 ? this.inactivePool.pop()! : this.factory()
    node.isVisible = true
    this.activeNodes.add(node)
    return node
  }

  release(node: T): boolean {
    if (!this.activeNodes.has(node)) return false
    this.activeNodes.delete(node)
    node.isVisible = false
    this.reset?.(node)
    this.inactivePool.push(node)
    return true
  }

  has(node: T): boolean {
    return this.activeNodes.has(node)
  }

  getActiveNodes(): T[] {
    return Array.from(this.activeNodes)
  }

  size(): { active: number, inactive: number } {
    return { active: this.activeNodes.size, inactive: this.inactivePool.length }
  }

  dispose(): void {
    const disposeOne = (node: T): void => {
      const disposable = node as unknown as { dispose?: () => void }
      if (typeof disposable.dispose === 'function') disposable.dispose()
    }
    this.activeNodes.forEach(disposeOne)
    this.inactivePool.forEach(disposeOne)
    this.activeNodes.clear()
    this.inactivePool.length = 0
  }
}

export type AnyPoolableControl = GUI.Control3D & PoolableNode

export const xrPoolRegistry = new Map<string, XRNodePool<AnyPoolableControl>>()

export function registerXRPool<T extends AnyPoolableControl>(
  tag: string,
  factory: () => T,
  reset?: (node: T) => void,
): XRNodePool<T> {
  const pool = new XRNodePool<T>(factory, reset)
  xrPoolRegistry.set(tag, pool as unknown as XRNodePool<AnyPoolableControl>)
  return pool
}

export function getXRPool(tag: string): XRNodePool<AnyPoolableControl> | undefined {
  return xrPoolRegistry.get(tag)
}

export function disposeAllXRPools(): void {
  xrPoolRegistry.forEach(pool => pool.dispose())
  xrPoolRegistry.clear()
}
