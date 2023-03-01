import React, {useEffect, useMemo, useRef, useState} from "react";
import {applyNodeDefaults, Node, NodeData, NodeImpl, Nodes, NodesImpl} from "../data/Node"
import {applyEdgeDefaults, Edge, EdgeData, Edges, EdgesImpl} from "../data/Edge";
import styled from "@emotion/styled";
import {useController} from "../hooks/useController";
import {useGraphState} from "../hooks/useGraphState";
import {GrapherViewport} from "./GrapherViewport";
import {Controller, ControllerImpl} from "../data/Controller";
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
} from "../util/constants";
import {GrapherConfig, GrapherConfigSet, GrapherFitViewConfigSet, withDefaultsConfig} from "../data/GrapherConfig";
import {GrapherChange} from "../data/GrapherChange";
import {checkInvalidID, criticalNoViewport, errorUnknownDomID, errorUnknownNode, warnNoReactGrapherID} from "../util/log";
import {BoundsContext} from "../context/BoundsContext";
import {GrapherContext, GrapherContextValue} from "../context/GrapherContext";
import {SimpleEdge} from "./SimpleEdge";
import {getNodeIntersection} from "../util/EdgePath";
import {enlargeRect, localMemo, parseCssStringOrNumber, resolveValue} from "../util/utils";
import {createEvent, GrapherEvent, GrapherEventImpl, GrapherKeyEvent, GrapherPointerEvent, GrapherWheelEvent} from "../data/GrapherEvent";
// This is used for documentation link
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Marker} from "./Marker";
import {useUpdate} from "../hooks/useUpdate";
import {Selection, SelectionImpl} from "../data/Selection";
import {CallbacksContext, CallbacksContextValue} from "../context/CallbacksContext";
import {usePersistent} from "../hooks/usePersistent";

export interface CommonGraphProps {
    /**
     * ID for the element, must be specified for react versions <18
     */
    id?: string
    /**
     * The width of the root div element. Defaults to '100%'.
     */
    width?: string
    /**
     * The height of the root div element. Defaults to '100%'.
     */
    height?: string
    /**
     * Used to control the viewport
     */
    controller?: Controller
    /**
     * Elements that will be placed inside the Graph div.
     */
    children?: React.ReactNode
    /**
     * Fine configuration for the Graph.
     *
     * Note: You should *really* memoize this value to avoid performance issues.
     */
    config?: GrapherConfig
    /**
     * Quick option to completely disable all controls. Check `GrapherConfig` for finer tuning.
     */
    disableControls?: boolean
    /**
     * Automatic fit view function. You should not change the value of this prop across renders, it will likely lead to
     * unexpected behaviour. Possible values:
     * 'initial' - fit view after the first render
     * 'always' - fit view every time nodes/edges are updated. You probably want to pair this with `disableControls`
     * undefined/'manual - you can fit view using the Controller returned by useController()/useControlledGraph()
     */
    fitView?: "initial" | "always" | "manual"
    /**
     * Fit view when the DOM element's size changes
     */
    fitViewOnResize?: boolean
    /**
     * This config option will make the graph completely static, by implementing the following changes:
     * - set config.hideControls = true (if undefined)
     * - set config.fitViewConfig.abideMinMaxZoom = false (if undefined)
     * - do not attach any pointer/key listeners
     * - disable pointer events on nodes & edges to prevent CSS hover effects
     *
     * Additionally, if not already set (if undefined), the following props will be set:
     * - fitView -> "always"
     * - fitViewOnResize -> true
     *
     * This is meant to be used when you want to display a graph (e.g. for a preview), but without any user interaction. By default, the view will be permanently fitted, but
     * if you manually set fitView/fitViewOnResize props, they will not be overridden, allowing you to manually call `controller.fitView()` when needed.
     * TODO Test/improve this prop; make sure all pointer events are disabled when true
     */
    static?: boolean
    /**
     * Listen to events such as nodes or edges being clicked, selected, keystrokes or internal events.
     */
    onEvent?: (event: GrapherEvent) => GrapherChange[] | undefined | void
    /**
     * Called whenever the graph would suffer changes, such as nodes being moved or deleted. You can modify the changes before they are committed
     * or cancel them entirely.
     */
    onChange?: (changes: GrapherChange[]) => GrapherChange[] | undefined | void
    /**
     * Custom markers to be used for Edges. They will be placed inside the SVG's `<defs>` element.
     *
     * You should use the {@link Marker} component instead of the standard svg `<marker>` element for them to work.
     * For more info, read Marker's {@link Marker own documentation}.
     */
    customMarkers?: React.ReactNode
}

