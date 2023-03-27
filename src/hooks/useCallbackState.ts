import {useRef} from "react";

/**
 * Returns a ref object (persistent for the entire lifecycle of the component), with the given properties set (copied) on it.
 * Use this to allow callbacks, such as inside effects, to access the latest state without having to re-run themselves.
 *
 * @example
 * // These states will be updated and the component re-rendered
 * const [text, setText] = useState<string | null>(null)
 * const [count, setCount] = useState(0)
 * // Use callback state
 * const s = useCallbackState({count, text})
 *
 * // Attach the listener on-mount
 * const ref = useRef<HTMLDivElement>(null)
 * useEffect(() => {
 *     function onClick(event: MouseEvent) {
 *         // This will always print "0, null", unless we change the dependency array to [text, count],
 *         // which re-runs the effect every time - we don't want that!
 *         console.log(`old state variables: ${count}, ${text}`)
 *         // The 's' object is always the same - if the component re-renders, its 'count' and 'text'
 *         // properties are changed, but because s is the same, we can access the new values like so:
 *         console.log(`current state: ${s.count}, ${s.text}`)
 *     }
 *
 *     ref.current.addEventListener("click", onClick)
 *     return () => ref.current.removeEventListener("click", onClick)
 * }, []) // or '[s]' to calm ESLint down - it will still only run just once
 *
 * // This also works with useCallback:
 * const callback = useCallback(() => {
 *     // can use 's.text' and 's.count' here freely
 * }, [])
 * // So that memoized components that receive 'callback' as a prop don't have to re-render
 *
 * @param state An object whose properties will be copied into the returned ref.
 * @return The same object every time, with the new properties from 'state' assigned to it.
 */
export function useCallbackState<T>(state: T): T {
    return Object.assign(useRef(), state)
}