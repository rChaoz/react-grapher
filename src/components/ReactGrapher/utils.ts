import {errorCustom, errorParsingDOMElement, errorUnknownEdge, errorUnknownHandle, errorUnknownNode} from "../../util/log";
import {Node, NodeConfig, NodeHandleConfig, NodeHandleInfo, NodeImpl, Nodes, NodesImpl} from "../../data/Node";
import {Edge, EdgeConfig, Edges, EdgesImpl} from "../../data/Edge";
import {GrapherChange} from "../../data/GrapherChange";
import {Controller} from "../../data/Controller";
import {GrapherConfigSet, GrapherFitViewConfigSet, GrapherViewportControlsSet} from "../../data/GrapherConfig";
import {convertToCSSLength, resolveValue} from "../../util/utils";
import {CommonGraphProps} from "./props";
import {GrapherEvent} from "../../data/GrapherEvent";
import {Selection} from "../../data/Selection";

const whitespaceRegex = /^\s+$/
const allowedConnectionsRegex = /^([a-zA-Z0-9_-]+)\s*(<->|->|<-)\s*([a-zA-Z0-9_-]+)/

type AllowedConnections = Map<string, string[]> & { sources: Set<string>, targets: Set<string> }

// Currently grabbed (being moved) node
export interface GrabbedNode<N> {
    // When these properties are changed, a new object is created to update the state
    type: "node" | "edge" | "viewport" | "handle" | "resizing" | null
    section: "source" | "target" | undefined // only makes sense for type "edge"
    node: Node<N> // only makes for type "handle"
    id: string
    // These properties don't cause a state update
    clickCount: number
    startX: number
    startY: number
    hasMoved: boolean
    timeoutID: number
}

// Information on what was last clicked and when (to detect multi-clicks)
export interface LastClicked {
    type: "node" | "edge" | "viewport" | "handle" | null
    id: string
    times: number
    time: number
}

// State required by callbacks. When this state is updated, no components re-render, as callbacks have acces to it using a ref object
export interface GrapherCallbackState<N, E> {
    onEvent: CommonGraphProps["onEvent"],
    onChange: CommonGraphProps["onChange"],
    nodes: NodesImpl<N>,
    edges: EdgesImpl<E>,
    selection: Selection
    controller: Controller
    config: GrapherConfigSet
}

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
export function processDomElement<N, E>(element: EventTarget | null, nodes: Nodes<N>, edges: Edges<E>):
    { type: "node", objID: string, obj: Node<N> } | { type: "edge", objID: string, obj: Edge<E> } | { type: "handle", objID: string, obj: NodeHandleInfo, node: Node<N> } | null {
    if (element == null) {
        errorCustom("Node/Edge/Handle pointer event listener callback was called with a null event.currentTarget")
        return null
    }
    const elem = element as HTMLElement
    const type = elem.dataset.type, objID = elem.dataset.id

    if (type == null || objID == null) {
        errorParsingDOMElement(elem)
        errorCustom("Element does not have 'data-type' or 'data-id' attributes.")
        return null
    }

    let obj, nodeID, node
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
                errorCustom("Handle element does not have 'data-node' attribute.")
                return null
            }
            node = nodes.get(nodeID)
            if (node == null) {
                errorParsingDOMElement(elem)
                errorUnknownNode(nodeID)
                return null
            }
            obj = (node as NodeImpl<N>).handles.find(h => h.name === objID)
            if (obj == null) {
                errorParsingDOMElement(elem)
                errorUnknownHandle(nodeID, objID)
                return null
            }
            return {type: "handle", objID, obj, node}
    }

    errorParsingDOMElement(elem)
    return null
}

/**
 * Send a change to the graph
 */
export function sendChanges<N, E>(changes: GrapherChange[], callbackState: GrapherCallbackState<N, E>) {
    let c: GrapherChange[] | undefined | void = changes
    if (callbackState.onChange != null) c = callbackState.onChange(changes)
    if (c != null) {
        callbackState.nodes.processChanges(c)
        callbackState.edges.processChanges(c)
    }
}

/**
 * Send an event to the graph
 */
