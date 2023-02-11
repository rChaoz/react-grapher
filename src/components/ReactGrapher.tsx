import React, {useEffect, useMemo, useRef, useState} from "react";
import {NodeData, NodeImpl, Nodes, NodesImpl} from "../data/Node"
import {EdgeData, Edges, EdgesImpl} from "../data/Edge";
import styled from "@emotion/styled";
import {useController} from "../hooks/useController";
import {useGraphState} from "../hooks/useGraphState";
import {DefaultNode} from "./DefaultNode";
import {GrapherViewport} from "./GrapherViewport";
import {Controller, ControllerImpl} from "../data/Controller";
import {REACT_GRAPHER_CLASS, VIEWPORT_CLASS, Z_INDEX_EDGES, Z_INDEX_NODES} from "../util/constants";
import {GrapherConfig, GrapherConfigSet, GrapherFitViewConfigSet, withDefaultsConfig} from "../data/GrapherConfig";
import {GrapherChange} from "../data/GrapherChange";
import {GrapherEvent, KeyEvent, NodePointerEvent, UpEvent, ViewportPointerEvent, ViewportWheelEvent} from "../data/GrapherEvent";
import {criticalNoViewport, errorDOMNodeUnknownID, errorUnknownNode, warnNoReactGrapherID} from "../util/log";
import BoundsContext from "../context/BoundsContext";
import IDContext from "../context/IDContext";
import {DefaultEdge} from "./DefaultEdge";
import {getNodeIntersection} from "../util/EdgePath";
import {resolveValue} from "../util/utils";

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
     * Fine configuration for the Graph
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
    fitViewOnResize?: boolean, // TODO
    /**
     * Listen to events such as nodes being clicked, selected
     */
    onEvent?: (event: GrapherEvent) => GrapherChange[] | undefined | void
    /**
     * Called whenever the graph would suffer changes, such as nodes being moved or deleted. You can modify the changes before they are committed
     * or cancel them entirely.
     */
    onChange?: (changes: GrapherChange[]) => GrapherChange[] | undefined | void
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
  z-index: ${props => props.nodesOverEdges ? Z_INDEX_NODES : Z_INDEX_EDGES};
`

const Nodes = styled.div<Pick<GrapherConfigSet, "nodesOverEdges">>`
  position: absolute;
  inset: 0;
  z-index: ${props => props.nodesOverEdges ? Z_INDEX_EDGES : Z_INDEX_NODES};
