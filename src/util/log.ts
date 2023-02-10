function error(...message: any) {
    console.error("[ReactGrapher] - ERROR: ", ...message)
}

function warn(...message: any) {
    console.warn("[ReactGrapher] - WARN: ", ...message)
}

export function warnNoReactGrapherID() {
    warn("No ID provided to the ReactGrapher component. This could lead to errors if multiple ReactGrapher components are used on the same page.")
}

export function warnEmptyID(id: string) {
    warn("Empty ID is not recommended. You should specify IDs for controlled graphs. ID was replaced with " + id)
}

export function errorDOMNodeUnknownID(node: EventTarget | null, id?: string | null) {
    error("DOM Node has unknown ID: " + (id ?? "<empty>"))
    console.error("DOM Node: ",  node)
}

export function errorUnknownNode(id: string) {
    error("Error: unable to find node with ID: ", id)
}

export function errorUnknownEdge(id: string) {
    error("Error: unable to find edge with ID: ", id)
}

export function criticalNoViewport() {
    console.error("CRITICAL - unable to find viewport DOM node")
}