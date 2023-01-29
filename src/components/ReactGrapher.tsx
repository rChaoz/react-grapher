import React, {useEffect, useRef} from "react";
import {Node, Nodes} from "../data/Node"
import {Edge, Edges} from "../data/Edge";
import styled from "@emotion/styled";
import {useGraphState} from "../hooks/useGraphState";
import {DefaultNode} from "./DefaultNode";
import {GrapherViewport} from "./GrapherViewport";
import {Controller, useController} from "../data/Controller";

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

    // On effect, create edges and update node dimensions
    useEffect(() => {
        if (ref.current == null) return
        // TODO Edges
        // Set node dimensions
        for (const node of nodes) {
            const nodeElem = ref.current.querySelector<HTMLElement>(`#node-${node.id}`)
            if (nodeElem == null) continue
            node.width = nodeElem.offsetWidth
            node.height = nodeElem.offsetHeight
            console.log(getComputedStyle(nodeElem).borderRadius)
        }
    })

    return <GraphDiv ref={ref} width={props.width} height={props.height} className={"react-grapher"}>
        <GrapherViewport controller={controller}>
            {nodeElements}
        </GrapherViewport>
        {props.children}
    </GraphDiv>
}