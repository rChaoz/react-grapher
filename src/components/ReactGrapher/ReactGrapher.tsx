import React, {useEffect, useMemo, useRef, useState} from "react";
import {applyNodeDefaults, Node, NodeHandleInfo, NodeImpl, Nodes, NodesImpl} from "../../data/Node"
import {applyEdgeDefaults, Edge, EdgeImpl, Edges, EdgesImpl} from "../../data/Edge";
import styled from "@emotion/styled";
import {useController} from "../../hooks/useController";
import {useGraphState} from "../../hooks/useGraphState";
import {GrapherViewport} from "../GrapherViewport";
import {ControllerImpl} from "../../data/Controller";
import {
    EDGES_CLASS,
    MARKER_ARROW_CLASS,
    MARKER_ARROW_FILLED_CLASS,
    MARKER_ARROW_FILLED_ID,
    MARKER_ARROW_ID,
    NODES_CLASS,
    REACT_GRAPHER_CLASS,
    VIEWPORT_CLASS,
    Z_INDEX_EDGES,
    Z_INDEX_NODE
} from "../../util/constants";
import {GrapherConfig, GrapherConfigSet, withDefaultsConfig} from "../../data/GrapherConfig";
import {GrapherChange} from "../../data/GrapherChange";
import {checkErrorInvalidID, criticalCustom, errorUnknownNode, warnCustom, warnUnknownHandle} from "../../util/log";
import {BoundsContext} from "../../context/BoundsContext";
import {InternalContext, InternalContextValue} from "../../context/InternalContext";
import {SimpleEdge} from "../SimpleEdge";
import {getNodeIntersection} from "../../util/EdgeHelper";
import {deepEquals, expandRect, localMemo} from "../../util/utils";
import {createEvent, GrapherEventImpl, GrapherKeyEvent, GrapherPointerEvent, GrapherWheelEvent} from "../../data/GrapherEvent";

import {SelectionImpl} from "../../data/Selection";
import {usePersistent} from "../../hooks/usePersistent";

import {CommonGraphProps, ControlledGraphProps, UncontrolledGraphProps} from "./props";
import {changeZoom, fitView, parseAllowedConnections, processDomElement, sendChanges, sendEvent} from "./utils";
import {useCallbackState} from "../../hooks/useCallbackState";
import {useUpdate} from "../../hooks/useUpdate";
import {useSelection} from "../../hooks/useSelection";
import {GrapherContext, GrapherContextValue} from "../../context/GrapherContext";


const GraphDiv = styled.div<Pick<CommonGraphProps, "width" | "height">>`
  position: relative;
  isolation: isolate;
  width: ${props => props.width ?? "100%"};
  height: ${props => props.height ?? "100%"};
`

const Edges = styled.svg<{ nodesOverEdges: boolean }>`
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: ${props => props.nodesOverEdges ? Z_INDEX_NODE : Z_INDEX_EDGES};
`

const Nodes = styled.div<Pick<GrapherConfigSet, "nodesOverEdges">>`
  position: absolute;
  inset: 0;
`

