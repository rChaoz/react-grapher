import React, {useEffect, useRef} from "react";
import {Node, Nodes, Position} from "../data/Node"
import {Edge, Edges} from "../data/Edge";
import styled from "@emotion/styled";
import {useController} from "../hooks/useController";
import {useGraphState} from "../hooks/useGraphState";
import {DefaultNode} from "./DefaultNode";
import {GrapherViewport} from "./GrapherViewport";
import {Controller} from "../data/Controller";
import {NODE_ID_PREFIX, REACT_GRAPHER_CLASS, VIEWPORT_CLASS} from "../util/Constants";
import {ReactGrapherConfig, useDefaults} from "../data/ReactGrapherConfig";
import {GrapherChange} from "../data/GrapherChange";
import {GrapherEvent, NodePointerEvent, UpEvent, ViewportPointerEvent, ViewportWheelEvent} from "../data/GrapherEvent";
import {domNodeID, noViewport, unknownNode} from "../util/errors";

export interface CommonGraphProps {
    /**
     * The width of the root div element. Defaults to '100%'.
     */
    width?: string
    /**
     * The height of the root div element. Defaults to '100%'.
     */
    height?: string
    /**
     * Elements that will be placed inside the Graph div.
     */
    children?: React.ReactNode
    /**
     * Fine configuration for the Graph
     */
    config?: ReactGrapherConfig
    /**
     * Quick option to completely disable all controls. Check `ReactGrapherConfig` for finer tuning.
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
     * Listen to events such as nodes being clicked, selected
     */
    onEvent?: (event: GrapherEvent) => GrapherChange[] | undefined // TODO
    /**
     * Called whenever the graph would suffer changes, such as nodes being moved or deleted. You can modify the changes before they are committed
     * or cancel them entirely.
     */
    onChange?: (changes: GrapherChange[]) => GrapherChange[] | undefined
}

export interface ControlledGraphProps<T> extends CommonGraphProps {
    nodes: Nodes<T>
    edges: Edges
    controller: Controller
}

export interface UncontrolledGraphProps<T> extends CommonGraphProps {
    defaultNodes?: Node<T>[]
    defaultEdges?: Edge[]
}

const GraphDiv = styled.div<Pick<CommonGraphProps, "width" | "height">>`
  width: ${props => props.width ?? "100%"};
  height: ${props => props.height ?? "100%"};
`

