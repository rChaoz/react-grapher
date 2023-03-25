import {errorParsingAllowedConnections, errorUnknownDomID} from "../../util/log";
import {Node, Nodes} from "../../data/Node";
import {Edge, Edges} from "../../data/Edge";
import {GrapherChange} from "../../data/GrapherChange";
import {Controller} from "../../data/Controller";
import {GrapherConfigSet, GrapherFitViewConfigSet, GrapherViewportControlsSet} from "../../data/GrapherConfig";
import {convertToCSSLength, resolveValue} from "../../util/utils";

const whitespaceRegex = /^\s+$/
const allowedConnectionsRegex = /^([a-zA-Z0-9_-]+)\s*(?:<->|->|<-)\s*([a-zA-Z0-9_-]+)/

type AllowedConnections = Map<string, string[]> & { sources: Set<string>, targets: Set<string> }

/**
 * Parse allowed connections config option
 */
export function parseAllowedConnections(s: string): AllowedConnections {
    const map: AllowedConnections = Object.assign(new Map<string, string[]>(), {sources: new Set<string>(), targets: new Set<string>()})
    // Parse config option
    let index = 0
    while (index < s.length) {
        if (!whitespaceRegex.test(s[index])) {
            const match = s.substring(index).match(allowedConnectionsRegex)
            if (match == null) {
                errorParsingAllowedConnections(s.substring(index))
                return Object.assign(new Map<string, string[]>(), {sources: new Set<string>(), targets: new Set<string>()})
            }
            if (!map.has(match[1])) map.set(match[1], [])
            map.get(match[1])!.push(match[2])

            map.sources.add(match[1])
            map.targets.add(match[2])

            index += match[0].length
        } else ++index
    }
    return map
}

/**
 * Extract DOM ID, type (node/edge) and internal ID from event target
 */
export function processDomElement<N, E>(element: EventTarget | null, nodes: Nodes<N>, edges: Edges<E>, id: string)
    : { domID: string, type: "node" | "edge", objID: string, obj: Node<N> | Edge<E> } | null {
    const domID = (element as HTMLElement | null)?.id
    if (domID == null) {
        errorUnknownDomID(element, null)
        return null
    }
    const objID = domID.substring(id.length + 2)
    let type: "node" | "edge", obj: Node<N> | Edge<E> | undefined
    if (domID.charAt(id.length) === "n") {
        type = "node"
        obj = nodes.get(objID)
    } else if (domID.charAt(id.length) === "e") {
        type = "edge"
        obj = edges.get(objID)
    } else {
        errorUnknownDomID(element, domID)
        return null
    }
    if (obj == null) {
        errorUnknownDomID(element, `${domID} -> ${type} ${objID}`)
        return null
    }
    return {domID, type, objID, obj}
}

/**
 * Send a change to the graph
 */
export function sendChanges(changes: GrapherChange[], nodes: Nodes<any>, edges: Edges<any>, onChange?: (change: GrapherChange[]) => GrapherChange[] | undefined | void) {
    let c: GrapherChange[] | undefined | void = changes
    if (onChange != null) c = onChange(changes)
    if (c != null) {
        nodes.processChanges(c)
        edges.processChanges(c)
    }
}

/**
 * Zoom the viewport
 */
export function changeZoom(amount: number, controller: Controller, config: GrapherConfigSet) {
    const viewport = controller.getViewport()
    const zoom = viewport.zoom * (1 + amount)
    controller.updateViewport({
        zoom: Math.min(Math.max(zoom, config.viewportControls.minZoom), config.viewportControls.maxZoom)
    })
}

/**
 * Fit the viewport
 */
export function fitView(fitConfig: GrapherFitViewConfigSet, viewportControls: GrapherViewportControlsSet, controller: Controller, boundingRect: DOMRect, element: HTMLElement) {
    if (element == null || boundingRect == null || (boundingRect.width === 0 && boundingRect.height === 0)) return
    const w = element.offsetWidth, h = element.offsetHeight

    // Calculate zoom value for paddings
    const rect = new DOMRect(boundingRect.x, boundingRect.y, boundingRect.width, boundingRect.height)
    let zoom = Math.min(w / rect.width, h / rect.height)
    if (fitConfig.abideMinMaxZoom) zoom = Math.min(Math.max(zoom, viewportControls.minZoom), viewportControls.maxZoom)

    // Apply padding
    element.style.padding = convertToCSSLength(fitConfig.padding)
    const comp = getComputedStyle(element)
    const pl = resolveValue(comp.paddingLeft, w) / zoom, pt = resolveValue(comp.paddingTop, h) / zoom,
        pr = resolveValue(comp.paddingRight, w) / zoom, pb = resolveValue(comp.paddingBottom, h) / zoom
    element.style.padding = "0"
    rect.x -= pl
    rect.y -= pt
    rect.width += pl + pr
    rect.height += pt + pb
    // Calculate final zoom value
    zoom = Math.min(w / rect.width, h / rect.height)
    if (fitConfig.abideMinMaxZoom) zoom = Math.min(Math.max(zoom, viewportControls.minZoom), viewportControls.maxZoom)

    // Update viewport
    controller.setViewport({
        centerX: (rect.left + rect.right) / 2, centerY: (rect.top + rect.bottom) / 2, zoom
    })
}