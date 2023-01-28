import React from "react";
import {Node, Nodes} from "../data/Node"
import {Edge, Edges} from "../data/Edge";
import styled from "@emotion/styled";
import {useControlledGraph} from "../hooks/useControlledGraph";

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
}

export interface UncontrolledGraphProps<T> extends CommonGraphProps {
    defaultNodes?: Node<T>[]
    defaultEdges?: Edge[]
}

const GraphDiv = styled.div<CommonGraphProps>`
  width: ${props => props.width ?? "100%"}
  height: ${props => props.height ?? "100%"}
`

export function ReactGrapher<T>(props: ControlledGraphProps<T> | UncontrolledGraphProps<T>) {
    let nodes: Nodes<T>
    let edges: Edges

    // Controlled graphs use provided nodes & edges objects
    if ("nodes" in props) ({nodes, edges} = props)
    // Uncontrolled Graphs manage their own state
    else ({nodes, edges} = useControlledGraph(props.defaultNodes, props.defaultEdges))

    // Create DefaultNode elements from Nodes elements
    const nodeElements = nodes.map(node => {
        return
    })

    return <GraphDiv {...props}>
        {props.children}
    </GraphDiv>
}