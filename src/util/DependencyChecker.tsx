import React from "react";
import {useCallback, useRef} from "react";

// DEBUGGING USE ONLY, make sure to remove all calls to this when done using

/**
 * Must be used at top-level
 */
export function componentWithPropsChecker(WrappedComponent: React.ComponentType<any>, label?: string) {
    return function PropsChecker(props: any) {
        const ref = useRef(props)
        const oldProps = ref.current
        Object.keys(props).filter(key => props[key] !== oldProps[key]).forEach(key =>
            console.log(`PropChecker${label != null ? " " + label : ""}: ${key} changed: `, oldProps[key], " -> ", props[key])
        )
        ref.current = props

        return <WrappedComponent {...props}/>
    }
}

/**
 * PropChecker as a hook for dynamic components
 */
export function usePropChecker(WrappedComponent: React.ComponentType<any>, label?: string) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useCallback(componentWithPropsChecker(WrappedComponent, label), [WrappedComponent, label])
}

export function useDependencyChangeChecker<T extends unknown[]>(arr: T, label?: string): T {
    const ref = useRef<T>(arr)
    const changedIndices: number[] = []
    for (let i = 0; i < arr.length; ++i) if (!Object.is(arr[i], ref.current[i])) changedIndices.push(i)
    if (changedIndices.length > 0) console.log(`DependencyChecker${label != null ? " " + label : ""}: change at indices ` + changedIndices.join())
    ref.current = arr
    return arr
}