// TODO Add user interaction
export function ReactGrapher<N, E>(props: ControlledGraphProps<N, E> | UncontrolledGraphProps<N, E>) {
    // Get default config and prevent config object from being created every re-render
    // Also apply settings for static graph if static prop is set
    const inputRef = useRef() as any as { oldConfig?: GrapherConfig, config: GrapherConfigSet }
    const config = useMemo(() => {
        // If config changed, deep compare the config object
        if (deepEquals(props.config, inputRef.oldConfig) && inputRef.config != null) return inputRef.config
        const c = withDefaultsConfig(props.config)
        if (props.static) {
            if (props.config?.hideControls === undefined) c.hideControls = true
            if (props.config?.fitViewConfig?.abideMinMaxZoom === undefined) c.fitViewConfig.abideMinMaxZoom = false
        }
        inputRef.oldConfig = props.config
        inputRef.config = c
        return c
    }, [props.config, props.static])
    // Set undefined props according to static prop
    if (props.static) {
        if (props.fitView === undefined) props.fitView = "always"
        if (props.fitViewOnResize === undefined) props.fitViewOnResize = true
    }

    let nodes: NodesImpl<N>
    let edges: EdgesImpl<E>

    // Ensure rules of hooks are always met - we never know when this component is uncontrolled one render and controlled the next render
    const [ownNodes, ownEdges] = useGraphState((props as UncontrolledGraphProps<N, E>).defaultNodes, (props as UncontrolledGraphProps<N, E>).defaultEdges)
    const ownController = useController()
    const controller = (props.controller ?? ownController) as ControllerImpl

    // Controlled graphs use provided nodes & edges objects
    if ("nodes" in props) {
        nodes = props.nodes as NodesImpl<N>
        edges = props.edges as EdgesImpl<E>
    }
    // Uncontrolled Graphs manage their own state
    else {
        nodes = ownNodes as NodesImpl<N>
        edges = ownEdges as EdgesImpl<E>
    }
    const ownSelection = useSelection<N, E>(nodes, edges)
    const selection = ("selection" in props && props.selection != null ? props.selection : ownSelection) as SelectionImpl

    // 'Notify' selection if multiple selection is allowed
    selection.multipleSelection = config.userControls.multipleSelection

    // Check react version before using useID - react 18 introduced it, but peerDependencies specifies a lower version
    const useID = React.useId
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ownID = typeof useID === "function" ? useID().replace(/:/g, "X") // replace ':' with 'X' as ':' is not a valid CSS selector character
        : null
    let id: string
    if (props.id != null) {
        checkErrorInvalidID("ReactGrapher", props.id)
        id = props.id
    } else if (ownID == null) {
        id = "react-grapher"
        warnCustom("No ID provided to the ReactGrapher component. This could lead to errors if multiple ReactGrapher components are used on the same page.")
    } else id = ownID

    // We want callbacks to be able to use new state/prop values but without re-creating the callbacks
    const [bounds, setBounds] = useState(new DOMRect()) // bounds has to be declared up here to be included into s
    const s = useCallbackState({
        nodes, edges, selection, controller, bounds,
        config, onEvent: props.onEvent, onChange: props.onChange,
    })

    // Parse allowed edges from config
    const allowedConnections = useMemo(() => {
        // Also de-verify all edges when this changes
        for (const edge of edges) edge.verified = false
        return parseAllowedConnections(config.allowedConnections)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.allowedConnections])

    // Currently grabbed (being moved) node
    interface GrabbedNode {
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
    interface LastClicked {
        type: "node" | "edge" | "viewport" | "handle" | null
        id: string
        times: number
        time: number
    }

    // Currently grabbed node
    const grabbed = usePersistent<GrabbedNode>(
        {type: null, section: undefined, node: null as any, id: "", clickCount: 0, startX: 0, startY: 0, hasMoved: false, timeoutID: -1}
    )
    const [shouldUpdateGrabbed, updateGrabbed] = useUpdate()
    // Last clicked node (used to detect multi-clicks)
    const lastClicked = usePersistent<LastClicked>({type: null, id: "", times: 0, time: 0})
    /* Tracks when the last fitView was done
     When controller.fitView() is called, controller.fitViewValue is incremented.
     When this happens, controller.fitViewValue != needFitView.current, the view will be fitted and needFitView.current will be incremented.
     */
    const needFitView = useRef(props.fitView === "initial" ? -1 : 0)

    // Render the Nodes
    const nodeElements = useMemo(() => nodes.map(node => {
        if (shouldUpdateGrabbed || selection) {
            // for eslint warning
        }
        applyNodeDefaults(node, s.config.nodeDefaults)
        let parent: Node<any> | null = null
        if (node.parent != null) {
            const p = nodes.get(node.parent)
            if (p == null) errorUnknownNode(node.parent)
            else parent = p
        }

        // Calculate absolute position
        node.absolutePosition = localMemo(() => nodes.absolute(node), [node.position, node.parent], node.absolutePositionMemoObject)

        const Component = node.Component
        return <Component key={node.id} id={node.id} data={node.data} classes={node.classes} absolutePosition={node.absolutePosition} edgeMargin={node.edgeMargin}
                          resize={node.resize} grabbed={grabbed.type === "node" && grabbed.id === node.id} selected={node.selected} parent={parent} position={node.position}
                          pointerEvents={node.pointerEvents} handlePointerEvents={node.handlePointerEvents}/>
    }), [nodes, selection, shouldUpdateGrabbed])

    // Same for Edges
    const [shouldUpdateEdges, updateEdges] = useUpdate()
    const edgeElements = useMemo(() => edges.map(edge => {
        if (shouldUpdateGrabbed || shouldUpdateEdges || selection) {
            // for eslint warning
        }
        applyEdgeDefaults(edge, s.config.edgeDefaults)
        const source = nodes.get(edge.source) as NodeImpl<any>, target = nodes.get(edge.target) as NodeImpl<any>
        if (source == null) {
            errorUnknownNode(edge.source)
            return
        }
        if (target == null) {
            errorUnknownNode(edge.target)
            return
        }
        const Component = edge.Component ?? SimpleEdge
        edge.sourcePos = localMemo(() => {
            if (edge.sourceHandle == null || source.handles == null) return getNodeIntersection(source, target)
            else {
                const handle = source.handles.find(handle => handle.name === edge.sourceHandle)
                if (handle == null) return source.absolutePosition
                else return new DOMPoint(source.absolutePosition.x + handle.x, source.absolutePosition.y + handle.y)
            }
        }, [source.absolutePosition, target.absolutePosition, source.width, source.height, source.borderRadius, source.handles], edge.sourcePosMemoObject)
        edge.targetPos = localMemo(() => {
            if (edge.targetHandle == null || target.handles == null) return getNodeIntersection(target, source)
            else {
                const handle = target.handles.find(handle => handle.name === edge.targetHandle)
                if (handle == null) {
                    warnUnknownHandle(edge.id, target.id, edge.targetHandle, target.handles.map(handle => handle.name))
                    return target.absolutePosition
                } else return new DOMPoint(target.absolutePosition.x + handle.x, target.absolutePosition.y + handle.y)
            }
        }, [source.absolutePosition, target.absolutePosition, target.width, target.height, target.borderRadius, target.handles], edge.targetPosMemoObject)
        return <Component key={edge.id} id={edge.id} data={edge.data} classes={edge.classes} boxWidth={config.userControls.edgeBoxWidth}
                          source={source} sourcePos={edge.sourcePos} sourceHandle={edge.sourceHandle} markerStart={edge.markerStart}
                          target={target} targetPos={edge.targetPos} targetHandle={edge.targetHandle} markerEnd={edge.markerEnd}
                          selected={edge.selected} grabbed={grabbed.type === "edge" && grabbed.id === edge.id} pointerEvents={edge.pointerEvents}
                          label={edge.label} labelPosition={edge.labelPosition} labelShift={edge.labelShift} labelRotationFollowEdge={edge.labelRotationFollowEdge}/>
    }), [nodes, edges, selection, shouldUpdateGrabbed, shouldUpdateEdges, config.userControls.edgeBoxWidth])

    // Verify edges and compute handles for those that have them set to "auto" (undefined)
    useEffect(() => {
        // Function to check if connection is valid
        function checkConnection(sourceNode: Node<any>, targetNode: Node<any>, sourceHandle: NodeHandleInfo | null, targetHandle: NodeHandleInfo | null) {
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

        let mustUpdateEdges = false
        const newEdges: Edge<E>[] = []
        for (const edge of edges) {
            // Skip already checked edges
            if (edge.verified) {
                newEdges.push(edge)
                continue
            }
            const source = s.nodes.get(edge.source) as NodeImpl<E> | undefined
            const target = s.nodes.get(edge.target) as NodeImpl<E> | undefined
            if (source == null || target == null) continue
            // Check if handles even exist (null means floating edge, undefined means choose handle automatically)
            const sourceHandle = edge.sourceHandle == null ? edge.sourceHandle : source.handles.find(handle => handle.name === edge.sourceHandle)
            const targetHandle = edge.targetHandle == null ? edge.targetHandle : target.handles.find(handle => handle.name === edge.targetHandle)
            if (edge.sourceHandle != null && sourceHandle === undefined) {
                warnUnknownHandle(edge.id, source.id, edge.sourceHandle, source.handles.map(handle => handle.name))
                continue
            }
            if (edge.targetHandle != null && targetHandle === undefined) {
                warnUnknownHandle(edge.id, target.id, edge.targetHandle, target.handles.map(handle => handle.name))
                continue
            }
            // If both are set, just check if connection is allowed
            if (sourceHandle !== undefined && targetHandle !== undefined) {
                if (!checkConnection(source, target, sourceHandle, targetHandle) && !config.allowIllegalEdges) {
                    warnCustom(`Invalid edge with ID "${edge.id}" between ${sourceHandle ? `source handle ${sourceHandle}, ` : ""}source node ${source.id} ` +
                        `(with roles ${(sourceHandle ?? source).roles ?? "<all edges allowed>"}) and ${targetHandle ? `source handle ${targetHandle}, ` : ""}target node ` +
                        `${target.id} (with roles ${(targetHandle ?? target).roles ?? "<all edges allowed>"}) has been removed.`)
                    continue
                }
            } else {
                // Try to set handles for the edge
                let ok = false
                if (sourceHandle === undefined && targetHandle !== undefined) { // only source handle unset
                    for (const possibleSourceHandle of source.handles) {
                        if (checkConnection(source, target, possibleSourceHandle, targetHandle)) {
                            edge.sourceHandle = possibleSourceHandle.name
                            mustUpdateEdges = ok = true
                            break
                        }
                    }
                    if (!ok) if (checkConnection(source, target, null, targetHandle)) {
                        edge.sourceHandle = null
                        mustUpdateEdges = ok = true
                    }
                } else if (sourceHandle != null && targetHandle == null) { // only target handle unset
                    for (const possibleTargetHandle of target.handles) {
                        if (checkConnection(source, target, sourceHandle, possibleTargetHandle)) {
                            edge.targetHandle = possibleTargetHandle.name
                            mustUpdateEdges = ok = true
                            break
                        }
                    }
                    if (!ok) if (checkConnection(source, target, sourceHandle, null)) {
                        edge.targetHandle = null
                        mustUpdateEdges = ok = true
                    }
                } else { // both handles unset
                    for (const possibleSourceHandle of source.handles) {
                        for (const possibleTargetHandle of target.handles) {
                            if (checkConnection(source, target, possibleSourceHandle, possibleTargetHandle)) {
                                edge.sourceHandle = possibleSourceHandle.name
                                edge.targetHandle = possibleTargetHandle.name
                                mustUpdateEdges = ok = true
                                break
                            }
                        }
                    }
                    if (!ok) for (const possibleSourceHandle of source.handles) {
                        if (checkConnection(source, target, possibleSourceHandle, null)) {
                            edge.sourceHandle = possibleSourceHandle.name
                            edge.targetHandle = null
                            mustUpdateEdges = ok = true
                            break
                        }
                    }
                    if (!ok) for (const possibleTargetHandle of target.handles) {
                        if (checkConnection(source, target, null, possibleTargetHandle)) {
                            edge.sourceHandle = null
                            edge.targetHandle = possibleTargetHandle.name
                            mustUpdateEdges = ok = true
                            break
                        }
                    }
                    if (!ok) if (checkConnection(source, target, null, null)) {
                        edge.sourceHandle = edge.targetHandle = null
                        mustUpdateEdges = ok = true
                    }
                }
                if (!ok && !config.allowIllegalEdges) continue
            }

            // Edge is OK, mark as verified
            edge.verified = true
            newEdges.push(edge)
        }
        if (mustUpdateEdges) updateEdges()
        if (newEdges.length < edges.length) edges.set(newEdges)
    }, [edges, config.allowIllegalEdges, allowedConnections])

    // Ref to the ReactGrapher root div
    const ref = useRef<HTMLDivElement>(null)
    // And to the content div
    const contentRef = useRef<HTMLDivElement>(null)

    // Calculate bounds
    //const [bounds, setBounds] = useState(new DOMRect()) - declared way higher up to be included into 's' callback state object
    const fitViewBounds = useRef(new DOMRect())
    const [shouldRecalculateBounds, recalculateBounds] = useUpdate()
    useEffect(() => {
        const rect = nodes.length > 0
            ? new DOMRect(nodes[0].position.x, nodes[0].position.y, 0, 0)
            : new DOMRect()

        // Expand bounds rect for every node
        for (const node of nodes)
            expandRect(rect, {x: node.position.x - node.width / 2, y: node.position.y - node.height / 2, width: node.width, height: node.height})


        // Do edges first as they are the same for both rects
        for (const edge of edges) {
            if (edge.bounds == null) continue
            expandRect(rect, edge.bounds)
        }

        // Update bounds for fitView if they changed
        if (Math.abs(rect.left - bounds.left) > 5 || Math.abs(rect.top - bounds.top) > 5
            || Math.abs(rect.right - bounds.right) > 5 || Math.abs(rect.bottom - bounds.bottom) > 5) {
            fitViewBounds.current.x = rect.x
            fitViewBounds.current.y = rect.y
            fitViewBounds.current.width = rect.width
            fitViewBounds.current.height = rect.height
            // When bounds change during a fitView or fitView is set to "always", the fitView should repeat after the re-rendering is complete
            if (needFitView.current + 1 === s.controller.fitViewValue || props.fitView === "always") s.controller.fitView()
        }
        // Enlarge bounds by decent amount to make sure everything fits (this is for container div size)
        rect.x -= 200
        rect.y -= 200
        rect.width += 400
        rect.height += 400

        // Update bounds state if bounds changed too much
        if (Math.abs(rect.left - bounds.left) > 100 || Math.abs(rect.top - bounds.top) > 100
            || Math.abs(rect.right - bounds.right) > 100 || Math.abs(rect.bottom - bounds.bottom) > 100) {
            setBounds(rect)
        }
    }, [shouldRecalculateBounds, bounds, nodes, edges, props.fitView])

    // Add listeners to viewport & document
    useEffect(() => {
        if (ref.current == null) return

        // Listener functions

        // Viewport level
        function onViewportPointerDown(event: PointerEvent) {
            let prevented = false
            if (s.onEvent != null) {
                const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, s.selection),
                    type: "pointer",
                    subType: "down",
                    clickCount: 0,
                    pointerEvent: event,
                    target: "viewport",
                    targetID: "",
                }
                sendEvent(grapherEvent, s)
                prevented = grapherEvent.prevented
            }
            // "Grab" the viewport
            if (!prevented && grabbed.type == null) {
                // And initiate timer for long-click detection
                const timeoutID = s.config.userControls.longClickDelay < 0 || s.onEvent == null ? -1 : window.setTimeout(() => {
                    const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                        ...createEvent(grabbed, s.selection),
                        type: "pointer",
                        subType: "long-click",
                        clickCount: 0,
                        pointerEvent: event,
                        target: "viewport",
                        targetID: "",
                    }
                    sendEvent(grapherEvent, s)
                }, s.config.userControls.longClickDelay)
                grabbed.type = "viewport"
                grabbed.clickCount = (lastClicked.type === "viewport" && lastClicked.time + s.config.userControls.multiClickDelay > Date.now())
                    ? lastClicked.times + 1
                    : 1
                grabbed.hasMoved = false
                grabbed.startX = event.clientX
                grabbed.startY = event.clientY
                grabbed.timeoutID = timeoutID
            }
        }

        function onViewportPointerUp(event: PointerEvent) {
            if (s.onEvent != null) {
                const grapherEvent: GrapherPointerEvent = {
                    ...createEvent(grabbed, s.selection),
                    type: "pointer",
                    subType: "up",
                    clickCount: 0,
                    pointerEvent: event,
                    target: "viewport",
                    targetID: "",
                }
                sendEvent(grapherEvent, s)
            }

            if (grabbed.type === "viewport" && !grabbed.hasMoved) {
                // Remember that the viewport was clicked
                lastClicked.type = "viewport"
                lastClicked.times = grabbed.clickCount
                lastClicked.time = Date.now()
                // Send event
                let prevented = false
                if (s.onEvent != null) {
                    const clickEvent: GrapherPointerEvent & GrapherEventImpl = {
                        ...createEvent(grabbed, s.selection),
                        type: "pointer",
                        subType: "click",
                        clickCount: grabbed.clickCount,
                        pointerEvent: event,
                        target: "viewport",
                        targetID: "",
                    }
                    sendEvent(clickEvent, s)
                    prevented = clickEvent.prevented
                }
                if (!prevented) s.selection.deselectAll()
            }
        }

        function onViewportWheel(event: WheelEvent) {
            let prevented = false
            if (s.onEvent != null) {
                const wheelEvent: GrapherWheelEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, s.selection),
                    type: "wheel",
                    wheelEvent: event,
                }
                sendEvent(wheelEvent, s)
                prevented = wheelEvent.prevented
            }
            if (!prevented && s.config.viewportControls.allowZooming) changeZoom(-event.deltaY / 1000, s.controller, s.config)
        }

        function onViewportKeyDown(event: KeyboardEvent) {
            // Send graph event
            let prevented = false
            if (s.onEvent != null) {
                const keyEvent: GrapherKeyEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, s.selection),
                    type: "key",
                    keyboardEvent: event,
                }
                sendEvent(keyEvent, s)
                prevented = keyEvent.prevented
            }
            // Deselect everything and un-grab if anything is grabbed
            if (!prevented && event.code === "Escape") {
                s.selection.deselectAll()
                if (grabbed.type != null) {
                    if (grabbed.type === "node" || grabbed.type === "edge") updateGrabbed()
                    grabbed.type = null
                }
            }
        }

        // Document level
        function onPointerMove(event: PointerEvent) {
            // Clear long-click timeout if there is one
            if (grabbed.timeoutID !== -1) {
                clearTimeout(grabbed.timeoutID)
                grabbed.timeoutID = -1
            }
            // Allow small movement (5px) without beginning the move
            if (grabbed.type != null && !grabbed.hasMoved && Math.abs(event.clientX - grabbed.startX) ** 2
                + Math.abs(event.clientY - grabbed.startY) ** 2 < s.config.userControls.minimumPointerMovement ** 2) return

            // TODO Handle
            if (grabbed.type === "viewport") {
                // User is moving the viewport (panning the graph)
                if (!s.config.viewportControls.allowPanning) return
                // Send event
                let prevented = false
                if (s.onEvent != null) {
                    const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                        ...createEvent(grabbed, s.selection),
                        type: "pointer",
                        subType: "move",
                        clickCount: 0,
                        pointerEvent: event,
                        target: "viewport",
                        targetID: "",
                    }
                    sendEvent(grapherEvent, s)
                    prevented = grapherEvent.prevented
                }
                if (prevented) return
                grabbed.hasMoved = true
                // Calculate how the viewport should be moved
                const deltaX = event.movementX / s.controller.getViewport().zoom
                const deltaY = event.movementY / s.controller.getViewport().zoom
                const viewport = s.controller.getViewport()
                s.controller.setViewport({
                    zoom: viewport.zoom,
                    centerX: viewport.centerX - deltaX,
                    centerY: viewport.centerY - deltaY,
                })
            } else if (grabbed.type === "node") {
                // User is currently moving a node
                const node = s.nodes.get(grabbed.id)
                if (node == null) {
                    errorUnknownNode(grabbed.id)
                    return
                }
                if (node.allowMoving === false || (node.allowMoving === undefined && s.config.nodeDefaults.allowMoving === false)) return
                // Send event
                let prevented = false
                if (s.onEvent != null) {
                    const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                        ...createEvent(grabbed, s.selection),
                        type: "pointer",
                        subType: "move",
                        clickCount: 0,
                        pointerEvent: event,
                        target: "node",
                        targetID: grabbed.id,
                    }
                    sendEvent(grapherEvent, s)
                    prevented = grapherEvent.prevented
                }
                if (prevented) return
                grabbed.hasMoved = true
                // Calculate where the node should arrive
                const deltaX = event.movementX / s.controller.getViewport().zoom, deltaY = event.movementY / s.controller.getViewport().zoom
                const newPosition = new DOMPoint(node.position.x + deltaX, node.position.y + deltaY)

                // Move grabbed node
                const changes: GrapherChange[] = [{
                    type: "node-move",
                    event: "move-pointer",
                    oldPosition: node.position,
                    position: newPosition,
                    selected: node.selected,
                    node: node,
                }]

                if (node.selected) {
                    // And move all selected nodes
                    for (const sel of s.selection.getNodesSelection()) {
                        if (sel === node.id) continue // grabbed node is already added
                        const n = s.nodes.get(sel)
                        if (n == null) {
                            errorUnknownNode(sel)
                            continue
                        }
                        // Check if moving is allowed
                        if (n.allowMoving === false || (n.allowMoving === undefined && s.config.nodeDefaults.allowMoving === false)) continue
                        // Add node change
                        changes.push({
                            type: "node-move",
                            event: "selected",
                            oldPosition: n.position,
                            position: new DOMPoint(n.position.x + deltaX, n.position.y + deltaY),
                            selected: n.selected,
                            node: n,
                        })
                    }
                } else s.selection.deselectAllNodes() // if an unselected node is moved, move just that one, deselect the others
                // Deselect edges TODO should edges stay selected?
                s.selection.deselectAllEdges()

                sendChanges(changes, s)
            }
        }

        function onPointerUp(event: PointerEvent) {
            // Clear long-click timeout if there is one
            if (grabbed.timeoutID !== -1) {
                clearTimeout(grabbed.timeoutID)
                grabbed.timeoutID = -1
            }
            if (grabbed.type == "resizing") {
                grabbed.type = null
                return
            } else if (grabbed.type == null) return

            let prevented = false;
            if (s.onEvent != null) {
                const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, s.selection),
                    type: "pointer",
                    subType: "document-up",
                    clickCount: 0,
                    pointerEvent: event,
                    target: grabbed.type,
                    targetID: grabbed.id,
                }
                sendEvent(grapherEvent, s)
                prevented = grapherEvent.prevented
            }
            if (!prevented) {
                if (grabbed.type !== "viewport") updateGrabbed()
                grabbed.type = null
            }
        }

        // Viewport-level listeners
        const viewportElem = ref.current.querySelector<HTMLElement>("." + VIEWPORT_CLASS)
        if (viewportElem == null) criticalCustom("Unable to find viewport DOM node")
        else if (!props.static) {
            viewportElem.addEventListener("pointerdown", onViewportPointerDown)
            viewportElem.addEventListener("pointerup", onViewportPointerUp)
            viewportElem.addEventListener("wheel", onViewportWheel)
            viewportElem.addEventListener("keydown", onViewportKeyDown)
        }

        // Document-level listeners
        if (!props.static) {
            document.addEventListener("pointermove", onPointerMove)
            document.addEventListener("pointerup", onPointerUp)
        }

        // Cleanup
        if (!props.static) return () => {
            // Remove viewport listeners
            if (viewportElem != null) {
                viewportElem.removeEventListener("pointerdown", onViewportPointerDown)
                viewportElem.removeEventListener("pointerup", onViewportPointerUp)
                viewportElem.removeEventListener("wheel", onViewportWheel)
                viewportElem.removeEventListener("keydown", onViewportKeyDown)
            }
            // Remove document listeners
            document.removeEventListener("pointermove", onPointerMove)
            document.removeEventListener("pointerup", onPointerUp)
        }
    }, [props.static])

    useEffect(() => {
        if (s.controller.fitViewValue > needFitView.current) {
            ++needFitView.current
            fitView(s.config.fitViewConfig, s.config.viewportControls, s.controller, fitViewBounds.current, ref.current!)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [controller.fitViewValue, needFitView.current])

    // Fit view on resize
    useEffect(() => {
        if (props.fitViewOnResize && ref.current != null) {
            let firstObserve = true
            const observer = new ResizeObserver(() => {
                if (firstObserve) firstObserve = false
                else fitView(s.config.fitViewConfig, s.config.viewportControls, s.controller, fitViewBounds.current, ref.current!)
            })
            observer.observe(ref.current)
            return () => observer.disconnect()
        }
    }, [props.fitViewOnResize])

    // Internal context and object event listeners
    const internalContext: InternalContextValue = useMemo(() => ({
        id,
        isStatic: props.static ?? false,
        nodeZIndex: config.nodesOverEdges ? Z_INDEX_EDGES : Z_INDEX_NODE,
        rerenderEdges: updateEdges,
        recalculateBounds,
        onResizeStart: id => {
            if (grabbed.type == null) {
                grabbed.type = "resizing"
                grabbed.id = id
            }
        },
        onObjectPointerDown(event: PointerEvent) {
            const r = processDomElement<N, E>(event.currentTarget, s.nodes, s.edges)
            if (r == null) return
            // If an edge is the target, check if pointer position is close to source/target points
            let edgeSection: undefined | "source" | "target"
            if (r.type === "edge" && contentRef.current != null) {
                const edge = r.obj as EdgeImpl<E>
                // Convert client coordinates to Grapher coordinates
                const contentRect = contentRef.current.getBoundingClientRect()
                const zoom = s.controller.viewport.zoom
                const x = (event.clientX - contentRect.x) / zoom + s.bounds.x, y = (event.clientY - contentRect.y) / zoom + s.bounds.y
                const sourceDistance2 = (x - edge.sourcePos.x) ** 2 + (y - edge.sourcePos.y) ** 2
                const targetDistance2 = (x - edge.targetPos.x) ** 2 + (y - edge.targetPos.y) ** 2
                const threshold2 = s.config.userControls.edgeHandleThreshold ** 2
                // Check if event point is close to source/target points
                if (sourceDistance2 < threshold2) edgeSection = "source"
                else if (targetDistance2 < threshold2) edgeSection = "target"
            }

            let prevented = false
            if (s.onEvent != null) {
                const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, s.selection),
                    type: "pointer",
                    edgeSection,
                    subType: "down",
                    clickCount: 0,
                    pointerEvent: event,
                    target: r.type,
                    targetID: r.objID,
                }
                sendEvent(grapherEvent, s)
                prevented = grapherEvent.prevented
            }
            if (prevented || grabbed.type != null) return

            // "Grab" the object
            // And initiate timer for long-click detection
            const timeoutID = s.config.userControls.longClickDelay < 0 || s.onEvent == null ? -1 : window.setTimeout(() => {
                const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, s.selection),
                    type: "pointer",
                    subType: "long-click",
                    clickCount: 0,
                    pointerEvent: event,
                    target: r!.type,
                    targetID: r!.objID,
                }
                sendEvent(grapherEvent, s)
            }, s.config.userControls.longClickDelay)
            grabbed.type = r.type
            grabbed.section = edgeSection
            if (r.type === "handle") grabbed.node = r.node
            grabbed.id = r.objID
            grabbed.clickCount = (lastClicked.type === r.type && lastClicked.id === r.objID && lastClicked.time + s.config.userControls.multiClickDelay > Date.now())
                ? lastClicked.times + 1
                : 1
            grabbed.hasMoved = false
            grabbed.startX = event.clientX
            grabbed.startY = event.clientY
            grabbed.timeoutID = timeoutID
            updateGrabbed()
        },
        onObjectPointerUp(event: PointerEvent) {
            const r = processDomElement<N, E>(event.currentTarget, s.nodes, s.edges)
            if (r == null) return
            if (s.onEvent != null) {
                const upEvent: GrapherPointerEvent = {
                    ...createEvent(grabbed, s.selection),
                    type: "pointer",
                    subType: "up",
                    clickCount: 0,
                    pointerEvent: event,
                    target: r.type,
                    targetID: r.objID,
                }
                sendEvent(upEvent, s)
            }

            if (grabbed.type === r.type && grabbed.id === r.objID && !grabbed.hasMoved) {
                // Remember that the object was clicked
                lastClicked.type = r.type
                lastClicked.id = r.objID
                lastClicked.times = grabbed.clickCount
                lastClicked.time = Date.now()
                // Send event
                let prevented = false
                if (s.onEvent != null) {
                    const upEvent: GrapherPointerEvent & GrapherEventImpl = {
                        ...createEvent(grabbed, s.selection),
                        type: "pointer",
                        subType: "click",
                        clickCount: grabbed.clickCount,
                        pointerEvent: event,
                        target: r.type,
                        targetID: r.objID,
                    }
                    sendEvent(upEvent, s)
                    prevented = upEvent.prevented
                }
                // Stop if it's a handle
                if (r.type === "handle") return
                // Check if selection is allowed
                if (r.obj.allowSelection === false || (r.obj.allowSelection === undefined && (
                    (r.type === "node" && s.config.nodeDefaults.allowSelection === false) || (r.type === "edge" && s.config.edgeDefaults.allowSelection === false)
                ))) return
                // Select the object
                if (!prevented) {
                    if (r.type === "node") s.selection.setNodeSelected(r.objID, event.shiftKey ? !r.obj.selected : true, !event.shiftKey)
                    else s.selection.setEdgeSelected(r.objID, event.shiftKey ? !r.obj.selected : true, !event.shiftKey)
                }
            }
        },
        // Doesn't matter because they're set below
        nodeBeingResized: false,
        getNode: null as any,
        getEdge: null as any,
    }), [id, props.static, config.nodesOverEdges])
    // This is not put in the useMemo above because nodes/edges objects changing should not trigger a context value change & subsequent re-renders
    // As the result of the function itself does not change
    internalContext.getNode = nodes.internalMap.get.bind(nodes.internalMap)
    internalContext.getEdge = edges.internalMap.get.bind(edges.internalMap)
    internalContext.nodeBeingResized = grabbed.type === "resizing" && grabbed.id

    // Context for other components outside the Viewport
    const grapherContext: GrapherContextValue = useMemo(() => ({
        id, nodes: nodes as any, edges: edges as any, selection, controller
    }), [id, nodes, edges, selection, controller])

    return <BoundsContext.Provider value={bounds}><InternalContext.Provider value={internalContext}><GrapherContext.Provider value={grapherContext}>
        <GraphDiv id={id} ref={ref} width={props.width} height={props.height} className={REACT_GRAPHER_CLASS}>
            <GrapherViewport contentRef={contentRef} controller={controller}>
                <Nodes className={NODES_CLASS} nodesOverEdges={config.nodesOverEdges}>
                    {nodeElements}
                </Nodes>
                <Edges className={EDGES_CLASS} nodesOverEdges={config.nodesOverEdges} viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}>
                    <defs>
                        <marker id={`${id}-${MARKER_ARROW_FILLED_ID}`} className={MARKER_ARROW_FILLED_CLASS} viewBox={"0 0 14 14"} refX={5} refY={7} orient={"auto-start-reverse"}>
                            <path d={"M 0 0 l 10 7 l -10 7 z"}/>
                        </marker>
                        <marker id={`${id}-${MARKER_ARROW_ID}`} className={MARKER_ARROW_CLASS} viewBox={"-2 -2 14 14"} refX={6} refY={5} orient={"auto-start-reverse"}>
                            <path d={"M 0 0 l 8 5 l -8 5"}/>
                        </marker>
                        {props.customMarkers}
                    </defs>
                    <g>{edgeElements}</g>
                </Edges>
            </GrapherViewport>
            {props.children}
        </GraphDiv>
    </GrapherContext.Provider></InternalContext.Provider></BoundsContext.Provider>
}