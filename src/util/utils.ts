import {warnCalcUnknownToken, warnUnknownCSSComputedValue} from "./log"

/**
 * Function that takes a computed CSS calc expression (i.e. composed of only percentage and pixel values, added or subtracted)
 * @param expr CSS calc expression: `<percentage>% +/- <pixel-value>px`
 * @return A pair of 2 numbers, as an array, first number being the percentage and second number the pixel value.
 * Note that the percentage is returned as-is: "50.3% + 5" will return [50, 5], not [.503, 5]
 * @see getComputedStyle
 */
export function splitCSSCalc(expr: string): [number, number] {
    // Splitting by whitespace is fine: in CSS, whitespace is mandatory before & after arithmetic '+'/'-'. Unary minus (or even plus)
    // can be handled by `Number()`, if present. Computed values may not contain multiplications or divisions, as they are considered basic
    // computations: only multiplying/dividing by 'number' (no unit) is allowed.
    const tokens = expr.trim().split(/\s/)
    let percentage = 0, absolute = 0, sign = 1
    for (const t of tokens) {
        if (t.length === 0) continue; // ignore consecutive spaces
        if (t.endsWith("px")) absolute += Number(t.substring(0, t.length - 2)) * sign
        else if (t.endsWith("%")) percentage += Number(t.substring(0, t.length - 1)) * sign
        else if (t === "+") sign = 1
        else if (t === "-") sign = -1
        else warnCalcUnknownToken(expr, t)
    }
    return [percentage, absolute]
}

/**
 * Resolve the argument of a computed CSS `calc()` function (i.e. composed of only percentage and pixel values, added or subtracted)
 * @param expr CSS calc expression: `<percentage>% +/- <pixel-value>px`
 * @param length length, in pixels, on which percentage values are based on
 * @see getComputedStyle
 */
export function resolveCSSCalc(expr: string, length: number) {
    const [percentage, absolute] = splitCSSCalc(expr)
    return percentage * length / 100 + absolute
}

/**
 * Convert a CSS computed value (`<number>px | <number>%`) to pixel value. For unknown values, this will return 0.
 * @param value CSS computed value
 * @param length If the value is or contains a percentage value, the length the percentage is based on (e.g. width/height of the parent for most
 * properties, or width/height of the element itself for border-radius).
  */
export function resolveValue(value: string, length: number): number {
    value = value.trim()
    // Resolve a percentage or pixel value to pixel value
    if (value.startsWith("calc(")) return resolveCSSCalc(value.substring(5, value.length - 1), length)
    else if (value.match(/^-?(\d+(\.\d+)?|\.\d+)?px$/)) return Number(value.slice(0, value.length - 2))
    else if (value.match(/^-?(\d+(\.\d+)?|\.\d+)?%$/)) return Number(value.slice(0, value.length - 1)) / 100 * length
    else {
        warnUnknownCSSComputedValue(value)
        return 0;
    }
}

/**
 * Convert 1 or two computed CSS values to pixel values (e.g. useful for border-top-left-radius, which may be 1 or 2 values)
 *
 * 'strValue' usually is a result of `getComputedStyle(...).someProperty`, and if of form:
 * ```
 * <value> | <value> <value>
 * ```
 * where <value> is:
 * ```
 * <number>px | <number>% | calc(<number>% +/- <number>px)
 * ```
 */
export function resolveValues(strValue: string, width: number, height: number): [number, number] {
    strValue = strValue.trim()
    const separator = strValue.startsWith("calc") ? strValue.indexOf(")", 5) + 1 : strValue.indexOf(" ")
    if (separator <= 0) return [resolveValue(strValue, width), resolveValue(strValue, height)]
    else return [resolveValue(strValue.substring(0, separator), width), resolveValue(strValue.substring(separator + 1), height)]
}

/**
 * Enlarge given rect (container) so that it contains another rect (child)
 */
export function expandRect(container: DOMRect, child: Pick<DOMRect, "x" | "y" | "width" | "height">) {
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
 * If value is null or the number 0, returns "0".
 */
export function convertToCSSLength(value: string | number | null | undefined) {
    if (value == null || value === 0) return "0"
    else if (typeof value === "number") return `${value}px`
    else return value
}

/**
 * Object used by {@link localMemo} to remember previous dependencies & memoized value.
 */
export type MemoObject<T> = {
    deps?: any[]
    oldValue?: T
}

/**
 * Memoize a value where a hook can't be used
 * @param factory Like {@link React.useMemo} factory param
 * @param deps Dependencies array, as value pairs: each pair consists of an old and new value that will be compared by reference
 * @param memoObject A memo object that will be used and modified by this function for memoization. Should be initialized to `{}`.
 * Note: the object must always be the same every time this function is called, for this function to work correctly.
 */
export function localMemo<T>(factory: () => T, deps: any[], memoObject: MemoObject<T>): T {
    if (memoObject.deps == null || memoObject.deps.length != deps.length) {
        memoObject.deps = deps
        return memoObject.oldValue = factory()
    }
    // Compare old & new dependencies
    for (let i = 0; i < deps.length; ++i) if (!Object.is(deps[i], memoObject.deps[i])) {
        memoObject.deps = deps
        return memoObject.oldValue = factory()
    }

    return memoObject.oldValue!
}

/**
 * Test whether an object has a property. The point of this function over `"prop" in object` is to provide return the same object,
 * but with the correct type inferred (i.e. same type but with an additional property 'prop').
 */
export function hasProperty<O extends object, P extends string>(object: O, prop: P): object is O & Record<P, unknown> {
    return prop in object
}