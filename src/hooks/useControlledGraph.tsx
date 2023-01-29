import React from "react";
import {Node, Nodes} from "../data/Node";
import {Edge, Edges} from "../data/Edge";
import {Controller} from "../data/Controller";
import {ControlledGraphProps, ReactGrapher} from "../components/ReactGrapher";
import {useGraphState} from "./useGraphState";
import {useController} from "./useController";

export interface GraphState<T> {
    nodes: Nodes<T>
    edges: Edges
    controller: Controller

    Grapher(props: HookGraphProps<T>): React.ReactElement
}

export type HookGraphProps<T> = Omit<ControlledGraphProps<T>, "nodes" | "edges">

/**
 * Combination of `useGraphState()` and `useController()`. Also returns a Grapher component that has `nodes`, `edges` and `controller` props pre-set.
 */
export function useControlledGraph<T>(initialNodes?: Node<T>[], initialEdges?: Edge[]): GraphState<T> {
    const {nodes, edges} = useGraphState(initialNodes, initialEdges)
    const controller = useController()

    return {
        nodes,
        edges,
        controller,
        Grapher(props: HookGraphProps<T>) {
            return <ReactGrapher nodes={nodes} edges={edges} {...props}/>
        }
    }
}
