import React, {useEffect, useMemo, useRef, useState} from "react";
import {applyNodeDefaults, Node, NodeData, NodeImpl, Nodes, NodesImpl} from "../data/Node"
import {applyEdgeDefaults, Edge, EdgeData, Edges, EdgesImpl} from "../data/Edge";
import styled from "@emotion/styled";
import {useController} from "../hooks/useController";
import {useGraphState} from "../hooks/useGraphState";
import {GrapherViewport} from "./GrapherViewport";
import {Controller, ControllerImpl} from "../data/Controller";
import {
    EDGE_LABEL_BACKGROUND_CLASS,
    EDGE_LABEL_CLASS,
    EDGE_PATH_CLASS,
    EDGES_CLASS,
    MARKER_ARROW_CLASS,
    MARKER_ARROW_FILLED_CLASS,
    MARKER_ARROW_FILLED_ID,
    MARKER_ARROW_ID,
    MULTI_CLICK_TIME,
    NODES_CLASS,
    REACT_GRAPHER_CLASS,
    VIEWPORT_CLASS,
    Z_INDEX_EDGES,
    Z_INDEX_NODE
} from "../util/constants";
import {GrapherConfig, GrapherConfigSet, GrapherFitViewConfigSet, withDefaultsConfig} from "../data/GrapherConfig";
import {GrapherChange} from "../data/GrapherChange";
import {checkInvalidID, criticalNoViewport, errorQueryFailed, errorUnknownDomID, errorUnknownNode, warnInvalidEdgeLabelPos, warnNoReactGrapherID} from "../util/log";
import {BoundsContext} from "../context/BoundsContext";
import {GrapherContext, GrapherContextValue} from "../context/GrapherContext";
import {SimpleEdge} from "./SimpleEdge";
import {getNodeIntersection} from "../util/EdgePath";
import {enlargeRect, resolveValue} from "../util/utils";
// This is used for documentation link
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Marker} from "./Marker";
import {createEvent, GrapherEvent, GrapherEventImpl, GrapherKeyEvent, GrapherPointerEvent, GrapherWheelEvent} from "../data/GrapherEvent";

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
     *
     * Additionally, if not already set (if undefined), the following props will be set:
     * - fitView -> "always"
     * - fitViewOnResize -> true
     *
     * This is meant to be used when you want to display a graph (e.g. for a preview), but without any user interaction. By default, the view will be permanently fitted, but
     * if you manually set fitView/fitViewOnResize props, they will not be overridden, allowing you to manually call `controller.fitView()` when needed.
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

    // Ensure rules of hooks are always met - we never know when this component is uncontrolled one render and controlled the next render
    const {nodes: ownNodes, edges: ownEdges} = useGraphState((props as UncontrolledGraphProps<N, E>).defaultNodes, (props as UncontrolledGraphProps<N, E>).defaultEdges)
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
    nodes.multipleSelection = edges.multipleSelection = config.userControls.multipleSelection

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
        type: "node" | "edge" | "viewport" | null
        id: string
        // These properties don't cause a state update
        clickCount: number
        startX: number
        startY: number
        hasMoved: boolean
    }

    // Information on what was last clicked and when (to detect multi-clicks)
    interface LastClicked {
        type: "node" | "edge" | "viewport" | null
        id: string
        times: number
        time: number
    }

    const [grabbed, setGrabbed] = useState<GrabbedNode>({type: null, id: "", clickCount: 0, startX: 0, startY: 0, hasMoved: false})
    const lastClicked = useMemo<LastClicked>(() => ({type: null, id: "", times: 0, time: 0}), [])

    // Create components from Nodes array
    const nodeElements = useMemo(() => nodes.map(node => {
        applyNodeDefaults(node, config.nodeDefaults)
        let parent: Node<any> | null = null
        if (node.parent != null) {
            const p = nodes.get(node.parent)
            if (p == null) errorUnknownNode(node.parent)
            else parent = p
        }
        const Component = node.Component
        return <Component key={node.id} id={node.id} data={node.data} classes={node.classes} absolutePosition={nodes.absolute(node)} edgeMargin={node.edgeMargin}
                          grabbed={grabbed.type === "node" && grabbed.id === node.id} selected={node.selected} parent={parent} position={node.position}/>
    }), [nodes, grabbed, config.nodeDefaults])

    // Same for edges
    const [updateEdges, setUpdateEdges] = useState(0)
    const edgeElements = useMemo(() => {
        // 2 reasons for this 'if': 1. don't need edges first render (nodes don't have values calculated)
        // and 2. ES lint will complain about useMemo dependencies otherwise
        if (updateEdges == 0) return []
        return edges.map(edge => {
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
            if (source.element == null || target.element == null) return
            const Component = edge.Component ?? SimpleEdge
            // TODO Implement handles
            const sourcePos = edge.sourceHandle == null ? getNodeIntersection(source, target) : source.position
            const targetPos = edge.targetHandle == null ? getNodeIntersection(target, source) : target.position
            return <Component key={edge.id} id={edge.id} data={edge.data} classes={edge.classes} label={edge.label} labelPosition={edge.labelPosition}
                              source={source} sourcePos={sourcePos} sourceHandle={edge.sourceHandle} markerStart={edge.markerStart}
                              target={target} targetPos={targetPos} targetHandle={edge.targetHandle} markerEnd={edge.markerEnd}
                              selected={edge.selected} grabbed={grabbed.type === "edge" && grabbed.id === edge.id}/>
        })
    }, [updateEdges, edges, config.edgeDefaults, nodes, grabbed])

    // Ref to the ReactGrapher root div
    const ref = useRef<HTMLDivElement>(null)

    // On effect, create edges, update node dimensions and setup listeners
    const [bounds, setBounds] = useState(new DOMRect())
    const onEvent = props.onEvent
    const onChange = props.onChange
    // TODO Split into 2 effects - one that sets listeners, one that does everything else
    // To prevent listeners being added/removed every frame on node movement, maybe?
    useEffect(() => {
        if (ref.current == null) return
        // Listener functions

        // Node & Edge level
        function onObjectPointerDown(event: PointerEvent) {
            const r = processDomElement(event.currentTarget, nodes, edges, id)
            if (r == null) return
            let prevented = false
            if (onEvent != null) {
                const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, nodes, edges),
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
            if (!prevented && grabbed.type == null) setGrabbed({
                type: r.type,
                id: r.objID,
                clickCount: (lastClicked.type === r.type && lastClicked.id === r.objID && lastClicked.time + MULTI_CLICK_TIME > Date.now()) ? lastClicked.times + 1 : 1,
                hasMoved: false,
                startX: event.clientX,
                startY: event.clientY,
            })
        }

        function onObjectPointerUp(event: PointerEvent) {
            const r = processDomElement(event.currentTarget, nodes, edges, id)
            if (r == null) return
            if (onEvent != null) {
                const upEvent: GrapherPointerEvent = {
                    ...createEvent(grabbed, nodes, edges),
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
                        ...createEvent(grabbed, nodes, edges),
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
                    if (r.type === "node") {
                        nodes.setSelected(r.objID, event.shiftKey ? !r.obj.selected : true, !event.shiftKey)
                        if (!event.shiftKey || !config.userControls.multipleSelection) edges.setSelection([])
                    } else {
                        edges.setSelected(r.objID, event.shiftKey ? !r.obj.selected : true, !event.shiftKey)
                        if (!event.shiftKey || !config.userControls.multipleSelection) nodes.setSelection([])
                    }
                }
            }
        }

        // Viewport level
        function onViewportPointerDown(event: PointerEvent) {
            let prevented = false
            if (onEvent != null) {
                const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, nodes, edges),
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
            if (!prevented && grabbed.type == null) setGrabbed({
                type: "viewport",
                id: "",
                clickCount: (lastClicked.type === "viewport" && lastClicked.time + MULTI_CLICK_TIME > Date.now()) ? lastClicked.times + 1 : 1,
                hasMoved: false,
                startX: event.clientX,
                startY: event.clientY,
            })
        }

        function onViewportPointerUp(event: PointerEvent) {
            if (onEvent != null) {
                const grapherEvent: GrapherPointerEvent = {
                    ...createEvent(grabbed, nodes, edges),
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
                        ...createEvent(grabbed, nodes, edges),
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
                // Deselect all objects
                if (!prevented) {
                    nodes.setSelection([])
                    edges.setSelection([])
                }
            }
        }

        function onViewportWheel(event: WheelEvent) {
            let prevented = false
            if (onEvent != null) {
                const wheelEvent: GrapherWheelEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, nodes, edges),
                    type: "wheel",
                    wheelEvent: event,
                }
                onEvent(wheelEvent)
                prevented = wheelEvent.prevented
            }
            if (!prevented && config.viewportControls.allowZooming) changeZoom(-event.deltaY / 1000, controller, config)
        }

        function onViewportKeyDown(event: KeyboardEvent) {
            // Send graph event
            let prevented = false
            if (onEvent != null) {
                const keyEvent: GrapherKeyEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, nodes, edges),
                    type: "key",
                    keyboardEvent: event,
                }
                onEvent(keyEvent)
                prevented = keyEvent.prevented
            }
            // On escape press, deselect all
            if (!prevented && event.code === "Escape") {
                nodes.setSelection([])
                edges.setSelection([])
            }
        }

        // Document level
        function onPointerMove(event: PointerEvent) {
            // Allow small movement (5px) without beginning the move
            if (grabbed.type != null && !grabbed.hasMoved
                && Math.abs(event.clientX - grabbed.startX) ** 2 + Math.abs(event.clientY - grabbed.startY) ** 2 < 25) return
            if (grabbed.type === "viewport") {
                // User is moving the viewport (panning the graph)
                if (!config.viewportControls.allowPanning) return
                // Send event
                let prevented = false
                if (onEvent != null) {
                    const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                        ...createEvent(grabbed, nodes, edges),
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
                const deltaX = event.movementX / controller.getViewport().zoom
                const deltaY = event.movementY / controller.getViewport().zoom
                const viewport = controller.getViewport()
                controller.setViewport({
                    zoom: viewport.zoom,
                    centerX: viewport.centerX - deltaX,
                    centerY: viewport.centerY - deltaY,
                })
            } else if (grabbed.type === "node") {
                // User is currently moving a node
                const node = nodes.get(grabbed.id)
                if (node == null) {
                    errorUnknownNode(grabbed.id)
                    return
                }
                if (node.allowMoving === false || (node.allowMoving === undefined && config.nodeDefaults.allowMoving === false)) return
                // Send event
                let prevented = false
                if (onEvent != null) {
                    const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                        ...createEvent(grabbed, nodes, edges),
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
                const deltaX = event.movementX / controller.getViewport().zoom, deltaY = event.movementY / controller.getViewport().zoom
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
                    for (const s of nodes.selection) {
                        if (s === node.id) continue // grabbed node is already added
                        const n = nodes.get(s)
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
                } else nodes.setSelection([])
                edges.setSelection([])

                sendChanges(changes, nodes, edges, onChange)
            }
        }

        function onPointerUp(event: PointerEvent) {
            if (grabbed.type == null) return
            let prevented = false;
            if (onEvent != null) {
                const grapherEvent: GrapherPointerEvent & GrapherEventImpl = {
                    ...createEvent(grabbed, nodes, edges),
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
            if (!prevented) setGrabbed({
                type: null, id: "", clickCount: 0, startX: 0, startY: 0, hasMoved: false,
            })
        }

        // Calculate bounding rect

        // Prevent forcing 0, 0 point to be included in the rect
        const nodesRect = nodes.length > 0 ? new DOMRect(
            nodes[0].position.x, nodes[0].position.y, 0, 0
        ) : new DOMRect()
        const edgesRect = new DOMRect(nodesRect.x, nodesRect.y, 0, 0)

        let nodesChanged = false
        for (const node of nodes) {
            const nodeElem = ref.current.querySelector<HTMLElement>(`#${id}n-${node.id}`)
            if (nodeElem == null) {
                errorUnknownNode(node.id)
                continue
            }
            node.element = nodeElem
            if (Math.abs(node.width - nodeElem.offsetWidth) > 5) {
                node.width = nodeElem.offsetWidth
                nodesChanged = true
            }
            if (Math.abs(node.height - nodeElem.offsetHeight) > 5) {
                node.height = nodeElem.offsetHeight
                nodesChanged = true
            }

            /* Update bounding rect
            'right' needs to be x + width and not x + width/2 because nodes use translateX(-50%) to center themselves. This means, although its true 'right'
            is indeed x + width/2, its layout 'right' does not take transforms into account. And, if the node's layout right is out of bounds, text inside the node
            will start wrapping, and we don't want that! Same thing for 'bottom' - it needs to be y + height, not y + height/2. */
            enlargeRect(nodesRect, {x: node.position.x - node.width / 2, y: node.position.y - node.height / 2, width: node.width * 1.5, height: node.height * 1.5})

            // Set listeners
            if (!props.static) {
                nodeElem.addEventListener("pointerdown", onObjectPointerDown)
                nodeElem.addEventListener("pointerup", onObjectPointerUp)
            }
        }
        nodes.boundingRect = nodesRect
        // Re-render edges when nodes change in size
        if (nodesChanged) setUpdateEdges(value => value + 1)

        // Same for edges
        for (const edge of edges) {
            const edgeElem = ref.current.querySelector<SVGGElement>(`#${id}e-${edge.id}`)
            if (edgeElem == null) {
                // Edges are not rendered initially (as we need nodes' width, height, border radius...)
                // So this is not an error usually
                //errorUnknownEdge(edge.id)
                continue
            }
            edge.element = edgeElem

            // TODO Optimise getBBox calls to happen less often (not on every render)
            // Update bounding rect
            enlargeRect(edgesRect, edgeElem.getBBox())

            // Set listeners
            // TODO Instead of the entire edge being clickable, make only the tips clickable
            if (!props.static) {
                edgeElem.addEventListener("pointerdown", onObjectPointerDown)
                edgeElem.addEventListener("pointerup", onObjectPointerUp)
            }

            // Set position of label
            const labelElem = edgeElem.querySelector<SVGGraphicsElement>("." + EDGE_LABEL_CLASS)
            const labelBg = edgeElem.querySelector<SVGGraphicsElement>("." + EDGE_LABEL_BACKGROUND_CLASS)
            if (labelElem == null || labelBg == null) continue
            if ("labelPos" in labelElem.dataset) {
                const labelPos = Number(labelElem.dataset.labelPos)
                if (labelPos < 0 || labelPos > 1) warnInvalidEdgeLabelPos(edge.id, labelElem.dataset.labelPos)
                else {
                    const pathElem = edgeElem.querySelector<SVGGeometryElement>("." + EDGE_PATH_CLASS)
                    if (pathElem == null) errorQueryFailed(`#${id}e-${edge.id} .${EDGE_PATH_CLASS}`, `SVG path element of edge ${edge.id}`)
                    else {
                        const pos = pathElem.getPointAtLength(labelPos * pathElem.getTotalLength())
                        labelElem.setAttribute("x", String(pos.x))
                        labelElem.setAttribute("y", String(pos.y))
                    }
                }
            }

            // Set size of label background
            const labelBounds = labelElem.getBBox()
            enlargeRect(edgesRect, labelBounds) // Also make sure to include label in bounds calculation
            // TODO Customisable padding (global and per edge)
            labelBg.setAttribute("x", String(labelBounds.x - 2))
            labelBg.setAttribute("y", String(labelBounds.y - 2))
            labelBg.setAttribute("width", String(labelBounds.width + 4))
            labelBg.setAttribute("height", String(labelBounds.height + 4))
        }
        edges.boundingRect = edgesRect

        // Calculate the bigger rect and add some padding
        const finalX = Math.min(nodesRect.x, edgesRect.x), finalY = Math.min(nodesRect.y, edgesRect.y)
        const finalRect = new DOMRect(
            finalX - 200,
            finalY - 200,
            Math.max(nodesRect.right, nodesRect.right) - finalX + 400,
            Math.max(nodesRect.bottom, nodesRect.bottom) - finalY + 400,
        )
        // Update bounds state if bounds changed too much
        if (Math.abs(finalRect.left - bounds.left) > 100 || Math.abs(finalRect.top - bounds.top) > 100
            || Math.abs(finalRect.right - bounds.right) > 100 || Math.abs(finalRect.bottom - bounds.bottom) > 100)
            setBounds(finalRect)

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
            // Remove node listeners
            for (const node of nodes) {
                if (node.element == null) continue
                node.element.removeEventListener("pointerdown", onObjectPointerDown)
                node.element.removeEventListener("pointerup", onObjectPointerUp)
            }
            // Remove edge listeners
            for (const edge of edges) {
                if (edge.element == null) continue
                edge.element.removeEventListener("pointerdown", onObjectPointerDown)
                edge.element.removeEventListener("pointerup", onObjectPointerUp)
            }
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
    }, [nodes, edges, onEvent, onChange, controller, config, grabbed, lastClicked, id, setUpdateEdges, bounds, props.static])

    // Fit view
    useEffect(() => {
        if (props.fitView === "always") fitView(config.fitViewConfig, config, controller, nodes.boundingRect!, ref.current!)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, edges])

    const needFitView = useRef(props.fitView === "initial" ? -1 : 0)
    useEffect(() => {
        if (controller.fitViewValue != needFitView.current) {
            fitView(config.fitViewConfig, config, controller, nodes.boundingRect!, ref.current!)
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
                else {
                    console.log("Fitting view")
                    controller.fitView()
                }
            })
            observer.observe(ref.current)
            return () => observer.disconnect()
        }
    }, [props.fitViewOnResize, controller])

    const contextValue: GrapherContextValue = useMemo(() => ({id, nodeZIndex: config.nodesOverEdges ? Z_INDEX_EDGES : Z_INDEX_NODE}), [id, config.nodesOverEdges])
    return <BoundsContext.Provider value={bounds}><GrapherContext.Provider value={contextValue}>
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
    </GrapherContext.Provider></BoundsContext.Provider>
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
    element.style.padding = fitConfig.padding
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