`

export function ReactGrapher<N, E>(props: ControlledGraphProps<N, E> | UncontrolledGraphProps<N, E>) {
    // Get default config and prevent config object from being created every re-render
    const config = useMemo(() => withDefaultsConfig(props.config), [props.config])

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
    nodes.multipleSelection = config.userControls.multipleSelection

    let id: string
    if (props.id != null) id = props.id
    else {
        // Check react version before using useID - react 18 introduced it, but peerDependencies specifies a lower version
        const useID = React.useId
        // eslint-disable-next-line react-hooks/rules-of-hooks
        if (typeof useID === "function") id = useID().replace(/:/g, "-") // replace ':' with '-' as ':' is not a valid CSS selector character
        else {
            id = "react-grapher"
            warnNoReactGrapherID()
        }
    }

    // Currently grabbed (being moved) node
    interface GrabbedNode {
        id: string | null
        // These properties don't cause a state update:
        startX: number
        startY: number
        hasMoved: boolean
    }

    const [grabbed, setGrabbed] = useState<GrabbedNode>({id: null, startX: 0, startY: 0, hasMoved: false})

    // Create components from Nodes array
    const nodeElements = useMemo(() => nodes.map(node => {
        const Component = node.Component ?? DefaultNode
        return <Component key={node.id} id={node.id} data={node.data} absolutePosition={nodes.absolute(node)}
                          grabbed={grabbed.id === node.id} classes={node.classes} selected={node.selected}/>
    }), [nodes, grabbed])

    // Same for edges
    const [updateEdges, setUpdateEdges] = useState(0)
    const edgeElements = useMemo(() => {
        // 2 reasons for this 'if': 1. don't need edges first render (nodes don't have values calculated)
        // and 2. ES lint will complain about useMemo dependencies otherwise
        if (updateEdges == 0) return []
        return edges.map(edge => {
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
            const Component = edge.Component ?? DefaultEdge
            // TODO Implement handles
            const sourcePos = edge.sourceHandle == null ? getNodeIntersection(source, target) : source.position
            const targetPos = edge.targetHandle == null ? getNodeIntersection(target, source) : target.position
            return <Component key={edge.id} id={edge.id} source={source} target={target} sourcePos={sourcePos} targetPos={targetPos} classes={edge.classes}/>
        })
    }, [edges, nodes, updateEdges])

    // Ref to the ReactGrapher root div
    const ref = useRef<HTMLDivElement>(null)

    // On effect, create edges, update node dimensions and setup listeners
    const [bounds, setBounds] = useState(new DOMRect())
    const onEvent = props.onEvent
    const onChange = props.onChange
    useEffect(() => {
        if (ref.current == null) return
        // Listener functions

        // Node level
        function onNodePointerDown(event: PointerEvent) {
            const nodeID = (event.currentTarget as HTMLElement | null)?.id?.substring(id.length + 2)
            const node = nodeID != null ? nodes.get(nodeID) : null
            if (node == null) {
                errorDOMNodeUnknownID(event.currentTarget, nodeID)
                return
            }
            let prevent = false
            if (onEvent != null) {
                const grapherEvent: NodePointerEvent = {
                    type: "node",
                    action: "down",
                    grabbed: false,
                    preventDefault() {
                        prevent = true
                    },
                    target: node,
                    pointerEvent: event,
                }
                onEvent(grapherEvent)
            }
            // "Grab" the node
            if (!prevent && grabbed.id == null) setGrabbed({
                id: nodeID!,
                hasMoved: false,
                startX: event.clientX,
                startY: event.clientY,
            })
        }

        function onNodePointerUp(event: PointerEvent) {
            const nodeID = (event.currentTarget as HTMLElement | null)?.id?.substring(id.length + 2)
            const node = nodeID ? nodes.get(nodeID) : null
            if (node == null) {
                errorDOMNodeUnknownID(event.currentTarget, nodeID)
                return
            }
            if (onEvent != null) {
                const upEvent: NodePointerEvent = {
                    type: "node",
                    action: "up",
                    grabbed: grabbed.id === nodeID,
                    preventDefault() { //empty
                    },
                    target: node,
                    pointerEvent: event,
                }
                onEvent(upEvent)
            }

            if (grabbed.id === nodeID && !grabbed.hasMoved) {
                let prevent = false
                if (onEvent != null) {
                    const clickEvent: NodePointerEvent = {
                        type: "node",
                        action: "click",
                        grabbed: true,
                        preventDefault() { //empty
                            prevent = true;
                        },
                        target: node,
                        pointerEvent: event,
                    }
                    onEvent(clickEvent)
                }
                // Select the node
                if (!prevent) nodes.setSelected(node.id, true, !event.shiftKey)
            }
        }

        // Viewport level
        function onViewportPointerDown(event: PointerEvent) {
            let prevent = false
            if (onEvent != null) {
                const grapherEvent: ViewportPointerEvent = {
                    type: "viewport",
                    action: "down",
                    grabbed: false,
                    preventDefault() {
                        prevent = true
                    },
                    pointerEvent: event,
                }
                onEvent(grapherEvent)
            }
            if (!prevent && grabbed.id == null) setGrabbed({
                id: "",
                hasMoved: false,
                startX: event.clientX,
                startY: event.clientY,
            })
        }

        function onViewportPointerUp(event: PointerEvent) {
            if (onEvent != null) {
                const grapherEvent: ViewportPointerEvent = {
                    type: "viewport",
                    action: "up",
                    grabbed: grabbed.id === "",
                    preventDefault() { //empty
                    },
                    pointerEvent: event,
                }
                onEvent(grapherEvent)
            }

            if (grabbed.id === "" && !grabbed.hasMoved) {
                let prevent = false
                if (onEvent != null) {
                    const clickEvent: ViewportPointerEvent = {
                        type: "viewport",
                        action: "click",
                        grabbed: true,
                        preventDefault() { //empty
                            prevent = true;
                        },
                        pointerEvent: event,
                    }
                    onEvent(clickEvent)
                }
                // Unselect all nodes
                if (!prevent) nodes.setSelection([])
            }
        }

        function onViewportWheel(event: WheelEvent) {
            let prevent = false
            if (onEvent != null) {
                const grapherEvent: ViewportWheelEvent = {
                    type: "viewport",
                    action: "wheel",
                    grabbed: grabbed.id === "",
                    preventDefault() {
                        prevent = true
                    },
                    wheelEvent: event,
                }
                onEvent(grapherEvent)
            }
            if (!prevent && config.viewportControls.allowZooming) changeZoom(-event.deltaY / 1000, controller, config)
        }

        // Document level
        function onPointerMove(event: PointerEvent) {
            // Allow small movement (5px) without beginning the move
            if (grabbed.id != null && !grabbed.hasMoved
                && Math.abs(event.clientX - grabbed.startX) ** 2 + Math.abs(event.clientY - grabbed.startY) ** 2 < 25) return
            if (grabbed.id === "") {
                // User is moving the viewport (panning the graph)
                if (!config.viewportControls.allowPanning) return
                // Send event
                let prevent = false
                if (onEvent != null) {
                    const grapherEvent: ViewportPointerEvent = {
                        type: "viewport",
                        action: "move",
                        grabbed: true,
                        preventDefault() {
                            prevent = true
                        },
                        pointerEvent: event,
                    }
                    onEvent(grapherEvent)
                }
                if (prevent) return
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
            } else if (grabbed.id != null) {
                // User is currently moving a node
                const node = nodes.get(grabbed.id)
                if (node == null) {
                    errorUnknownNode(grabbed.id)
                    return
                }
                // TODO Each node should have it's own config to override global config
                if (!config.userControls.allowMovingNodes) return
                // Send event
                let prevent = false
                if (onEvent != null) {
                    const grapherEvent: NodePointerEvent = {
                        type: "node",
                        action: "move",
                        grabbed: true,
                        preventDefault() {
                            prevent = true
                        },
                        target: node,
                        pointerEvent: event,
                    }
                    onEvent(grapherEvent)
                }
                if (prevent) return
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

                sendChanges(changes, nodes, edges, onChange)
            }
        }

        function onPointerUp(event: PointerEvent) {
            let prevent = false;
            if (onEvent != null) {
                const grapherEvent: UpEvent = {
                    type: "up",
                    grabbed: grabbed.id,
                    preventDefault() {
                        prevent = true
                    },
                    pointerEvent: event,
                }
                onEvent(grapherEvent)
            }
            if (!prevent && grabbed.id != null) setGrabbed({
                id: null, startX: 0, startY: 0, hasMoved: false,
            })
        }

        function onKeyDown(event: KeyboardEvent) {
            // Send graph event
            let prevent = false
            if (onEvent != null) {
                const grapherEvent: KeyEvent = {
                    type: "key",
                    grabbed: grabbed.id,
                    preventDefault() {
                        prevent = true
                    },
                    keyboardEvent: event,
                }
                onEvent(grapherEvent)
            }
            if (prevent) return
            // On escape press, deselect all
            if (event.code === "Escape") nodes.setSelection([])
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
            const left = node.position.x - node.width! / 2, right = node.position.x + node.width!
            const top = node.position.y - node.height! / 2, bottom = node.position.y + node.height!
            if (left < nodesRect.left) {
                const delta = nodesRect.left - left
                nodesRect.x -= delta
                nodesRect.width += delta
            }
            if (top < nodesRect.top) {
                const delta = nodesRect.top - top
                nodesRect.y -= delta
                nodesRect.height += delta
            }
            if (right > nodesRect.right) nodesRect.width += right - nodesRect.right
            if (bottom > nodesRect.bottom) nodesRect.height += bottom - nodesRect.bottom

            // Set listeners
            nodeElem.addEventListener("pointerdown", onNodePointerDown)
            nodeElem.addEventListener("pointerup", onNodePointerUp)
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

            // Update bounding rect
            const r = edgeElem.getBBox() as Pick<DOMRect, "x" | "y" | "width" | "height">
            // We are not using r.left, r.top etc. because r is an SVGRect, not a DOMRect, like typescript suggests, and does not have these properties
            if (r.x < edgesRect.left) {
                const delta = edgesRect.left - r.x
                edgesRect.x -= delta
                edgesRect.width += delta
            }
            if (r.y < edgesRect.top) {
                const delta = edgesRect.top - r.y
                edgesRect.y -= delta
                edgesRect.height += delta
            }
            if (r.x + r.width > edgesRect.right) edgesRect.width += r.x + r.width - edgesRect.right
            if (r.y + r.height > edgesRect.bottom) edgesRect.height += r.y + r.height - edgesRect.bottom
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

        // TODO Edges

        // Viewport-level listeners
        const viewportElem = ref.current.querySelector<HTMLElement>("." + VIEWPORT_CLASS)
        if (viewportElem == null) criticalNoViewport()
        else {
            viewportElem.addEventListener("pointerdown", onViewportPointerDown)
            viewportElem.addEventListener("pointerup", onViewportPointerUp)
            viewportElem.addEventListener("wheel", onViewportWheel)
        }

        // Document-level listeners
        document.addEventListener("pointermove", onPointerMove)
        document.addEventListener("pointerup", onPointerUp)
        document.addEventListener("keydown", onKeyDown)

        // Cleanup
        return () => {
            // Remove node listeners
            for (const node of nodes) {
                if (node.element == null) continue
                node.element.removeEventListener("pointerdown", onNodePointerDown)
                node.element.removeEventListener("pointerup", onNodePointerUp)
            }
            // Remove viewport listeners
            if (viewportElem != null) {
                viewportElem.removeEventListener("pointerdown", onViewportPointerDown)
                viewportElem.removeEventListener("pointerup", onViewportPointerUp)
                viewportElem.removeEventListener("wheel", onViewportWheel)
            }
            // Remove document listeners
            document.removeEventListener("pointermove", onPointerMove)
            document.removeEventListener("pointerup", onPointerUp)
            document.removeEventListener("keydown", onKeyDown)
        }
    }, [nodes, edges, onEvent, onChange, controller, config, grabbed, id, setUpdateEdges, bounds])

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

    return <BoundsContext.Provider value={bounds}><IDContext.Provider value={id}>
        <GraphDiv id={id} ref={ref} width={props.width} height={props.height} className={REACT_GRAPHER_CLASS}>
            <GrapherViewport controller={controller}>
                <Nodes nodesOverEdges={config.nodesOverEdges}>
                    {nodeElements}
                </Nodes>
                <Edges nodesOverEdges={config.nodesOverEdges} viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}>
                    <defs>{/* TODO markers */}</ defs>
                    <g>{edgeElements}</g>
                </Edges>
            </GrapherViewport>
            {props.children}
        </GraphDiv>
    </IDContext.Provider></BoundsContext.Provider>
}

// Utility functions

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