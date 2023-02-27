import {useRef} from "react";

/**
 * Like {@link useRef}, but instead of setting just the `.current` property, this will copy all properties of the `initialValue` parameter into the ref.
 */
export function usePersistent<T>(initialValue: T): T {
    const ref = useRef(true)
    if (ref.current) {
        Object.assign(ref, initialValue)
        ref.current = false
    }
    return ref as T
}

/**
 * Same as {@link usePersistent}, but use a factory function to obtain the initial value. For more expensive computations.
 */
export function usePersistentComplex<T>(initialValueFactory: () => T): T {
    const ref = useRef(true)
    if (ref.current) {
        Object.assign(ref, initialValueFactory())
        ref.current = false
    }
    return ref as T
}