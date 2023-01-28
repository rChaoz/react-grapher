import React, {useState} from "react";
import {Node, Nodes} from "../../model/Node";
import {Edge, Edges} from "../../model/Edge";
import {Controller, useController} from "../../model/Controller";
import attachNodeFunctions from "./attachNodeFunctions";
import attachEdgeFunctions from "./attachEdgeFunctions";
import {Graph, ControlledGraphProps} from "../../components/ControlledGraph";

export interface GraphState<T> {
    nodes: Nodes<T>
    edges: Edges
    controller: Controller
    Graph(props: HookGraphProps<T>): React.ReactElement
}

export interface HookGraphProps<T> extends Omit<ControlledGraphProps<T>, "nodes" | "edges"> {}

export function useControlledGraph<T>(initialNodes?: Node<T>[], initialEdges?: Edge[]): GraphState<T> {
    const [nodes, setNodes] = useState(initialNodes ?? [])
    const [edges, setEdges] = useState(initialEdges ?? [])
    attachNodeFunctions(nodes, setNodes)
    attachEdgeFunctions(edges, setEdges)
    const controller = useController()

    const n = nodes as Nodes<T>
    const e = edges as Edges

    return {
        nodes: n,
        edges: e,
        controller,
        Graph(props: HookGraphProps<T>) {
            return <Graph nodes={n} edges={e} {...props}/>
        }
    }
}
