/**
 * Creates a random ID composed of "id-" plus 9 random alfa-numerical characters.
 */
export function randomID() {
    return "id-" + Math.random().toString(36).slice(2, 11)
}