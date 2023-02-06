import React, {useEffect, useMemo, useRef, useState} from "react";
import {Node, Nodes, Position} from "../data/Node"
import {Edge, Edges} from "../data/Edge";
import styled from "@emotion/styled";
import {useController} from "../hooks/useController";
import {useGraphState} from "../hooks/useGraphState";
import {DefaultNode} from "./DefaultNode";
import {GrapherViewport} from "./GrapherViewport";
import {Controller, ControllerImpl} from "../data/Controller";
import {REACT_GRAPHER_CLASS, VIEWPORT_CLASS, Z_INDEX_EDGES, Z_INDEX_NODES} from "../util/Constants";
import {GrapherConfig, GrapherConfigSet, GrapherFitViewConfigSet, withDefaultsConfig} from "../data/GrapherConfig";
import {GrapherChange} from "../data/GrapherChange";
import {GrapherEvent, KeyEvent, NodePointerEvent, UpEvent, ViewportPointerEvent, ViewportWheelEvent} from "../data/GrapherEvent";
import {domNodeID, noReactGrapherID, noViewport, unknownNode} from "../util/log";
import BoundsContext from "../context/BoundsContext";
import IDContext from "../context/IDContext";

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

export interface ControlledGraphProps<T> extends CommonGraphProps {
    nodes: Nodes<T>
    edges: Edges
}

export interface UncontrolledGraphProps<T> extends CommonGraphProps {
    defaultNodes?: Node<T>[]
    defaultEdges?: Edge[]
}

const GraphDiv = styled.div<Pick<CommonGraphProps, "width" | "height">>`
  width: ${props => props.width ?? "100%"};
  height: ${props => props.height ?? "100%"};
`

const Edges = styled.svg<{nodesOverEdges: boolean}>`
  position: absolute;
  inset: 0;
  z-index: ${props => props.nodesOverEdges ? Z_INDEX_NODES : Z_INDEX_EDGES};
`

const Nodes = styled.div<Pick<GrapherConfigSet, "nodesOverEdges">>`
  position: absolute;
  inset: 0;
  z-index: ${props => props.nodesOverEdges ? Z_INDEX_EDGES : Z_INDEX_NODES};
`

