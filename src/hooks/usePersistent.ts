import {useRef, MutableRefObject} from "react";

/**
 * Like {@link useRef}, but returns the '.current' value of the ref, which is initially set to the given value.
 */
export function usePersistent<T>(initialValue: T): T {
    const ref = useRef(initialValue)
    return ref.current
}

/**
 * Same as {@link usePersistent}, but use a factory function to obtain the initial value. For more expensive computations.
 */
export function usePersistentComplex<T>(initialValueFactory: () => T): T {
    const ref = useRef<T>() as MutableRefObject<T> & { initialized?: boolean }
    if (!ref.initialized) {
        ref.current = initialValueFactory()
        ref.initialized = true
    }
    return ref.current
}