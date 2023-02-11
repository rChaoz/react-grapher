import React from "react";
import {NodeData, Nodes} from "../data/Node";
import {EdgeData, Edges} from "../data/Edge";
import {Controller} from "../data/Controller";
import {ControlledGraphProps, ReactGrapher} from "../components/ReactGrapher";
import {useGraphState} from "./useGraphState";
import {useController} from "./useController";

export interface GraphState<N, E> {
    nodes: Nodes<N>
    edges: Edges<E>
    controller: Controller

    Grapher(props: HookGraphProps<N, E>): React.ReactElement
}

export type HookGraphProps<N, E> = Omit<ControlledGraphProps<N, E>, "nodes" | "edges">

/**
 * Combination of `useGraphState()` and `useController()`. Also returns a Grapher component that has `nodes`, `edges` and `controller` props pre-set.
 */
export function useControlledGraph<N, E>(initialNodes?: NodeData<N>[], initialEdges?: EdgeData<E>[]): GraphState<N, E> {
    const {nodes, edges} = useGraphState(initialNodes, initialEdges)
    const controller = useController()

    return {
        nodes,
        edges,
        controller,
        Grapher(props: HookGraphProps<N, E>) {
            return <ReactGrapher nodes={nodes} edges={edges} {...props}/>
        }
    }
}