export function sendEvent<N, E>(event: GrapherEvent, callbackState: GrapherCallbackState<N, E>) {
    if (callbackState.onEvent == null) return
    const c = callbackState.onEvent(event)
    if (c != null) sendChanges(c, callbackState)
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
    const rect = DOMRect.fromRect(boundingRect)
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

/**
 * Gets grapher coordinates for pointer event
 */
export function toGrapherCoordinates(event: PointerEvent, bounds: DOMRect, contentRect: DOMRect, zoom: number): DOMPoint {
    return new DOMPoint((event.clientX - contentRect.x) / zoom + bounds.x, (event.clientY - contentRect.y) / zoom + bounds.y)
}

/**
 * Finds a free node/edge ID
 */
export function findNewID(start: number, map: Map<string, unknown>) {
    while (map.has(String(start))) ++start
    return start
}

const globalNodeDefaults: Required<NodeConfig> = {
    // Node
    allowGrabbing: true,
    allowSelection: true,
    allowMoving: true,
    allowDeletion: false,
    allowNewEdges: false,
    allowNewEdgeTarget: false,
    // Handles
    allowGrabbingHandles: false,
    allowNewEdgesFromHandles: false,
    allowNewEdgeTargetForHandles: false,
}

const globalEdgeDefaults: Required<EdgeConfig> = {
    allowGrabbing: true,
    allowOverlapSeparation: true,
    allowSelection: true,
    allowDeletion: false,
    allowEdit: false,
    // These should never be used and are set just to make Typescript happy
    allowEditSource: false,
    allowEditTarget: false,
}

/**
 * Get the config property for a node. If the node does not have the property, this falls back to the user node defaults, then the global node defaults.
 */
export function getNodeConfig<Prop extends keyof NodeConfig>(prop: Prop, node: NodeConfig, config: GrapherConfigSet): boolean {
    return node[prop] ?? config.nodeDefaults[prop] ?? globalNodeDefaults[prop]
}

/**
 * Get the config property for an edge. If the edge does not have the property, this falls back to the user edge defaults, then the global edge defaults.
 */
export function getEdgeConfig<Prop extends keyof EdgeConfig>(prop: Prop, edge: EdgeConfig, config: GrapherConfigSet): boolean {
    if (prop === "allowEditSource") return edge[prop] ?? config.edgeDefaults[prop] ?? getEdgeConfig("allowEdit", edge, config)
    if (prop === "allowEditTarget") return edge[prop] ?? config.edgeDefaults[prop] ?? getEdgeConfig("allowEdit", edge, config)
    return edge[prop] ?? config.edgeDefaults[prop] ?? globalEdgeDefaults[prop]
}

/**
 * Get the config property for a handle. If the handle does not have the property, this falls back to the corresponding node property, using
 * {@link getNodeConfig}. If the node does not have the property, this falls back to the user node defaults, then the global node defaults.
 */
export function getHandleConfig<Prop extends keyof NodeHandleConfig>(prop: Prop, handle: NodeHandleInfo, node: NodeConfig, config: GrapherConfigSet): boolean {
    if (handle[prop] != null) return handle[prop]!
    switch (prop) {
        case "allowGrabbing":
            return getNodeConfig("allowGrabbingHandles", node, config)
        case "allowNewEdges":
            return getNodeConfig("allowNewEdgesFromHandles", node, config)
        case "allowNewEdgeTarget":
            return getNodeConfig("allowNewEdgesFromHandles", node, config)
        default:
            errorCustom(`Internal error: unknown handle configuration property "${prop}"`)
            return false
    }
}


/**
 * Function to check if edges connection is valid.
 * TODO Add unit tests
 */
export function checkConnection(sourceNode: Node<any>, targetNode: Node<any>, sourceHandle: NodeHandleInfo | null, targetHandle: NodeHandleInfo | null,
                         allowedConnections: AllowedConnections) {
    const sourceRoles = (sourceHandle ?? sourceNode).roles
    const targetRoles = (targetHandle ?? targetNode).roles
    if (sourceRoles == null) {
        if (targetRoles == null) return true
        for (const role of targetRoles) if (allowedConnections.targets.has(role)) return true
        return false
    }
    if (targetRoles == null) {
        for (const role of sourceRoles) if (allowedConnections.sources.has(role)) return true
        return false
    }
    for (const sourceRole of sourceRoles) {
        const allowedTargetRoles = allowedConnections.get(sourceRole)
        if (allowedTargetRoles == null) continue
        for (const possibleTargetRole of allowedTargetRoles) if (targetRoles.includes(possibleTargetRole)) return true
    }
    return false
}