export interface ControlledGraphProps<N, E> extends CommonGraphProps {
    nodes: Nodes<N>
    edges: Edges<E>
    selection: Selection
}

export interface UncontrolledGraphProps<N, E> extends CommonGraphProps {
    defaultNodes?: NodeData<N>[]
    defaultEdges?: EdgeData<E>[]
}

const GraphDiv = styled.div<Pick<CommonGraphProps, "width" | "height">>`
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

export function ReactGrapher<N, E>(props: ControlledGraphProps<N, E> | UncontrolledGraphProps<N, E>) {
    // Get default config and prevent config object from being created every re-render
    // Also apply settings for static graph if static prop is set
    const config = useMemo(() => {
        const c = withDefaultsConfig(props.config)
        if (props.static) {
            if (props.config?.hideControls === undefined) c.hideControls = true
            if (props.config?.fitViewConfig?.abideMinMaxZoom === undefined) c.fitViewConfig.abideMinMaxZoom = false
        }
        return c
    }, [props.config, props.static])
    if (props.static) {
        if (props.fitView === undefined) props.fitView = "always"
        if (props.fitViewOnResize === undefined) props.fitViewOnResize = true
    }

    let nodes: NodesImpl<N>
    let edges: EdgesImpl<E>
    let selection: SelectionImpl

    // Ensure rules of hooks are always met - we never know when this component is uncontrolled one render and controlled the next render
    const {nodes: ownNodes, edges: ownEdges, selection: ownSelection}
        = useGraphState((props as UncontrolledGraphProps<N, E>).defaultNodes, (props as UncontrolledGraphProps<N, E>).defaultEdges)
    const ownController = useController()
    const controller = (props.controller ?? ownController) as ControllerImpl

    // Controlled graphs use provided nodes & edges objects
    if ("nodes" in props) {
        nodes = props.nodes as NodesImpl<N>
        edges = props.edges as EdgesImpl<E>
        selection = props.selection as SelectionImpl
    }
    // Uncontrolled Graphs manage their own state
    else {
        nodes = ownNodes as NodesImpl<N>
        edges = ownEdges as EdgesImpl<E>
        selection = ownSelection as SelectionImpl
    }
    selection.multipleSelection = config.userControls.multipleSelection

    // Check react version before using useID - react 18 introduced it, but peerDependencies specifies a lower version
    const useID = React.useId
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ownID = typeof useID === "function" ? useID().replace(/:/g, "X") // replace ':' with 'X' as ':' is not a valid CSS selector character
        : null
    let id: string
    if (props.id != null) {
        checkInvalidID("ReactGrapher", props.id)
        id = props.id
    } else if (ownID == null) {
        id = "react-grapher"
        warnNoReactGrapherID()
    } else id = ownID

    // Currently grabbed (being moved) node
    interface GrabbedNode {
        // When these properties are changed, a new object is created to update the state
        type: "node" | "edge" | "viewport" | "resizing" | null
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
        type: "node" | "edge" | "viewport" | null
        id: string
        times: number
        time: number
    }

    // Currently grabbed node
    const grabbed = usePersistent<GrabbedNode>({type: null, id: "", clickCount: 0, startX: 0, startY: 0, hasMoved: false, timeoutID: -1})
    const [shouldUpdateGrabbed, updateGrabbed] = useUpdate()
    // Last clicked node (used to detect multi-clicks)
    const lastClicked = usePersistent<LastClicked>({type: null, id: "", times: 0, time: 0})

    // Render the Nodes TODO Try useMemo as well
    const nodeElements = useMemo(() => nodes.map(node => {
        if (shouldUpdateGrabbed || selection) {
            // for eslint warning
        }
        applyNodeDefaults(node, config.nodeDefaults)
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
                          resize={node.resize} grabbed={grabbed.type === "node" && grabbed.id === node.id} selected={node.selected} parent={parent} position={node.position}/>
    }), [config.nodeDefaults, grabbed, nodes, selection, shouldUpdateGrabbed])

    // Same for Edges TODO Same
    const [shouldUpdateEdges, updateEdges] = useUpdate()
    const edgeElements = useMemo(() => edges.map(edge => {
        if (shouldUpdateGrabbed || shouldUpdateEdges || selection) {
            // for eslint warning
        }
        applyEdgeDefaults(edge, config.edgeDefaults)
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
        // TODO Implement handles
        edge.sourcePos = localMemo(() =>
                edge.sourceHandle == null ? getNodeIntersection(source, target) : source.absolutePosition,
            [source.absolutePosition, target.absolutePosition, source.width, source.height, source.borderRadius], edge.sourcePosMemoObject)
        edge.targetPos = localMemo(() =>
                edge.targetHandle == null ? getNodeIntersection(target, source) : target.absolutePosition,
            [source.absolutePosition, target.absolutePosition, target.width, target.height, target.borderRadius], edge.targetPosMemoObject)
        return <Component key={edge.id} id={edge.id} data={edge.data} classes={edge.classes} label={edge.label} labelPosition={edge.labelPosition}
                          source={source} sourcePos={edge.sourcePos} sourceHandle={edge.sourceHandle} markerStart={edge.markerStart}
                          target={target} targetPos={edge.targetPos} targetHandle={edge.targetHandle} markerEnd={edge.markerEnd}
                          selected={edge.selected} grabbed={grabbed.type === "edge" && grabbed.id === edge.id}/>
    }), [config.edgeDefaults, grabbed, nodes, edges, selection, shouldUpdateGrabbed, shouldUpdateEdges])

    // Ref to the ReactGrapher root div
    const ref = useRef<HTMLDivElement>(null)

    // Calculate bounds
    const [bounds, setBounds] = useState(new DOMRect())
    const [shouldRecalculateBounds, recalculateBounds] = useUpdate()
    useEffect(() => {
        const rect = nodes.length > 0
            ? new DOMRect(nodes[0].position.x, nodes[0].position.y, 0, 0)
            : new DOMRect()
        for (const node of nodes) {
            /* Update bounding rect
            'right' needs to be x + width and not x + width/2 because nodes use translateX(-50%) to center themselves. This means, although its true 'right'
            is indeed x + width/2, its layout 'right' does not take transforms into account. And, if the node's layout right is out of bounds, text inside the node
            will start wrapping, and we don't want that! Same thing for 'bottom' - it needs to be y + height, not y + height/2. */
            enlargeRect(rect, {x: node.position.x - node.width / 2, y: node.position.y - node.height / 2, width: node.width * 1.5, height: node.height * 1.5})
        }
        for (const edge of edges) {
            if (edge.bounds == null) continue
            enlargeRect(rect, edge.bounds)
        }
        // Enlarge bounds by decent amount to be sure everything fits
        rect.x -= 200
        rect.y -= 200
        rect.width += 400
        rect.height += 400
        // Update bounds state if bounds changed too much
        if (Math.abs(rect.left - bounds.left) > 100 || Math.abs(rect.top - bounds.top) > 100
            || Math.abs(rect.right - bounds.right) > 100 || Math.abs(rect.bottom - bounds.bottom) > 100) {
            setBounds(rect)
        }
    }, [shouldRecalculateBounds, bounds, nodes, edges])

    // Create object callbacks
    const onEvent = props.onEvent
    const onChange = props.onChange

    // We want the callbacks to use the new state values but without re-creating the callbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const d = useRef() as any as {nodes: NodesImpl<N>, edges: EdgesImpl<E>, selection: SelectionImpl, controller: ControllerImpl}
    d.nodes = nodes
    d.edges = edges
    d.selection = selection
    d.controller = controller

    const objectCallbacks = useMemo<CallbacksContextValue>(() => ({
        onObjectPointerDown(event: PointerEvent) {
            const r = processDomElement(event.currentTarget, d.nodes, d.edges, id)
            if (r == null) return
            let prevented = false
            if (onEvent != null) {
                const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, d.selection),
                    type: "pointer",
                    subType: "down",
                    clickCount: 0,
                    pointerEvent: event,
                    target: r.type,
                    targetID: r.objID,
                }
                onEvent(grapherEvent)
                prevented = grapherEvent.prevented
            }
            // Check if grabbing is allowed
            if (r.obj.allowGrabbing === false || (r.obj.allowGrabbing === undefined && (
                (r.type === "node" && config.nodeDefaults.allowGrabbing === false) || (r.type === "edge" && config.edgeDefaults.allowGrabbing === false)
            ))) return
            // "Grab" the object
            if (!prevented && grabbed.type == null) {
                // And initiate timer for long-click detection
                const timeoutID = config.userControls.longClickDelay < 0 || onEvent == null ? -1 : setTimeout(() => {
                    const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                        ...createEvent(grabbed, d.selection),
                        type: "pointer",
                        subType: "long-click",
                        clickCount: 0,
                        pointerEvent: event,
                        target: r.type,
                        targetID: r.objID,
                    }
                    onEvent(grapherEvent)
                }, config.userControls.longClickDelay)
                grabbed.type = r.type
                grabbed.id = r.objID
                grabbed.clickCount = (lastClicked.type === r.type && lastClicked.id === r.objID && lastClicked.time + config.userControls.multiClickDelay > Date.now())
                    ? lastClicked.times + 1
                    : 1
                grabbed.hasMoved = false
                grabbed.startX = event.clientX
                grabbed.startY = event.clientY
                grabbed.timeoutID = timeoutID
                updateGrabbed()
            }
        },
        onObjectPointerUp(event: PointerEvent) {
            const r = processDomElement(event.currentTarget, d.nodes, d.edges, id)
            if (r == null) return
            if (onEvent != null) {
                const upEvent: GrapherPointerEvent = {
                    ...createEvent(grabbed, d.selection),
                    type: "pointer",
                    subType: "up",
                    clickCount: 0,
                    pointerEvent: event,
                    target: r.type,
                    targetID: r.objID,
                }
                onEvent(upEvent)
            }

            if (grabbed.type === r.type && grabbed.id === r.objID && !grabbed.hasMoved) {
                // Remember that the object was clicked
                lastClicked.type = r.type
                lastClicked.id = r.objID
                lastClicked.times = grabbed.clickCount
                lastClicked.time = Date.now()
                // Send event
                let prevented = false
                if (onEvent != null) {
                    const upEvent: GrapherPointerEvent & GrapherEventImpl = {
                        ...createEvent(grabbed, d.selection),
                        type: "pointer",
                        subType: "click",
                        clickCount: grabbed.clickCount,
                        pointerEvent: event,
                        target: r.type,
                        targetID: r.objID,
                    }
                    onEvent(upEvent)
                    prevented = upEvent.prevented
                }
                // Check if selection is allowed
                if (r.obj.allowSelection === false || (r.obj.allowSelection === undefined && (
                    (r.type === "node" && config.nodeDefaults.allowSelection === false) || (r.type === "edge" && config.edgeDefaults.allowSelection === false)
                ))) return
                // Select the object
                if (!prevented) {
                    if (r.type === "node") d.selection.setNodeSelected(r.objID, event.shiftKey ? !r.obj.selected : true, !event.shiftKey)
                    else d.selection.setEdgeSelected(r.objID, event.shiftKey ? !r.obj.selected : true, !event.shiftKey)
                }
            }
        },
    }), [onEvent, config, id, grabbed, updateGrabbed, lastClicked, d])

    // Add listeners to viewport & document
    useEffect(() => {
        if (ref.current == null) return

        // Listener functions

        // Viewport level
        function onViewportPointerDown(event: PointerEvent) {
            let prevented = false
            if (onEvent != null) {
                const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, d.selection),
                    type: "pointer",
                    subType: "down",
                    clickCount: 0,
                    pointerEvent: event,
                    target: "viewport",
                    targetID: "",
                }
                onEvent(grapherEvent)
                prevented = grapherEvent.prevented
            }
            // "Grab" the viewport
            if (!prevented && grabbed.type == null) {
                // And initiate timer for long-click detection
                const timeoutID = config.userControls.longClickDelay < 0 || onEvent == null ? -1 : setTimeout(() => {
                    const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                        ...createEvent(grabbed, d.selection),
                        type: "pointer",
                        subType: "long-click",
                        clickCount: 0,
                        pointerEvent: event,
                        target: "viewport",
                        targetID: "",
                    }
                    onEvent(grapherEvent)
                }, config.userControls.longClickDelay)
                grabbed.type = "viewport"
                grabbed.clickCount = (lastClicked.type === "viewport" && lastClicked.time + config.userControls.multiClickDelay > Date.now())
                    ? lastClicked.times + 1
                    : 1
                grabbed.hasMoved = false
                grabbed.startX = event.clientX
                grabbed.startY = event.clientY
                grabbed.timeoutID = timeoutID
                updateGrabbed()
            }
        }

        function onViewportPointerUp(event: PointerEvent) {
            if (onEvent != null) {
                const grapherEvent: GrapherPointerEvent = {
                    ...createEvent(grabbed, d.selection),
                    type: "pointer",
                    subType: "up",
                    clickCount: 0,
                    pointerEvent: event,
                    target: "viewport",
                    targetID: "",
                }
                onEvent(grapherEvent)
            }

            if (grabbed.type === "viewport" && !grabbed.hasMoved) {
                // Remember that the viewport was clicked
                lastClicked.type = "viewport"
                lastClicked.times = grabbed.clickCount
                lastClicked.time = Date.now()
                // Send event
                let prevented = false
                if (onEvent != null) {
                    const clickEvent: GrapherPointerEvent & GrapherEventImpl = {
                        ...createEvent(grabbed, d.selection),
                        type: "pointer",
                        subType: "click",
                        clickCount: grabbed.clickCount,
                        pointerEvent: event,
                        target: "viewport",
                        targetID: "",
                    }
                    onEvent(clickEvent)
                    prevented = clickEvent.prevented
                }
                if (!prevented) d.selection.deselectAll()
            }
        }

        function onViewportWheel(event: WheelEvent) {
            let prevented = false
            if (onEvent != null) {
                const wheelEvent: GrapherWheelEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, d.selection),
                    type: "wheel",
                    wheelEvent: event,
                }
                onEvent(wheelEvent)
                prevented = wheelEvent.prevented
            }
            if (!prevented && config.viewportControls.allowZooming) changeZoom(-event.deltaY / 1000, d.controller, config)
        }

        function onViewportKeyDown(event: KeyboardEvent) {
            // Send graph event
            let prevented = false
            if (onEvent != null) {
                const keyEvent: GrapherKeyEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, d.selection),
                    type: "key",
                    keyboardEvent: event,
                }
                onEvent(keyEvent)
                prevented = keyEvent.prevented
            }
            // Deselect everything and un-grab if anything is grabbed
            if (!prevented && event.code === "Escape") {
                d.selection.deselectAll()
                if (grabbed.type != null) {
                    grabbed.type = null
                    updateGrabbed()
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
                + Math.abs(event.clientY - grabbed.startY) ** 2 < config.userControls.minimumPointerMovement ** 2) return
            if (grabbed.type === "viewport") {
                // User is moving the viewport (panning the graph)
                if (!config.viewportControls.allowPanning) return
                // Send event
                let prevented = false
                if (onEvent != null) {
                    const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                        ...createEvent(grabbed, d.selection),
                        type: "pointer",
                        subType: "move",
                        clickCount: 0,
                        pointerEvent: event,
                        target: "viewport",
                        targetID: "",
                    }
                    onEvent(grapherEvent)
                    prevented = grapherEvent.prevented
                }
                if (prevented) return
                grabbed.hasMoved = true
                // Calculate how the viewport should be moved
                const deltaX = event.movementX / d.controller.getViewport().zoom
                const deltaY = event.movementY / d.controller.getViewport().zoom
                const viewport = d.controller.getViewport()
                d.controller.setViewport({
                    zoom: viewport.zoom,
                    centerX: viewport.centerX - deltaX,
                    centerY: viewport.centerY - deltaY,
                })
            } else if (grabbed.type === "node") {
                // User is currently moving a node
                const node = d.nodes.get(grabbed.id)
                if (node == null) {
                    errorUnknownNode(grabbed.id)
                    return
                }
                if (node.allowMoving === false || (node.allowMoving === undefined && config.nodeDefaults.allowMoving === false)) return
                // Send event
                let prevented = false
                if (onEvent != null) {
                    const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                        ...createEvent(grabbed, d.selection),
                        type: "pointer",
                        subType: "move",
                        clickCount: 0,
                        pointerEvent: event,
                        target: "node",
                        targetID: grabbed.id,
                    }
                    onEvent(grapherEvent)
                    prevented = grapherEvent.prevented
                }
                if (prevented) return
                grabbed.hasMoved = true
                // Calculate where the node should arrive
                const deltaX = event.movementX / d.controller.getViewport().zoom, deltaY = event.movementY / d.controller.getViewport().zoom
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
                    for (const s of d.selection.getNodesSelection()) {
                        if (s === node.id) continue // grabbed node is already added
                        const n = d.nodes.get(s)
                        if (n == null) {
                            errorUnknownNode(s)
                            continue
                        }
                        changes.push({
                            type: "node-move",
                            event: "selected",
                            oldPosition: n.position,
                            position: new DOMPoint(n.position.x + deltaX, n.position.y + deltaY),
                            selected: n.selected,
                            node: n,
                        })
                    }
                } else d.selection.setNodesSelection([])
                d.selection.setEdgesSelection([])

                sendChanges(changes, d.nodes, d.edges, onChange)
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
            if (onEvent != null) {
                const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, d.selection),
                    type: "pointer",
                    subType: "up",
                    clickCount: 0,
                    pointerEvent: event,
                    target: grabbed.type,
                    targetID: grabbed.id,
                }
                onEvent(grapherEvent)
                prevented = grapherEvent.prevented
            }
            if (!prevented) {
                grabbed.type = null
                updateGrabbed()
            }
        }

        // Viewport-level listeners
        const viewportElem = ref.current.querySelector<HTMLElement>("." + VIEWPORT_CLASS)
        if (viewportElem == null) criticalNoViewport()
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
    }, [onEvent, onChange, config, d, grabbed, updateGrabbed, lastClicked, props.static])

    // TODO Remove invalid edges

    // Fit view
    useEffect(() => {
        if (props.fitView === "always") fitView(config.fitViewConfig, config, controller, bounds, ref.current!)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, edges])

    const needFitView = useRef(props.fitView === "initial" ? -1 : 0)
    useEffect(() => {
        if (controller.fitViewValue != needFitView.current) {
            fitView(config.fitViewConfig, config, controller, bounds, ref.current!)
            needFitView.current = controller.fitViewValue
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [controller])

    // Fit view on resize
    useEffect(() => {
        if (props.fitViewOnResize && ref.current != null) {
            let firstObserve = true
            const observer = new ResizeObserver(() => {
                if (firstObserve) firstObserve = false
                else controller.fitView()
            })
            observer.observe(ref.current)
            return () => observer.disconnect()
        }
    }, [props.fitViewOnResize, controller])

    const contextValue: GrapherContextValue = useMemo(() => ({
        id,
        static: props.static,
        nodeZIndex: config.nodesOverEdges ? Z_INDEX_EDGES : Z_INDEX_NODE,
        rerenderEdges: updateEdges,
        recalculateBounds,
        onResizeStart: () => {
            if (grabbed.type == null) grabbed.type = "resizing"
        },
        // Null because it's set below
        getNode: null as any,
        getEdge: null as any,
    }), [id, props.static, config.nodesOverEdges, updateEdges, recalculateBounds, grabbed])
    // This is not put in the useMemo above because nodes/edges objects changing should not trigger a context value change & subsequent re-renders
    // As the result of the function itself does not change
    contextValue.getNode = nodes.internalMap.get.bind(nodes.internalMap)
    contextValue.getEdge = edges.internalMap.get.bind(edges.internalMap)

    return <BoundsContext.Provider value={bounds}><GrapherContext.Provider value={contextValue}><CallbacksContext.Provider value={objectCallbacks}>
        <GraphDiv id={id} ref={ref} width={props.width} height={props.height} className={REACT_GRAPHER_CLASS}>
            <GrapherViewport controller={controller}>
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
    </CallbacksContext.Provider></GrapherContext.Provider></BoundsContext.Provider>
}

// Utility functions

// Extract DOM ID, type (node/edge) and internal ID from event target
function processDomElement<N, E>(element: EventTarget | null, nodes: Nodes<N>, edges: Edges<E>, id: string)
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
    } else {
        type = "edge"
        obj = edges.get(objID)
    }
    if (obj == null) {
        errorUnknownDomID(element, `${domID} -> ${type} ${objID}`)
        return null
    }
    return {domID, type, objID, obj}
}

// Send a change to the graph
function sendChanges(changes: GrapherChange[], nodes: Nodes<any>, edges: Edges<any>, onChange?: (change: GrapherChange[]) => GrapherChange[] | undefined | void) {
    let c: GrapherChange[] | undefined | void = changes
    if (onChange != null) c = onChange(changes)
    if (c != null) {
        nodes.processChanges(c)
        edges.processChanges(c)
    }
}

// Zoom the viewport
function changeZoom(amount: number, controller: Controller, config: GrapherConfigSet) {
    const viewport = controller.getViewport()
    const zoom = viewport.zoom * (1 + amount)
    controller.updateViewport({
        zoom: Math.min(Math.max(zoom, config.viewportControls.minZoom), config.viewportControls.maxZoom)
    })
}

// Fit the viewport
function fitView(fitConfig: GrapherFitViewConfigSet, config: GrapherConfigSet, controller: Controller, boundingRect: DOMRect, element: HTMLElement) {
    if (element == null || boundingRect == null || (boundingRect.width === 0 && boundingRect.height === 0)) return
    const w = element.offsetWidth, h = element.offsetHeight

    // Calculate zoom value for paddings
    const rect = new DOMRect(boundingRect.x, boundingRect.y, boundingRect.width, boundingRect.height)
    let zoom = Math.min(w / rect.width, h / rect.height)
    if (fitConfig.abideMinMaxZoom) zoom = Math.min(Math.max(zoom, config.viewportControls.minZoom), config.viewportControls.maxZoom)

    // Apply padding
    element.style.padding = parseCssStringOrNumber(fitConfig.padding)
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
    if (fitConfig.abideMinMaxZoom) zoom = Math.min(Math.max(zoom, config.viewportControls.minZoom), config.viewportControls.maxZoom)

    // Update viewport
    controller.setViewport({
        centerX: (rect.left + rect.right) / 2, centerY: (rect.top + rect.bottom) / 2, zoom
    })
}