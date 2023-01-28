import React, {useState} from "react";
import {Node, Nodes} from "../../data/Node";
import {Edge, Edges} from "../../data/Edge";
import {Controller, useController} from "../../data/Controller";
import attachNodeFunctions from "./attachNodeFunctions";
import attachEdgeFunctions from "./attachEdgeFunctions";
import {ReactGrapher, ControlledGraphProps} from "../../components/ReactGrapher";

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
            return <ReactGrapher nodes={n} edges={e} {...props}/>
        }
    }
}
