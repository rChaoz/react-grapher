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