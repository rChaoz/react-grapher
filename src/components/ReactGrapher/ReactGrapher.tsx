import React, {useEffect, useMemo, useRef, useState} from "react";
import {applyNodeDefaults, Node, NodeImpl, Nodes, NodesImpl} from "../../data/Node"
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
    Z_INDEX_EDGES,
    Z_INDEX_NODE
} from "../../util/constants";
import {GrapherConfig, GrapherConfigSet, withDefaultsConfig} from "../../data/GrapherConfig";
import {GrapherChange} from "../../data/GrapherChange";
import {checkErrorInvalidID, errorCustom, errorUnknownNode, warnCustom, warnUnknownHandle} from "../../util/log";
import {BoundsContext} from "../../context/BoundsContext";
import {InternalContext, InternalContextValue} from "../../context/InternalContext";
import {SimpleEdge} from "../SimpleEdge";
import {getNodeBorderPoint} from "../../util/EdgeHelper";
import {deepEquals, expandRect, localMemo} from "../../util/utils";
import {createEvent, GrapherEventImpl, GrapherPointerEvent} from "../../data/GrapherEvent";

import {SelectionImpl} from "../../data/Selection";
import {usePersistent} from "../../hooks/usePersistent";

import {CommonGraphProps, ControlledGraphProps, UncontrolledGraphProps} from "./props";
import {
    checkConnection,
    findNewID,
    fitView,
    getEdgeConfig,
    getHandleConfig,
    getNodeConfig,
    GrabbedNode,
    LastClicked,
    parseAllowedConnections,
    processDomElement,
    sendChanges,
    sendEvent,
    toGrapherCoordinates
} from "./utils";
import {useCallbackState} from "../../hooks/useCallbackState";
import {useUpdate} from "../../hooks/useUpdate";
import {useSelection} from "../../hooks/useSelection";
import {GrapherContext, GrapherContextValue} from "../../context/GrapherContext";
import {SimpleInProgressEdge} from "../SimpleInProgressEdge";


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
        // Check static prop
        if (props.static) {
            if (props.config?.hideControls === undefined) c.hideControls = true
            if (props.config?.fitViewConfig?.abideMinMaxZoom === undefined) c.fitViewConfig.abideMinMaxZoom = false
        }
        // And check zoom levels
        if (c.viewportControls.minZoom > c.viewportControls.maxZoom) {
            warnCustom("GrapherConfig.viewportControls - minZoom is greater than maxZoom. Swapping values.");
            [c.viewportControls.minZoom, c.viewportControls.maxZoom] = [c.viewportControls.maxZoom, c.viewportControls.minZoom]
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
    // Same for controller and node.edge defaults
    controller.nodeDefaults = config.nodeDefaults
    controller.edgeDefaults = config.edgeDefaults

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

    // Calling this function causes the ReactGrapher to re-render
    const updateGrapher = useUpdate()[1]

    // Parse allowed edges from config
    const allowedConnections = useMemo(() => {
        // Also de-verify all edges when this changes
        for (const edge of edges) edge.verified = false
        return parseAllowedConnections(config.allowedConnections)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.allowedConnections])

    // Currently grabbed node
    const grabbed = usePersistent<GrabbedNode<N>>(
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
    // Node & edge ID counters, used to generate new IDs for nodes & edges
    const idCounters = usePersistent({node: 1, edge: 1})

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

    const [shouldUpdateEdges, updateEdges] = useUpdate()
    // Mark the pairs of edges that are between the same 2 points, different directions, to slightly separate them when drawn
    useMemo(() => {
        if (shouldUpdateEdges) {
            // for eslint warning
        }
        // TODO Improve this to less than O(n^2), maybe add adjacency lists?
        for (const e of edges) e.separate = e.duplicate = false
        for (const e1 of edges) for (const e2 of edges) {
            if (e1.source === e2.target && e1.target === e2.source
                && e1.sourceHandle === e2.targetHandle && e1.targetHandle === e2.sourceHandle)
                e1.separate = e2.separate = true
            if (e1 !== e2 && !e1.duplicate && e1.source === e2.source && e1.target === e2.target
                && e1.sourceHandle === e2.sourceHandle && e1.targetHandle === e2.targetHandle)
                e2.duplicate = true
        }
    }, [edges, shouldUpdateEdges])

    // Same for Edges
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
            if (edge.sourceHandle == null) return getNodeBorderPoint(source, target)
            else {
                const handle = source.handles.find(handle => handle.name === edge.sourceHandle)
                if (handle == null) return source.absolutePosition
                else return new DOMPoint(source.absolutePosition.x + handle.x, source.absolutePosition.y + handle.y)
            }
        }, [source.absolutePosition, target.absolutePosition, source.width, source.height, source.borderRadius, source.handles, edge.sourceHandle], edge.sourcePosMemoObject)
        edge.targetPos = localMemo(() => {
            if (edge.targetHandle == null) return getNodeBorderPoint(target, source)
            else {
                const handle = target.handles.find(handle => handle.name === edge.targetHandle)
                if (handle == null) {
                    warnUnknownHandle(edge.id, target.id, edge.targetHandle, target.handles.map(handle => handle.name))
                    return target.absolutePosition
                } else return new DOMPoint(target.absolutePosition.x + handle.x, target.absolutePosition.y + handle.y)
            }
        }, [source.absolutePosition, target.absolutePosition, target.width, target.height, target.borderRadius, target.handles, edge.targetHandle], edge.targetPosMemoObject)
        return <Component key={edge.id} id={edge.id} data={edge.data} classes={edge.classes} boxWidth={config.userControls.edgeBoxWidth}
                          separate={getEdgeConfig("allowOverlapSeparation", edge, s.config) && edge.separate} labelBackgroundRadius={edge.labelBackgroundRadius}
                          source={source} sourcePos={edge.sourcePos} sourceHandle={edge.sourceHandle} markerStart={edge.markerStart}
                          target={target} targetPos={edge.targetPos} targetHandle={edge.targetHandle} markerEnd={edge.markerEnd}
                          selected={edge.selected} grabbed={grabbed.type === "edge" && grabbed.id === edge.id} pointerEvents={edge.pointerEvents}
                          label={edge.label} labelPosition={edge.labelPosition} labelOffset={edge.labelOffset} labelRotateWithEdge={edge.labelRotateWithEdge}/>
    }), [nodes, edges, selection, shouldUpdateGrabbed, shouldUpdateEdges, config.userControls.edgeBoxWidth])

    // Verify edges and compute handles for those that have them set to "auto" (undefined)
    useEffect(() => {
        let mustUpdateEdges = false
        const newEdges: Edge<E>[] = []
        for (const edge of edges) {
            // Remove duplicate edges
            if (edge.duplicate) continue
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
                if (!checkConnection(source, target, sourceHandle, targetHandle, allowedConnections) && !config.allowIllegalEdges) {
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
                        if (checkConnection(source, target, possibleSourceHandle, targetHandle, allowedConnections)) {
                            edge.sourceHandle = possibleSourceHandle.name
                            mustUpdateEdges = ok = true
                            break
                        }
                    }
                    if (!ok) if (checkConnection(source, target, null, targetHandle, allowedConnections)) {
                        edge.sourceHandle = null
                        mustUpdateEdges = ok = true
                    }
                } else if (sourceHandle != null && targetHandle == null) { // only target handle unset
                    for (const possibleTargetHandle of target.handles) {
                        if (checkConnection(source, target, sourceHandle, possibleTargetHandle, allowedConnections)) {
                            edge.targetHandle = possibleTargetHandle.name
                            mustUpdateEdges = ok = true
                            break
                        }
                    }
                    if (!ok) if (checkConnection(source, target, sourceHandle, null, allowedConnections)) {
                        edge.targetHandle = null
                        mustUpdateEdges = ok = true
                    }
                } else { // both handles unset
                    for (const possibleSourceHandle of source.handles) {
                        for (const possibleTargetHandle of target.handles) {
                            if (checkConnection(source, target, possibleSourceHandle, possibleTargetHandle, allowedConnections)) {
                                edge.sourceHandle = possibleSourceHandle.name
                                edge.targetHandle = possibleTargetHandle.name
                                mustUpdateEdges = ok = true
                                break
                            }
                        }
                    }
                    if (!ok) for (const possibleSourceHandle of source.handles) {
                        if (checkConnection(source, target, possibleSourceHandle, null, allowedConnections)) {
                            edge.sourceHandle = possibleSourceHandle.name
                            edge.targetHandle = null
                            mustUpdateEdges = ok = true
                            break
                        }
                    }
                    if (!ok) for (const possibleTargetHandle of target.handles) {
                        if (checkConnection(source, target, null, possibleTargetHandle, allowedConnections)) {
                            edge.sourceHandle = null
                            edge.targetHandle = possibleTargetHandle.name
                            mustUpdateEdges = ok = true
                            break
                        }
                    }
                    if (!ok) if (checkConnection(source, target, null, null, allowedConnections)) {
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
    // Ref to the content div
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

    // Add document-level listeners
    useEffect(() => {
        function onPointerMove(event: PointerEvent) {
            // Clear long-click timeout if there is one
            if (grabbed.timeoutID !== -1) {
                clearTimeout(grabbed.timeoutID)
                grabbed.timeoutID = -1
            }
            // Allow small movement (5px) without beginning the move
            if (grabbed.type != null && !grabbed.hasMoved && Math.abs(event.clientX - grabbed.startX) ** 2
                + Math.abs(event.clientY - grabbed.startY) ** 2 < s.config.userControls.minimumPointerMovement ** 2) return

            // If there is a node/edge being created, update size/positions
            if (s.controller.inProgressEdge != null) {
                if (contentRef.current != null) {
                    (s.controller.inProgressEdge as any as EdgeImpl<any>).targetPos =
                        toGrapherCoordinates(event, s.bounds, contentRef.current.getBoundingClientRect(), s.controller.viewport.zoom)
                    updateGrapher()
                    return
                }
            }

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
                // TODO Allow creating new edges from nodes
                // User is currently moving a node
                const node = s.nodes.get(grabbed.id)
                if (node == null) {
                    errorUnknownNode(grabbed.id)
                    return
                }
                if (!getNodeConfig("allowMoving", node, s.config)) return
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
                    type: "node",
                    subType: "move",
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
                        if (!getNodeConfig("allowMoving", n, s.config)) continue
                        // Add node change
                        changes.push({
                            type: "node",
                            subType: "move",
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
            } else if (grabbed.type === "handle") {
                const handle = (grabbed.node as NodeImpl<N>).handles.find(h => h.name === grabbed.id)
                if (handle == null || !getHandleConfig("allowNewEdges", handle, grabbed.node, s.config)) return
                const newID = findNewID(idCounters.edge, s.edges.internalMap)
                s.controller.setInProgressEdge({
                    id: String(newID),
                    source: grabbed.node.id,
                    sourceHandle: grabbed.id
                })
            }
        }

        function onPointerUp(event: PointerEvent) {
            // Clear long-click timeout if there is one
            if (grabbed.timeoutID !== -1) {
                clearTimeout(grabbed.timeoutID)
                grabbed.timeoutID = -1
            }
            if (grabbed.type == null) return
            else if (grabbed.type == "resizing") {
                grabbed.type = null
                return
            }
            if (s.controller.inProgressEdge != null) s.controller.setInProgressEdge(null)

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

        if (!props.static) {
            document.addEventListener("pointermove", onPointerMove)
            document.addEventListener("pointerup", onPointerUp)
        }
        if (!props.static) return () => {
            // Remove document listeners
            document.removeEventListener("pointermove", onPointerMove)
            document.removeEventListener("pointerup", onPointerUp)
        }
    }, [props.static, updateGrapher])

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
            let r = processDomElement<N, E>(event.currentTarget, s.nodes, s.edges)
            if (r == null) return
            // If an edge is the target, check if pointer position is close to source/target points
            let edgeSection: undefined | "source" | "target"
            if (r.type === "edge" && contentRef.current != null) {
                const edge = r.obj as EdgeImpl<E>
                // Convert client coordinates to Grapher coordinates
                const p = toGrapherCoordinates(event, s.bounds, contentRef.current.getBoundingClientRect(), s.controller.viewport.zoom)
                const sourceDistance2 = (p.x - edge.sourcePos.x) ** 2 + (p.y - edge.sourcePos.y) ** 2
                const targetDistance2 = (p.x - edge.targetPos.x) ** 2 + (p.y - edge.targetPos.y) ** 2
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
            // But first, check if grabbing is allowed
            switch (r.type) {
                // For node & edge, the viewport is right behind and will receive the pointerdown event next, no need to do anything
                case "node":
                    if (!getNodeConfig("allowGrabbing", r.obj, s.config)) return
                    break
                case "edge":
                    if (!getEdgeConfig("allowGrabbing", r.obj, s.config)) return
                    break
                case "handle":
                    // For a handle, the node is not behind (they are siblings), so we need to redirect the event explicitly
                    if (!getHandleConfig("allowGrabbing", r.obj, r.node, s.config)) r = {
                        type: "node",
                        objID: r.node.id,
                        obj: r.node,
                    }
                    break
            }

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
            let prevented = false
            if (s.onEvent != null) {
                const upEvent: GrapherPointerEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, s.selection),
                    type: "pointer",
                    subType: "up",
                    clickCount: 0,
                    pointerEvent: event,
                    target: r.type,
                    targetID: r.objID,
                }
                sendEvent(upEvent, s)
                prevented = upEvent.prevented
            }

            // Finish edge creation, if there is any
            const wipEdge = s.controller.getInProgressEdge() as Edge<E> | null
            if (wipEdge != null && !prevented) {
                // TODO Respect GrapherConfig.allowReverseConnections
                if (r.type === "handle") {
                    const handle = (r.node as NodeImpl<N>).handles.find(h => h.name === r.objID)
                    if (handle == null || !getHandleConfig("allowNewEdgeTarget", handle, r.node, s.config)) return
                    // TODO Add config option to disallow edges from one node to the same node - "allowSelfEdges"
                    wipEdge.target = r.node.id
                    wipEdge.targetHandle = r.objID
                    ++idCounters.edge
                    sendChanges([{
                        type: "edge",
                        subType: "new",
                        edge: wipEdge,
                    }], s)
                } else if (r.type === "node") {
                    if (!getNodeConfig("allowNewEdgeTarget", r.obj, s.config)) return
                    wipEdge.target = r.objID
                    wipEdge.targetHandle = null
                    ++idCounters.edge
                    sendChanges([{
                        type: "edge",
                        subType: "new",
                        edge: wipEdge,
                    }], s)
                }
                return
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
                // Stop if it's a handle or selection is not allowed
                if (r.type === "handle"
                    || r.type === "node" && !getNodeConfig("allowSelection", r.obj, s.config)
                    || r.type === "edge" && !getEdgeConfig("allowSelection", r.obj, s.config))
                    return
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

    // In-progress edge
    const wipEdge = controller.inProgressEdge as EdgeImpl<any> | null
    const WipEdgeComponent = controller.inProgressEdge?.InProgressComponent ?? SimpleInProgressEdge
    let wipEdgeSource: NodeImpl<N> | undefined
    if (wipEdge != null) {
        wipEdgeSource = nodes.get(wipEdge.source) as NodeImpl<N> | undefined
        if (wipEdgeSource == null) errorCustom("In-progress edge has unknown source node: " + wipEdge.source)
        else {
            wipEdge.sourcePos = localMemo(() => {
                if (wipEdge.sourceHandle == null) return getNodeBorderPoint(wipEdgeSource!, wipEdge.targetPos)
                else {
                    const handle = wipEdgeSource!.handles.find(handle => handle.name === wipEdge.sourceHandle)
                    if (handle == null) return wipEdgeSource!.absolutePosition
                    else return new DOMPoint(wipEdgeSource!.absolutePosition.x + handle.x, wipEdgeSource!.absolutePosition.y + handle.y)
                }
            }, [wipEdgeSource.absolutePosition, wipEdgeSource.width, wipEdgeSource.height, wipEdge.targetPos,
                wipEdgeSource.borderRadius, wipEdgeSource.handles, wipEdge.sourceHandle], wipEdge.sourcePosMemoObject)
        }
    }

    return <BoundsContext.Provider value={bounds}><InternalContext.Provider value={internalContext}><GrapherContext.Provider value={grapherContext}>
        <GraphDiv id={id} ref={ref} width={props.width} height={props.height} className={REACT_GRAPHER_CLASS}>
            <GrapherViewport contentRef={contentRef} isStatic={props.static} controller={controller} lastClicked={lastClicked}
                             grabbed={grabbed} updateGrabbed={updateGrabbed} callbackState={s}>
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
                    <g>
                        {edgeElements}
                        {wipEdge && wipEdgeSource &&
                            <WipEdgeComponent id={wipEdge.id} data={wipEdge.data} classes={wipEdge.classes} boxWidth={config.userControls.edgeBoxWidth} separate={false}
                                              source={wipEdgeSource} sourcePos={wipEdge.sourcePos} sourceHandle={wipEdge.sourceHandle} markerStart={wipEdge.markerStart}
                                              targetPos={wipEdge.targetPos} markerEnd={wipEdge.markerEnd}
                                              selected={wipEdge.selected} grabbed={grabbed.type === "edge" && grabbed.id === wipEdge.id} pointerEvents={wipEdge.pointerEvents}
                                              label={wipEdge.label} labelPosition={wipEdge.labelPosition} labelOffset={wipEdge.labelOffset}
                                              labelRotateWithEdge={wipEdge.labelRotateWithEdge} labelBackgroundRadius={wipEdge.labelBackgroundRadius}/>}
                    </g>
                </Edges>
            </GrapherViewport>
            {props.children}
        </GraphDiv>
    </GrapherContext.Provider></InternalContext.Provider></BoundsContext.Provider>
}