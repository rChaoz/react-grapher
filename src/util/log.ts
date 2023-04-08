// Helper functions
const TAG = "[ReactGrapher]"

function critical(...message: any) {
    console.error(TAG + " - CRITICAL:", message)
}

export const criticalCustom = critical

function error(...message: any) {
    console.error(TAG + " - ERROR:", ...message)
}

export const errorCustom = error

function warn(...message: any) {
    console.warn(TAG + " - WARN:", ...message)
}

export const warnCustom = warn

// Critical errors

export function criticalInternalContext() {
    critical("A component tried to use an internal context but none was found! Make sure you don't explicitly use ReactGrapher components outside of a ReactGrapher!")
}

// Errors

export function errorGrapherContext(component: string) {
    error(component + " tried to use GrapherContext but none was found! Make sure you place all ReactGrapher related components as child nodes of <ReactGrapher>!")
}

export function checkErrorInvalidID(target: string, id: string) {
    if (id.match(/^[a-zA-Z0-9\-_]+$/)) return
    error(`${target} has invalid ID: ${id}`)
    console.error("ID must be composed of a-z, A-Z, 0-9, - and _")
}

export function errorParsingDOMElement(node: HTMLElement | null) {
    error("Unable to parse DOM element's dataset (type, id). Usually this means that your custom Node or Edge component doesn't use " +
        "BaseNode or BaseEdge as its root element, or that you created a NodeHandle outside of a BaseNode's 'handles' prop.")
    console.error("Element: ", node)
}

export function errorUnknownNode(id: string) {
    error(`Error: unable to find node with ID ${id}`)
}

export function errorUnknownEdge(id: string) {
    error(`Error: unable to find edge with ID ${id}`)
}

export function errorComponentOutsideContext(element: string, container: string) {
    error(`${element} can only be used inside a ${container}!`)
}

// TODO Maybe this will be used later? don't delete yet
// export function errorQueryFailed(query: string, desc: string) {
//     error(`Unable to find DOM element (${desc}) with query: ${query}`)
// }

// Warnings

export function warnInvalidPropValue(component: string, prop: string, value: any, candidates?: string[]) {
    warn(`${prop} passed to ${component} has invalid value: '${value}'.` + (candidates == null ? "" : ` Possible candidates: [${candidates.join()}]`))
}

export function warnUnknownHandle(edge: string, node: string, handle: string, handles: string[]) {
    warn(`Edge '${edge}' wants to connect to handle '${handle}' of node '${node}', but this node has no such handle. Possible candidates: [${handles.join()}]`)
}