function error(...message: any) {
    console.error("[ReactGrapher] - ERROR: ", ...message)
}

function warn(...message: any) {
    console.warn("[ReactGrapher] - WARN: ", ...message)
}

export function warnUnknownCSSComputedValue(value: string) {
    warn(`Parse CSS computed value failed: '${value}'`)
}

export function warnCalcUnknownToken(expression: string, token: string) {
    warn(`Parse "calc(${expression})": unknown token: ${token}`);
}

export function warnNoReactGrapherID() {
    warn("No ID provided to the ReactGrapher component. This could lead to errors if multiple ReactGrapher components are used on the same page.")
}

export function warnUnknownEdgeType(type: string) {
    warn(`Edge type passed to DefaultEdge is unknown: edge.data.type = "${type}"`)
}

export function warnUnknownHandle(edge: string, node: string, handle: string, handles: string[]) {
    warn(`Edge "${edge}" wants to connect to handle "${handle}" of node "${node}", but this node has no such handle. Possible candidates: [${handles.join()}]`)
}

export function warnIllegalConnection(edge: string, sourceHandle: string, sourceRoles: string | string[], targetHandle: string, targetRoles: string | string[]) {
    warn(`Invalid edge with ID "${edge}" between source handle ${sourceHandle} (with roles ${sourceRoles}) and`
        + `target handle ${targetHandle} (with roles ${targetRoles}) has been removed.`)
}

export function warnInvalidEdgeLabelPos(edge: string, pos: string | undefined) {
    warn(`Invalid label position for edge "${edge}": ${pos}`)
}

export function errorParsingAllowedConnections(token: string) {
    error("Error while parsing config option allowedEdges:")
    console.error(token)
}

export function checkInvalidID(target: string, id: string) {
    if (id.match(/^[a-zA-Z0-9\-_]+$/)) return
    error(`${target} has invalid ID: ${id}`)
    console.error("ID must be composed of a-z, A-Z, 0-9, - and _")
}

export function errorUnknownDomID(node: EventTarget | null, id?: string | null) {
    if (id == null) error("DOM Node/Edge has no ID")
    else error("DOM Element has unknown ID: " + id)
    console.error("Element: ", node)
}

export function errorUnknownNode(id: string) {
    error(`Error: unable to find node with ID ${id}`)
}

export function errorNodeContentPlacement() {
    error("NodeContent must only be used inside a BaseNode!")
}

export function errorUnknownEdge(id: string) {
    error(`Error: unable to find edge with ID ${id}`)
}

export function errorQueryFailed(query: string, desc: string) {
    error(`Unable to find DOM element (${desc}) with query: ${query}`)
}

export function criticalNoViewport() {
    console.error("CRITICAL - unable to find viewport DOM node")
}