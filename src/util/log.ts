function error(...message: any) {
    console.error("[ReactGrapher] - ERROR: ", ...message)
}

function warn(...message: any) {
    console.warn("[ReactGrapher] - ERROR: ", ...message)
}

export function noReactGrapherID() {
    warn("No ID provided to the ReactGrapher component. This could lead to errors if multiple ReactGrapher components are used on the same page.")
}

export function emptyID(id: string) {
    error("Empty ID is not allowed. ID was replaced with " + id)
}

export function domNodeID(node: EventTarget | null, id?: string | null) {
    error("DOM Node has unknown ID: " + (id ?? "<empty>"))
    console.error("DOM Node: ",  node)
}

export function unknownNode(id: string) {
    error("Error: unable to find node with ID: ", id)
}

export function noViewport() {
    console.error("CRITICAL - unable to find viewport DOM node")
}