export function ReactGrapher<T>(props: ControlledGraphProps<T> | UncontrolledGraphProps<T>) {
    const config = useDefaults(props.config)
    let nodes: Nodes<T>
    let edges: Edges
    let controller: Controller

    // Ensure rules of hooks are always met - we never know when this component is uncontrolled one render and controlled the next render
    const {nodes: ownNodes, edges: ownEdges} = useGraphState((props as UncontrolledGraphProps<T>).defaultNodes, (props as any).defaultEdges)
    const ownController = useController()

    // Controlled graphs use provided nodes & edges objects
    if ("nodes" in props) ({nodes, edges, controller} = props)
    // Uncontrolled Graphs manage their own state
    else [nodes, edges, controller] = [ownNodes, ownEdges, ownController]

    // Create DefaultNode elements from Nodes elements
    const nodeElements = nodes.map(node => {
        const Component = node.Component ?? DefaultNode
        return <Component key={node.id} id={node.id} data={node.data} position={node.position} parentPosition={
            node.parent == null ? undefined : nodes.get(node.parent)?.position
        } classes={node.classes} selected={node.selected}/>
    })

    // Ref to the ReactGrapher root div
    const ref = useRef<HTMLDivElement>(null)

    // Ref for current node being clicked
    interface ClickedNode extends React.MutableRefObject<string | null> {
        hasMoved: boolean
    }

    const grabbed = useRef<string | null>(null) as ClickedNode
    grabbed.hasMoved = false

    // Send a change to the graph
    function sendChanges(changes: GrapherChange[]) {
        let c: GrapherChange[] | undefined = changes
        if (props.onChange != null) c = props.onChange(changes)
        if (c != null) {
            nodes.processChanges(c)
            edges.processChanges(c)
        }
    }

    // Zoom the viewport
    function changeZoom(amount: number) {
        const viewport = controller.getViewport()
        const zoom = viewport.zoom * (1 + amount)
        // TODO Take min, max zoom into account
        controller.setViewport({
            centerX: viewport.centerX,
            centerY: viewport.centerY,
            zoom,
        })
    }

    // Listener functions

    // Node level
    function onNodePointerDown(event: PointerEvent) {
        const nodeID = (event.currentTarget as HTMLElement | null)?.id?.substring(NODE_ID_PREFIX.length)
        const node = nodeID != null ? nodes.get(nodeID) : null
        if (node == null) {
            domNodeID(event.currentTarget, nodeID)
            return
        }
        let prevent = false
        if (props.onEvent != null) {
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
            props.onEvent(grapherEvent)
        }
        // "Grab" the node
        if (!prevent && grabbed.current == null) grabbed.current = nodeID!
    }

    function onNodePointerUp(event: PointerEvent) {
        const nodeID = (event.currentTarget as HTMLElement | null)?.id?.substring(NODE_ID_PREFIX.length)
        const node = nodeID ? nodes.get(nodeID) : null
        if (node == null) {
            domNodeID(event.currentTarget, nodeID)
            return
        }
        if (props.onEvent != null) {
            const grapherEvent: NodePointerEvent = {
                type: "node",
                action: "up",
                grabbed: grabbed.current === nodeID,
                preventDefault() {
                    //empty
                },
                target: node,
                pointerEvent: event,
            }
            props.onEvent(grapherEvent)
        }
    }

    // Viewport level
    function onViewportPointerDown(event: PointerEvent) {
        let prevent = false
        if (props.onEvent != null) {
            const grapherEvent: ViewportPointerEvent = {
                type: "viewport",
                action: "down",
                grabbed: false,
                preventDefault() {
                    prevent = true
                },
                pointerEvent: event,
            }
            props.onEvent(grapherEvent)
        }
        if (!prevent && grabbed.current == null) grabbed.current = ""
    }

    function onViewportPointerUp(event: PointerEvent) {
        if (props.onEvent != null) {
            const grapherEvent: ViewportPointerEvent = {
                type: "viewport",
                action: "up",
                grabbed: grabbed.current === "",
                preventDefault() {
                    //empty
                },
                pointerEvent: event,
            }
            props.onEvent(grapherEvent)
        }
    }

    function onViewportWheel(event: WheelEvent) {
        let prevent = false
        if (props.onEvent != null) {
            const grapherEvent: ViewportWheelEvent = {
                type: "viewport",
                action: "wheel",
                grabbed: grabbed.current === "",
                preventDefault() {
                    prevent = true
                },
                wheelEvent: event,
            }
            props.onEvent(grapherEvent)
        }
        if (!prevent) changeZoom(-event.deltaY / 1000)
    }

    // Document level
    function onPointerMove(event: PointerEvent) {
        if (grabbed.current === "") {
            // User is moving the viewport (panning the graph)
            // Send event
            let prevent = false
            if (props.onEvent != null) {
                const grapherEvent: ViewportPointerEvent = {
                    type: "viewport",
                    action: "move",
                    grabbed: true,
                    preventDefault() {
                        prevent = true
                    },
                    pointerEvent: event,
                }
                props.onEvent(grapherEvent)
            }
            if (prevent) return
            // Calculate how the viewport should be moved
            const deltaX = event.movementX / controller.getViewport().zoom
            const deltaY = event.movementY / controller.getViewport().zoom
            const viewport = controller.getViewport()
            controller.setViewport({
                zoom: viewport.zoom,
                centerX: viewport.centerX - deltaX,
                centerY: viewport.centerY - deltaY,
            })
        } else if (grabbed.current != null) {
            // User is currently moving a node
            const node = nodes.get(grabbed.current)
            if (node == null) {
                unknownNode(grabbed.current)
                return
            }
            // Send event
            let prevent = false
            if (props.onEvent != null) {
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
                props.onEvent(grapherEvent)
            }
            if (prevent) return
            // Calculate where the node should arrive
            const newPosition: Position = {
                isAbsolute: node.position.isAbsolute,
                x: node.position.x + event.movementX / controller.getViewport().zoom,
                y: node.position.y + event.movementY / controller.getViewport().zoom,
            }
            // Send the change
            sendChanges([
                {
                    type: "node-move",
                    event: "move-pointer",
                    oldPosition: node.position,
                    position: newPosition,
                    selected: node.selected,
                    node: node,
                } // TODO Allow multiple nodes to be selected
            ])
        }
    }

    function onPointerUp(event: PointerEvent) {
        let prevent = false;
        if (props.onEvent != null) {
            const grapherEvent: UpEvent = {
                type: "up",
                grabbed: grabbed.current,
                preventDefault() {
                    prevent = true
                },
                pointerEvent: event,
            }
            props.onEvent(grapherEvent)
        }
        if (!prevent) grabbed.current = null
    }

    // On effect, create edges, update node dimensions and setup listeners
    useEffect(() => {
        if (ref.current == null) return
        // TODO Edges
        // For every node
        for (const node of nodes) {
            const nodeElem = ref.current.querySelector<HTMLElement>(`#${NODE_ID_PREFIX}${node.id}`)
            if (nodeElem == null) continue
            node.element = nodeElem

            function resolveValue(value: string, length: number): number {
                // Resolve a percentage or pixel value to pixel value
                if (value.match(/^-?(\d+(\.\d+)?|\.\d+)?px$/)) return Number(value.slice(0, value.length - 2))
                else if (value.match(/^-?(\d+(\.\d+)?|\.\d+)?%$/)) return Number(value.slice(0, value.length - 1)) / 100 * length
                else return 0
            }

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

            // Set listeners
            node.element.addEventListener("pointerdown", onNodePointerDown)
            node.element.addEventListener("pointerup", onNodePointerUp)
        }

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
        }
    })

    return <GraphDiv ref={ref} width={props.width} height={props.height} className={REACT_GRAPHER_CLASS}>
        <GrapherViewport controller={controller}>
            {nodeElements}
        </GrapherViewport>
        {props.children}
    </GraphDiv>
}