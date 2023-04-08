import {errorCustom, errorParsingDOMElement, errorUnknownEdge, errorUnknownNode} from "../../util/log";
import {Node, Nodes, NodesImpl} from "../../data/Node";
import {Edge, Edges, EdgesImpl} from "../../data/Edge";
import {GrapherChange} from "../../data/GrapherChange";
import {Controller} from "../../data/Controller";
import {GrapherConfigSet, GrapherFitViewConfigSet, GrapherViewportControlsSet} from "../../data/GrapherConfig";
import {convertToCSSLength, resolveValue} from "../../util/utils";
import {CommonGraphProps} from "./props";
import {GrapherEvent} from "../../data/GrapherEvent";

const whitespaceRegex = /^\s+$/
const allowedConnectionsRegex = /^([a-zA-Z0-9_-]+)\s*(<->|->|<-)\s*([a-zA-Z0-9_-]+)/

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
                errorCustom(`Error while parsing config option 'allowedEdges' at index ${index}:\n`, s)
                return Object.assign(new Map<string, string[]>(), {sources: new Set<string>(), targets: new Set<string>()})
            }
            const first = match[1], second = match[3], direction = match[2]

            if (direction === "->") {
                if (!map.has(first)) map.set(first, [])
                map.get(first)!.push(second)
                map.sources.add(first)
                map.targets.add(second)
            } else if (direction === "<-") {
                if (!map.has(second)) map.set(second, [])
                map.get(second)!.push(first)
                map.sources.add(second)
                map.targets.add(first)
            } else {
                if (!map.has(first)) map.set(first, [])
                if (!map.has(second)) map.set(second, [])
                map.get(first)!.push(second)
                map.sources.add(first)
                map.targets.add(second)
                map.get(second)!.push(first)
                map.sources.add(second)
                map.targets.add(first)
            }

            index += match[0].length
        } else ++index
    }
    return map
}

/**
 * Extract DOM ID, type (node/edge) and internal ID from event target
 */
export function processDomElement<N, E>(element: EventTarget | null, nodes: Nodes<N>, edges: Edges<E>)
    : { type: "node", objID: string, obj: Node<N> } | { type: "edge", objID: string, obj: Edge<E> } | { type: "handle", objID: string, obj: Node<N> } | null {
    if (element == null) {
        errorCustom("Node/Edge/Handle pointer event listener callback was called with a null event.currentTarget")
        return null
    }
    const elem = element as HTMLElement
    const type = elem.dataset.type, objID = elem.dataset.id

    if (type == null || objID == null) {
        errorParsingDOMElement(elem)
        return null
    }

    let obj, nodeID
    switch (type) {
        case "node":
            obj = nodes.get(objID)
            if (obj == null) {
                errorParsingDOMElement(elem)
                errorUnknownNode(objID)
                return null
            }
            return {type: "node", objID, obj}
        case "edge":
            obj = edges.get(objID)
            if (obj == null) {
                errorParsingDOMElement(elem)
                errorUnknownEdge(objID)
                return null
            }
            return {type: "edge", objID, obj}
        case "handle":
            nodeID = elem.dataset.node
            if (nodeID == null) {
                errorParsingDOMElement(elem)
                return null
            }
            obj = nodes.get(nodeID)
            if (obj == null) {
                errorParsingDOMElement(elem)
                errorUnknownNode(nodeID)
                return null
            }
            return {type: "handle", objID, obj}
    }

    errorParsingDOMElement(elem)
    return null
}

/**
 * Send a change to the graph
 */
export function sendChanges<N, E>(changes: GrapherChange[], d: { onChange: CommonGraphProps["onChange"], nodes: NodesImpl<N>, edges: EdgesImpl<E> }) {
    let c: GrapherChange[] | undefined | void = changes
    if (d.onChange != null) c = d.onChange(changes)
    if (c != null) {
        d.nodes.processChanges(c)
        d.edges.processChanges(c)
    }
}

/**
 * Send an event to the graph
 */
export function sendEvent<N, E>(event: GrapherEvent, d: { onEvent: CommonGraphProps["onEvent"], onChange: CommonGraphProps["onChange"], nodes: NodesImpl<N>, edges: EdgesImpl<E> }) {
    if (d.onEvent == null) return
    const c = d.onEvent(event)
    if (c != null) sendChanges(c, d)
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