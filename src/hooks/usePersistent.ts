import {useRef} from "react";

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
    const ref = useRef<T>()
    if (ref.current === undefined) ref.current = initialValueFactory()
    return ref.current
}