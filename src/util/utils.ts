/**
 * Convert a CSS computed value to pixel value
  */
export function resolveValue(value: string, length: number): number {
    // Resolve a percentage or pixel value to pixel value
    if (value.match(/^-?(\d+(\.\d+)?|\.\d+)?px$/)) return Number(value.slice(0, value.length - 2))
    else if (value.match(/^-?(\d+(\.\d+)?|\.\d+)?%$/)) return Number(value.slice(0, value.length - 1)) / 100 * length
    else return 0
}
