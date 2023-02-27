/**
 * Convert a CSS computed value to pixel value
  */
export function resolveValue(value: string, length: number): number {
    // Resolve a percentage or pixel value to pixel value
    if (value.match(/^-?(\d+(\.\d+)?|\.\d+)?px$/)) return Number(value.slice(0, value.length - 2))
    else if (value.match(/^-?(\d+(\.\d+)?|\.\d+)?%$/)) return Number(value.slice(0, value.length - 1)) / 100 * length
    else return 0
}

/**
 * Convert a pair of CSS values to pixel values (useful for border radius, which may be 1 or 2 values)
 */
export function resolveValues(strValue: string, width: number, height: number): [number, number] {
    /* Computed border radius may be of form:
    - 6px
    - 2px 5px
    - 20%
    - 10% 5%
    - <empty>
     */
    const vals = strValue.split(" ")
    if (vals.length === 0) return [0, 0]
    else if (vals.length === 1) return [resolveValue(vals[0], width), resolveValue(vals[0], height)]
    else return [resolveValue(vals[0], width), resolveValue(vals[1], height)]
}

/**
 * Enlarge given rect (container) so that it contains another rect (child)
 */
export function enlargeRect(container: DOMRect, child: Pick<DOMRect, "x" | "y" | "width" | "height">) {
    // We don't use top/left/... properties on 'child' because either rect could be an SVGRect. Due to an issue in Typescript,
    // DOMRect type = SVGRect type, although SVGRect does *not* actually have top/left/... properties.
    // (https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/974)
    if (child.x < container.x) {
        const delta = container.x - child.x
        container.x -= delta
        container.width += delta
    }
    if (child.y < container.y) {
        const delta = container.y - child.y
        container.y -= delta
        container.height += delta
    }
    if (child.x + child.width > container.right) container.width += child.x + child.width - container.right
    if (child.y + child.height > container.bottom) container.height += child.y + child.height - container.bottom
}

/**
 * Parse CSS value express as number|string. If number, "px" is appended to the value; otherwise the value itself is returned.
 * If value is null, returns "0".
 */
export function parseCssStringOrNumber(value: string | number | null | undefined) {
    if (value == null) return "0"
    else if (typeof value === "number") return `${value}px`
    else return value
}

export type MemoObject<T> = {
    deps?: any[]
    oldValue?: T
}

/**
 * Memoize a value where a hook can't be used
 * @param factory Like {@link React.useMemo} factory param
 * @param deps Dependencies array, as value pairs: each pair consists of an old and new value that will be compared by reference
 * @param memoObject A memo object that will be used and modified by this function for memoization. Should be initialized to `{}`
 */
export function localMemo<T>(factory: () => T, deps: any[], memoObject: MemoObject<T>): T {
    if (memoObject.deps == null || memoObject.deps.length != deps.length) {
        memoObject.deps = deps
        return memoObject.oldValue = factory()
    }
    // Compare old & new dependencies
    for (let i = 0; i < deps.length; ++i) if (deps[i] !== memoObject.deps[i]) {
        memoObject.deps = deps
        return memoObject.oldValue = factory()
    }

    return memoObject.oldValue!
}