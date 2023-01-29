import React, {useEffect, useRef} from "react";
import {Node, Nodes} from "../data/Node"
import {Edge, Edges} from "../data/Edge";
import styled from "@emotion/styled";
import {useController} from "../hooks/useController";
import {useGraphState} from "../hooks/useGraphState";
import {DefaultNode} from "./DefaultNode";
import {GrapherViewport} from "./GrapherViewport";
import {Controller} from "../data/Controller";
import {NODE_ID_PREFIX, REACT_GRAPHER_CLASS} from "../util/Constants";
import {ReactGrapherConfig} from "../data/ReactGrapherConfig";

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
     * undefined - manual. You can fit view using the Controller returned by useController()/useControlledGraph()
     */
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
        } classes={node.classes} />
    })

    const ref = useRef<HTMLDivElement>(null)

    // Listener functions
    function onNodePointerDown(event: PointerEvent) {
        console.log("PointerDown")
    }

    function onNodePointerMove(event: PointerEvent) {
        console.log("PointerMove")

    }

    function onNodePointerUp(event: PointerEvent) {
        console.log("PointerUp")

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
            node.element.removeEventListener("pointerdown", onNodePointerDown)
        }

        // Cleanup
        return () => {
            // Remove listeners
            for (const node of nodes) {
                if (node.element == null) continue
                node.element.removeEventListener("pointerdown", onNodePointerDown)
            }
        }
    })

    return <GraphDiv ref={ref} width={props.width} height={props.height} className={REACT_GRAPHER_CLASS}>
        <GrapherViewport controller={controller}>
            {nodeElements}
        </GrapherViewport>
        {props.children}
    </GraphDiv>
}