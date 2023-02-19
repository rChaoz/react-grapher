function error(...message: any) {
    console.error("[ReactGrapher] - ERROR: ", ...message)
}

function warn(...message: any) {
    console.warn("[ReactGrapher] - WARN: ", ...message)
}

export function warnNoReactGrapherID() {
    warn("No ID provided to the ReactGrapher component. This could lead to errors if multiple ReactGrapher components are used on the same page.")
}

export function warnUnknownEdgeType(type: string) {
    warn(`Edge type passed to DefaultEdge is unknown: edge.data.type is "${type}"`)
}

export function warnInvalidEdgeLabelPos(edge: string, pos: string | undefined) {
    warn(`Invalid label position for edge "${edge}": ${pos}`)
}

export function errorDOMNodeUnknownID(node: EventTarget | null, id?: string | null) {
    error("DOM Node has unknown ID: " + (id ?? "<empty>"))
    console.error("DOM Node: ",  node)
}

export function errorUnknownNode(id: string) {
    error(`Error: unable to find node with ID ${id}`)
}

export function errorUnknownEdge(id: string) {
    error(`Error: unable to find edge with ID ${id}`)
}

export function errorUnknownDomID(query: string, desc: string) {
    error(`Unable to find DOM element (${desc}) with query: ${query}`)
}

export function criticalNoViewport() {
    console.error("CRITICAL - unable to find viewport DOM node")
}