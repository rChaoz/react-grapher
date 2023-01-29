import React from "react";
import {Node, Nodes} from "../data/Node";
import {Edge, Edges} from "../data/Edge";
import {Controller, useController} from "../data/Controller";
import {ControlledGraphProps, ReactGrapher} from "../components/ReactGrapher";
import {useGraphState} from "./useGraphState";

export interface GraphState<T> {
    nodes: Nodes<T>
    edges: Edges
    controller: Controller

    Graph(props: HookGraphProps<T>): React.ReactElement
}

export type HookGraphProps<T> = Omit<ControlledGraphProps<T>, "nodes" | "edges">

export function useControlledGraph<T>(initialNodes?: Node<T>[], initialEdges?: Edge[]): GraphState<T> {
    const {nodes, edges} = useGraphState(initialNodes, initialEdges)
    const controller = useController()

    return {
        nodes,
        edges,
        controller,
        Graph(props: HookGraphProps<T>) {
            return <ReactGrapher nodes={nodes} edges={edges} {...props}/>
        }
    }
}