export function ReactGrapher<T>(props: ControlledGraphProps<T> | UncontrolledGraphProps<T>) {
    // Get default config and prevent config object from being created every re-render
    const config = useMemo(() => withDefaultsConfig(props.config), [props.config])

    let nodes: Nodes<T>
    let edges: Edges

    // Ensure rules of hooks are always met - we never know when this component is uncontrolled one render and controlled the next render
    const {nodes: ownNodes, edges: ownEdges} = useGraphState((props as UncontrolledGraphProps<T>).defaultNodes, (props as any).defaultEdges)
    const ownController = useController()
    const controller = props.controller ?? ownController

    // Controlled graphs use provided nodes & edges objects
    if ("nodes" in props) ({nodes, edges} = props)
    // Uncontrolled Graphs manage their own state
    else [nodes, edges] = [ownNodes, ownEdges]
    nodes.multipleSelection = config.userControls.multipleSelection

    const controllerImpl = controller as ControllerImpl
    
    let ownID
    // Check react version before using useID - react 18 introduced it, but peerDependencies specifies a lower version
    const useID = React.useId
    // eslint-disable-next-line react-hooks/rules-of-hooks
    if (typeof useID === "function") ownID = useID()
    else {
        ownID = "react-grapher"
        noReactGrapherID()
    }
    const id = props.id ?? ownID

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
        return <Component key={node.id} id={node.id} data={node.data} position={node.position} grabbed={grabbed.id === node.id} parentPosition={
            node.parent == null ? undefined : nodes.get(node.parent)?.position
        } classes={node.classes} selected={node.selected}/>
    }), [nodes, grabbed])

    // Same for edges
    const edgeElements = useMemo(() => edges.map(edge => {

        return <g key={edge.id}>

        </g>
    }), [edges])

    // Ref to the ReactGrapher root div
    const ref = useRef<HTMLDivElement>(null)

    // On effect, create edges, update node dimensions and setup listeners
    const onEvent = props.onEvent
    const onChange = props.onChange
    useEffect(() => {
        if (ref.current == null) return
        // Listener functions

        // Node level
        function onNodePointerDown(event: PointerEvent) {
            const nodeID = (event.currentTarget as HTMLElement | null)?.id?.substring(id.length + 1)
            const node = nodeID != null ? nodes.get(nodeID) : null
            if (node == null) {
                domNodeID(event.currentTarget, nodeID)
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
            const nodeID = (event.currentTarget as HTMLElement | null)?.id?.substring(id.length + 1)
            const node = nodeID ? nodes.get(nodeID) : null
            if (node == null) {
                domNodeID(event.currentTarget, nodeID)
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
                    unknownNode(grabbed.id)
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
                const newPosition: Position = {
                    isAbsolute: node.position.isAbsolute,
                    x: node.position.x + deltaX,
                    y: node.position.y + deltaY,
                }

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
                            unknownNode(s)
                            continue
                        }
                        changes.push({
                            type: "node-move",
                            event: "selected",
                            oldPosition: n.position,
                            position: {
                                isAbsolute: n.position.isAbsolute,
                                x: n.position.x + deltaX,
                                y: n.position.y + deltaY,
                            },
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

        for (const node of nodes) {
            const nodeElem = ref.current.querySelector<HTMLElement>(`#${id.replace(/:/g, "\\:")}-${node.id}`)
            if (nodeElem == null) continue
            node.element = nodeElem

            function resolveValues(strValue: string, width: number, height: number): [number, number] {
                /* Computed border radius may be of form:
                - 6px
                - 2px 5px
                - 20%
                - 10% 5%
                - <empty>
                 */
                const vals = strValue.split(" ")
                if (vals.length === 0) return [0, 0]
                else if (vals.length === 1) return [resolveValue(vals[0], width), resolveValue(vals[0], height)]
                else return [resolveValue(vals[0], width), resolveValue(vals[1], height)]
            }

            // Set node dimensions
            node.width = nodeElem.offsetWidth
            node.height = nodeElem.offsetHeight
            const style = getComputedStyle(nodeElem)
            node.borderRadius = [
                resolveValues(style.borderTopLeftRadius, node.width, node.height),
                resolveValues(style.borderTopRightRadius, node.width, node.height),
                resolveValues(style.borderBottomRightRadius, node.width, node.height),
                resolveValues(style.borderBottomLeftRadius, node.width, node.height),
            ]

            // Update bounding rect
            const left = node.position.x - node.width / 2, top = node.position.y - node.height / 2, right = left + node.width, bottom = top + node.height
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
            node.element.addEventListener("pointerdown", onNodePointerDown)
            node.element.addEventListener("pointerup", onNodePointerUp)
        }
        nodes.boundingRect = nodesRect
        // TODO Edges

        // Viewport-level listeners
        const viewportElem = ref.current.querySelector<HTMLElement>("." + VIEWPORT_CLASS)
        if (viewportElem == null) noViewport()
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
    }, [nodes, edges, onEvent, onChange, controller, config, grabbed, id])

    // Fit view
    useEffect(() => {
        if (props.fitView === "always") fitView(config.fitViewConfig, config, controller, nodes.boundingRect!, ref.current!)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes, edges])

    const needFitView = useRef(props.fitView === "initial" ? -1 : 0)
    useEffect(() => {
        if (controllerImpl.fitViewValue != needFitView.current) {
            fitView(config.fitViewConfig, config, controller, nodes.boundingRect!, ref.current!)
            needFitView.current = controllerImpl.fitViewValue
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [controllerImpl])

    const b = config.viewportBounds
    return <BoundsContext.Provider value={b}><IDContext.Provider value={id}>
        <GraphDiv ref={ref} width={props.width} height={props.height} className={REACT_GRAPHER_CLASS}>
            <GrapherViewport controller={controller}>
                <Edges nodesOverEdges={config.nodesOverEdges} viewBox={`${b.x} ${b.y} ${b.width} ${b.height}`}>
                    <defs>{/* TODO markers */}</ defs>
                    <g>{edgeElements}</g>
                </Edges>
                <Nodes nodesOverEdges={config.nodesOverEdges}>
                    {nodeElements}
                </Nodes>
            </GrapherViewport>
            {props.children}
        </GraphDiv>
    </IDContext.Provider></BoundsContext.Provider>
}

// Utility functions

// Convert a CSS computed value to pixel value
function resolveValue(value: string, length: number): number {
    // Resolve a percentage or pixel value to pixel value
    if (value.match(/^-?(\d+(\.\d+)?|\.\d+)?px$/)) return Number(value.slice(0, value.length - 2))
    else if (value.match(/^-?(\d+(\.\d+)?|\.\d+)?%$/)) return Number(value.slice(0, value.length - 1)) / 100 * length
    else return 0
}

// Send a change to the graph
function sendChanges(changes: GrapherChange[], nodes: Nodes<any>, edges: Edges, onChange?: (change: GrapherChange[]) => GrapherChange[] | undefined | void) {
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