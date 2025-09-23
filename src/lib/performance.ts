/**
 * Performance optimization utilities for React components
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'

// Debounce hook for search inputs and form validation
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Throttle hook for scroll and resize events
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now())

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args)
        lastRun.current = Date.now()
      }
    }) as T,
    [callback, delay]
  )
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, options)

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [elementRef, options])

  return isIntersecting
}

// Memoized component wrapper
export function withMemoization<P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) {
  return React.memo(Component, propsAreEqual)
}

// Virtual scrolling for large lists
export function useVirtualScroll({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: any[]
  itemHeight: number
  containerHeight: number
  overscan?: number
}) {
  const [scrollTop, setScrollTop] = useState(0)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex + 1),
    [items, startIndex, endIndex]
  )

  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop)
    }
  }
}

// Optimized search with caching
export function useOptimizedSearch<T>(
  items: T[],
  searchTerm: string,
  searchFunction: (item: T, term: string) => boolean,
  deps: React.DependencyList = []
) {
  const cache = useRef(new Map<string, T[]>())

  return useMemo(() => {
    if (!searchTerm.trim()) return items

    // Check cache first
    if (cache.current.has(searchTerm)) {
      return cache.current.get(searchTerm)!
    }

    // Perform search
    const filtered = items.filter(item => searchFunction(item, searchTerm))

    // Cache result (limit cache size to prevent memory leaks)
    if (cache.current.size < 100) {
      cache.current.set(searchTerm, filtered)
    }

    return filtered
  }, [items, searchTerm, ...deps])
}

// Performance monitor hook
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0)
  const startTime = useRef<number>()

  useEffect(() => {
    renderCount.current += 1
  })

  useEffect(() => {
    startTime.current = performance.now()

    return () => {
      if (startTime.current) {
        const renderTime = performance.now() - startTime.current
        if (renderTime > 16) { // More than one frame
          console.warn(
            `Performance warning: ${componentName} took ${renderTime.toFixed(2)}ms to render (render #${renderCount.current})`
          )
        }
      }
    }
  })

  return {
    renderCount: renderCount.current,
    logRenderInfo: () => {
      console.log(`${componentName} has rendered ${renderCount.current} times`)
    }
  }
}

// Bundle splitting utility
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const LazyComponent = React.lazy(importFn)

  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <React.Suspense fallback={fallback ? <fallback /> : <div>Loading...</div>}>
        <LazyComponent {...props} />
      </React.Suspense>
    )
  }
}

// Memory management utilities
export function useMemoryCleanup() {
  const timers = useRef<Set<NodeJS.Timeout>>(new Set())
  const listeners = useRef<Set<() => void>>(new Set())

  const addTimer = useCallback((timer: NodeJS.Timeout) => {
    timers.current.add(timer)
  }, [])

  const addListener = useCallback((cleanup: () => void) => {
    listeners.current.add(cleanup)
  }, [])

  useEffect(() => {
    return () => {
      // Clear all timers
      timers.current.forEach(timer => clearTimeout(timer))
      timers.current.clear()

      // Run all cleanup functions
      listeners.current.forEach(cleanup => cleanup())
      listeners.current.clear()
    }
  }, [])

  return { addTimer, addListener }
}

